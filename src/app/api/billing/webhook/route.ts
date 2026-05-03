import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { paystackService } from '@/lib/services/paystack.service';
import { billingService } from '@/lib/services/billing.service';

export const runtime = 'nodejs';

/**
 * POST /api/billing/webhook
 *
 * Paystack signs every webhook with HMAC-SHA512 using the secret from the
 * dashboard (PAYSTACK_WEBHOOK_SECRET). We verify the signature on the RAW
 * body before touching the payload, then record the event id so replays are
 * no-ops.
 *
 * Hot path mirrors /api/webhooks/paystack: signature verify + BillingEvent
 * insert before the 200, then dispatch the actual upgrade / past-due /
 * cancel mutations in the background via `waitUntil` so Paystack gets its
 * 200 well under the retry threshold even on Vercel cold start.
 *
 * Handled event types:
 *   - charge.success            → complete a pending upgrade
 *   - invoice.payment_failed    → flip to past_due
 *   - subscription.disable      → flip to cancelled (Paystack subscription only)
 */
export async function POST(req: Request) {
  // Read raw text — Paystack signs pre-parse. `req.text()` is cheap.
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? '';

  if (!paystackService.verifyWebhookSignature(raw, signature)) {
    return NextResponse.json(
      { success: false, error: 'invalid_signature' },
      { status: 401 },
    );
  }

  type Payload = {
    event: string;
    data?: {
      reference?: string;
      customer?: { email?: string; customer_code?: string };
      metadata?: { userId?: string };
    };
    id?: string | number; // Paystack includes a top-level event id in some payloads
  };

  let payload: Payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  // Idempotency: use Paystack's event id if present, otherwise a SHA-256 hash
  // of the raw payload body. Either way, unique index dedupes replays.
  const eventId =
    payload.id != null
      ? `ps_${payload.id}`
      : `hash_${createHash('sha256').update(raw).digest('hex').slice(0, 32)}`;

  try {
    await prisma.billingEvent.create({
      data: {
        paystackEventId: String(eventId),
        eventType: payload.event,
        payloadJson: raw,
      },
    });
  } catch (e: any) {
    // P2002 = unique constraint — we've already processed this event.
    if (e?.code === 'P2002') {
      return NextResponse.json({ success: true, data: { duplicate: true } });
    }
    // Genuine DB failure — return 500 so Paystack retries instead of
    // marking the event as delivered. Without this, billing events are
    // silently lost during outages.
    console.error('WEBHOOK_ERROR:', e?.message ?? e);
    return NextResponse.json(
      { success: false, error: 'internal_error' },
      { status: 500 },
    );
  }

  // Acknowledge Paystack now. The actual subscription mutations
  // (`completeUpgrade`, `markPastDue`, `cancel`) run in the background.
  // BillingEvent is already persisted, so a nightly reconciliation cron
  // can pick up any rows whose dispatch failed.
  waitUntil(
    dispatchBillingEvent(payload).catch((e: any) => {
      console.error(
        '[billing.webhook] background dispatch failed',
        eventId,
        e?.message ?? e,
      );
    }),
  );

  return NextResponse.json({ success: true, data: { received: true } });
}

/**
 * Background side-effects for a verified, deduped billing event.
 * Pulled out of the request handler so the response can flush
 * immediately. Errors here do not propagate to Paystack — the event
 * is already in BillingEvent for replay.
 */
async function dispatchBillingEvent(payload: {
  event: string;
  data?: {
    reference?: string;
    customer?: { email?: string; customer_code?: string };
    metadata?: { userId?: string };
  };
}): Promise<void> {
  switch (payload.event) {
    case 'charge.success': {
      const ref = payload.data?.reference;
      if (ref) await billingService.completeUpgrade(ref);
      break;
    }
    case 'invoice.payment_failed': {
      const userId = payload.data?.metadata?.userId;
      if (userId) await billingService.markPastDue(userId);
      break;
    }
    case 'subscription.disable': {
      const userId = payload.data?.metadata?.userId;
      if (userId) {
        await billingService.cancel(userId).catch((e) => {
          console.error(
            `[billing.webhook] subscription.disable cancel failed for user ${userId}`,
            e,
          );
          return null;
        });
      }
      break;
    }
    default:
      // Ignored event — already recorded above, audit trail preserved.
      break;
  }
}
