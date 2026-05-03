import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { webhookService } from '@/lib/services/webhook.service';
import { ensureProvidersRegistered } from '@/lib/services/provider-registry';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/flutterwave
 *
 * Receives Flutterwave payment webhooks for customer-facing transactions.
 * Same hot-path contract as the Paystack route: signature verify + log
 * insert only, then ack 200, then run the heavy reconcile in the
 * background via `waitUntil`.
 */
export async function POST(req: Request) {
  ensureProvidersRegistered();
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  const stage1 = await webhookService.verifyAndLog('FLUTTERWAVE', rawBody, headers);

  if (!stage1.ok) {
    return NextResponse.json(
      { success: false, error: stage1.error },
      { status: stage1.code },
    );
  }

  if (stage1.status !== 'received') {
    return NextResponse.json({ success: true, data: { status: stage1.status } });
  }

  waitUntil(
    webhookService.reconcile(stage1.eventId).catch((err) => {
      console.error(
        '[flutterwave.webhook] background reconcile failed',
        stage1.eventId,
        err,
      );
    }),
  );

  return NextResponse.json({ success: true, data: { status: 'received' } });
}
