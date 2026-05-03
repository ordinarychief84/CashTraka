import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { prisma } from '@/lib/prisma';
import { feedbackService } from '@/lib/services/feedback.service';
import { feedbackCreateSchema } from '@/lib/feedback-validators';

export const runtime = 'nodejs';

/**
 * POST /api/feedback/create
 *
 * Mints a feedback link on demand. Used by the "Send Service Check" button
 * when no existing feedback link is attached to the source document. The
 * response includes the publicToken and a fully-qualified public URL the
 * caller can drop into a wa.me link or copy to clipboard.
 *
 * Gated on the serviceCheck feature flag.
 */
export async function POST(req: Request) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await requireFeature(user, 'serviceCheck');
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const parsed = feedbackCreateSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    // Owner check: every referenced row must belong to the current user.
    const { source, receiptId, paymentId, invoiceId, customerId } = parsed.data;
    if (receiptId) {
      const exists = await prisma.receipt.findFirst({
        where: { id: receiptId, userId: user.id },
        select: { id: true },
      });
      if (!exists) return fail('Receipt not found', 404);
    }
    if (paymentId) {
      const exists = await prisma.payment.findFirst({
        where: { id: paymentId, userId: user.id },
        select: { id: true },
      });
      if (!exists) return fail('Payment not found', 404);
    }
    if (invoiceId) {
      const exists = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId: user.id },
        select: { id: true },
      });
      if (!exists) return fail('Invoice not found', 404);
    }
    if (customerId) {
      const exists = await prisma.customer.findFirst({
        where: { id: customerId, userId: user.id },
        select: { id: true },
      });
      if (!exists) return fail('Customer not found', 404);
    }

    const fb = await feedbackService.createFeedbackLink({
      userId: user.id,
      source,
      receiptId: receiptId ?? null,
      paymentId: paymentId ?? null,
      invoiceId: invoiceId ?? null,
      customerId: customerId ?? null,
    });

    const origin = new URL(req.url).origin;
    const publicUrl = `${origin}/feedback/${fb.publicToken}`;

    return ok({ id: fb.id, publicToken: fb.publicToken, publicUrl });
  });
}
