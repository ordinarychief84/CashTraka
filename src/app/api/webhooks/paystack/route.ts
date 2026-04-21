import { NextResponse } from 'next/server';
import { webhookService } from '@/lib/services/webhook.service';
import { ensureProvidersRegistered } from '@/lib/services/provider-registry';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/paystack
 *
 * Receives Paystack payment webhooks for customer-facing transactions
 * (Promise to Pay, PayLinks). Separate from /api/billing/webhook which
 * handles subscription billing.
 */
export async function POST(req: Request) {
  ensureProvidersRegistered();
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  const result = await webhookService.processWebhook('PAYSTACK', rawBody, headers);

  if (result.status === 'rejected') {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 401 },
    );
  }

  // Always return 200 for valid signatures so Paystack doesn't retry
  return NextResponse.json({ success: true, data: result });
}
