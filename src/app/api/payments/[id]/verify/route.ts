import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { verifyAlertSchema } from '@/lib/validators';
import {
  parseBankAlert,
  alertContainsCode,
  namesMatch,
} from '@/lib/bank-alerts';
import { receiptService } from '@/lib/services/receipt.service';

/** Tolerance in Naira, fees are typically N10-N50 on small instant transfers. */
const AMOUNT_TOLERANCE = 50;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.payment.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = verifyAlertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  // Manual verification — the seller asserts on their honor that they received the money.
  // Use sparingly; we keep the badge distinct ("Manually confirmed") so nothing pretends to
  // be bank-verified when it isn't.
  if (parsed.data.method === 'MANUAL') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        verified: true,
        verifiedAt: new Date(),
        verificationMethod: 'MANUAL',
        status: payment.status === 'PENDING' ? 'PAID' : payment.status,
      },
    });
    // Auto-create a persistent Receipt row (idempotent). Receipts are tax
    // records — a failure here means the seller's books are missing one,
    // so we surface it loudly even though the payment itself is already
    // verified.
    let receipt: { id: string; receiptNumber: string } | null = null;
    try {
      receipt = await receiptService.ensureForPayment(user.id, payment.id, { source: 'MANUAL' });
    } catch (err) {
      console.error(`[payments.verify MANUAL] receipt generation failed for payment ${payment.id} user ${user.id}`, err);
      await prisma.notification
        .create({
          data: {
            userId: user.id,
            type: 'warning',
            title: 'Receipt was not generated',
            message: `Payment ${payment.id.slice(-8).toUpperCase()} is verified but its receipt could not be generated. Open the payment to retry.`,
            link: `/payments/${payment.id}`,
          },
        })
        .catch(() => null);
    }
    return NextResponse.json({
      ok: true,
      method: 'MANUAL',
      receiptId: receipt?.id ?? null,
      receiptNumber: receipt?.receiptNumber ?? null,
      receiptUrl: `/r/${payment.id}`,
      autoReceipt: true,
    });
  }

  // Bank-alert verification — parse the pasted text and decide if it matches.
  const text = (parsed.data.text || '').trim();
  if (!text) {
    return NextResponse.json(
      { error: 'Paste your bank alert text to auto-verify' },
      { status: 400 },
    );
  }
  const alert = parseBankAlert(text);
  if (!alert) {
    return NextResponse.json(
      {
        error:
          'We could not read this as a credit alert. Make sure you pasted the full SMS/email from your bank (not a screenshot from the customer).',
      },
      { status: 422 },
    );
  }

  // Decide if it matches this payment.
  const amountClose = Math.abs(alert.amount - payment.amount) <= AMOUNT_TOLERANCE;
  const refMatches = payment.referenceCode
    ? alertContainsCode(alert, payment.referenceCode)
    : false;
  const senderMatches =
    alert.sender && namesMatch(alert.sender, payment.customerNameSnapshot);

  // We need amount + at least one of (ref match, sender name match) to auto-verify.
  const method = refMatches
    ? 'REFERENCE_MATCH'
    : senderMatches
    ? 'SENDER_MATCH'
    : null;

  if (!amountClose || !method) {
    return NextResponse.json(
      {
        ok: false,
        parsed: alert,
        reason: !amountClose
          ? `Alert amount (₦${alert.amount.toLocaleString()}) doesn't match this payment (₦${payment.amount.toLocaleString()}).`
          : `The alert does not mention this payment's reference code, and the sender name does not match the customer. Double-check before confirming.`,
      },
      { status: 200 },
    );
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      verified: true,
      verifiedAt: new Date(),
      verificationMethod: method,
      bankAlertText: text,
      bankAlertSenderName: alert.sender ?? null,
      bankAlertBank: alert.bank ?? null,
      status: payment.status === 'PENDING' ? 'PAID' : payment.status,
      receiptSentAt: new Date(), // flag receipt as ready
    },
  });

  // Auto-generate a persistent Receipt row (idempotent; if one already
  // exists for this payment, the existing record is returned). Receipts
  // are tax records — surface failures so the seller can retry.
  let receipt: { id: string; receiptNumber: string } | null = null;
  try {
    receipt = await receiptService.ensureForPayment(user.id, payment.id, { source: 'MANUAL' });
  } catch (err) {
    console.error(`[payments.verify ALERT] receipt generation failed for payment ${payment.id} user ${user.id}`, err);
    await prisma.notification
      .create({
        data: {
          userId: user.id,
          type: 'warning',
          title: 'Receipt was not generated',
          message: `Payment ${payment.id.slice(-8).toUpperCase()} is verified but its receipt could not be generated. Open the payment to retry.`,
          link: `/payments/${payment.id}`,
        },
      })
      .catch(() => null);
  }

  // Return the receipt URL so the client can offer one-tap WhatsApp send.
  return NextResponse.json({
    ok: true,
    method,
    parsed: alert,
    receiptUrl: `/r/${payment.id}`,
    autoReceipt: true,
    receiptId: receipt?.id ?? null,
    receiptNumber: receipt?.receiptNumber ?? null,
  });
}
