import { NextResponse } from 'next/server';
import { webhookService } from '@/lib/services/webhook.service';
import { ensureProvidersRegistered } from '@/lib/services/provider-registry';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/flutterwave
 *
 * Receives Flutterwave payment webhooks for customer-facing transactions.
 */
export async function POST(req: Request) {
  ensureProvidersRegistered();
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key] = value; });

  const result = await webhookService.processWebhook('FLUTTERWAVE', rawBody, headers);

  if (result.status === 'rejected') {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true, data: result });
}
