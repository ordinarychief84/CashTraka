import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { paystackService } from '@/lib/services/paystack.service';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const bodySchema = z.object({
  /// Public token from /invoice/[token] page. We accept this in lieu of a
  /// session — customers paying invoices are not logged in.
  token: z.string().min(16),
  /// Optional override; for partial-pay flows. Defaults to the outstanding
  /// balance. Always validated against outstanding to prevent overpay.
  amount: z.coerce.number().int().positive().optional(),
  /// Where Paystack should bounce the user back to after payment. Defaults
  /// to the public invoice page itself.
  callbackUrl: z.string().url().optional(),
});

/**
 * POST /api/invoices/[id]/pay
 *
 * Public endpoint (no auth) — customers paying their invoice. We require
 * the publicToken to match the invoice id so a leaked invoice id alone is
 * not enough to start a payment.
 *
 * Returns the Paystack hosted checkout URL. The webhook handler at
 * /api/webhooks/paystack reconciles on charge.success and bumps
 * Invoice.amountPaid + status via paymentConfirmationService.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      invoiceNumber: true,
      total: true,
      amountPaid: true,
      status: true,
      currency: true,
      customerEmail: true,
      customerPhone: true,
      publicToken: true,
    },
  });
  if (!invoice || invoice.publicToken !== parsed.data.token) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (invoice.status === 'CANCELLED' || invoice.status === 'CREDITED') {
    return NextResponse.json(
      { error: 'This invoice is no longer payable.' },
      { status: 409 },
    );
  }

  const outstanding = Math.max(0, invoice.total - invoice.amountPaid);
  if (outstanding <= 0) {
    return NextResponse.json(
      { error: 'This invoice is already fully paid.' },
      { status: 409 },
    );
  }

  // Cap requested amount at outstanding. Paystack rejects 0 anyway, and
  // we never want a customer to overpay an invoice through this flow.
  const amountNaira = Math.min(parsed.data.amount ?? outstanding, outstanding);
  const amountKobo = amountNaira * 100;

  // Paystack requires an email. Fall back to a placeholder when the buyer
  // has none on the invoice — the seller still receives the funds, the
  // email is only used by Paystack for receipts.
  const email =
    invoice.customerEmail?.trim() ||
    `${invoice.customerPhone}@noemail.cashtraka.app`;

  // Reference: prefix with invoice id so the webhook can route it via
  // paymentConfirmationService -> Invoice.amountPaid update path.
  const reference = `INV-${invoice.id.slice(-12)}-${Date.now().toString(36)}`;

  const baseUrl =
    process.env.APP_URL ||
    `https://${req.headers.get('host') ?? 'www.cashtraka.co'}`;
  const callbackUrl =
    parsed.data.callbackUrl ?? `${baseUrl}/invoice/${invoice.publicToken}`;

  const result = await paystackService.initTransaction({
    email,
    amountKobo,
    reference,
    callbackUrl,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: 'invoice_payment',
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Could not start payment' },
      { status: 502 },
    );
  }

  // Audit (non-fatal).
  documentAudit.log({
    userId: invoice.userId,
    entityType: 'INVOICE',
    entityId: invoice.id,
    action: 'PUBLIC_PAYMENT_INIT',
    metadata: { reference, amountNaira },
  });

  return NextResponse.json({
    success: true,
    data: {
      authorizationUrl: result.data.authorization_url,
      reference,
      amount: amountNaira,
    },
  });
}
