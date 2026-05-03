import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { webhookService } from '@/lib/services/webhook.service';
import { ensureProvidersRegistered } from '@/lib/services/provider-registry';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/paystack
 *
 * Receives Paystack payment webhooks for customer-facing transactions
 * (Promise to Pay, PayLinks, Invoices). Separate from /api/billing/webhook
 * which handles subscription billing.
 *
 * Hot-path contract: HMAC verify + WebhookEventLog insert ONLY before the
 * 200 response. Provider-side `transaction/verify` + payment confirmation
 * + receipt PDF + email run after the response is flushed via
 * `waitUntil`. This keeps us well under Paystack's retry threshold even
 * during Vercel cold starts. See webhook.service.ts for the split.
 */
export async function POST(req: Request) {
  ensureProvidersRegistered();
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  // Phase 1 (synchronous, fast): HMAC verify + dedupe + WebhookEventLog insert.
  const stage1 = await webhookService.verifyAndLog('PAYSTACK', rawBody, headers);

  if (!stage1.ok) {
    return NextResponse.json(
      { success: false, error: stage1.error },
      { status: stage1.code },
    );
  }

  // Acknowledge to Paystack right now. Duplicates and non-actionable
  // events still get 200 — they're already logged for audit.
  if (stage1.status !== 'received') {
    return NextResponse.json({ success: true, data: { status: stage1.status } });
  }

  // Phase 2 (background): provider verify + confirm payment + side-effects.
  // The function process is kept alive by `waitUntil` until reconcile resolves.
  // Failures are logged loudly; the WebhookEventLog row stays as RECEIVED so
  // a future reconciliation cron can retry.
  waitUntil(
    webhookService.reconcile(stage1.eventId).catch((err) => {
      console.error(
        '[paystack.webhook] background reconcile failed',
        stage1.eventId,
        err,
      );
    }),
  );

  return NextResponse.json({ success: true, data: { status: 'received' } });
}
