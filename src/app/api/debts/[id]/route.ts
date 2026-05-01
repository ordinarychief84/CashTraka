import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { recomputeCustomerTotals, upsertCustomer } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { receiptService } from '@/lib/services/receipt.service';
import { debtService } from '@/lib/services/debt.service';
import { handled, ok } from '@/lib/api-response';

/** GET /api/debts/[id] — single debt detail. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const debt = await debtService.getForUser(user.id, ctx.params.id);
    return ok(debt);
  });

const patchSchema = z.object({
  // Editing fields
  customerName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(7).optional(),
  amountOwed: z.coerce.number().int().positive().optional(),
  dueDate: z.string().optional(),
  // Status toggle (was the original behaviour)
  status: z.enum(['OPEN', 'PAID']).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debt = await prisma.debt.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { customerName, phone, amountOwed, dueDate, status } = parsed.data;

  let customerId = debt.customerId;
  let phoneSnapshot = debt.phoneSnapshot;
  let nameSnapshot = debt.customerNameSnapshot;

  if (phone || customerName) {
    const nextName = customerName ?? debt.customerNameSnapshot;
    const nextPhone = phone ?? debt.phoneSnapshot;
    const normalized = normalizeNigerianPhone(nextPhone);
    const nextCustomer = await upsertCustomer(user.id, nextName, nextPhone);
    customerId = nextCustomer.id;
    phoneSnapshot = normalized;
    nameSnapshot = nextName.trim();
  }

  // Re-opening a debt should not keep stale amountPaid > amountOwed.
  const nextAmountOwed = amountOwed ?? debt.amountOwed;
  const cappedAmountPaid = Math.min(debt.amountPaid, nextAmountOwed);

  const prevCustomerId = debt.customerId;

  // If debt is being marked PAID (and wasn't already), auto-create a payment
  // record for the remaining balance so "Total received" reflects it, and
  // return a receipt URL the UI can use to auto-send.
  const transitioningToPaid = status === 'PAID' && debt.status !== 'PAID';
  let autoReceiptPaymentId: string | null = null;

  if (transitioningToPaid) {
    const remaining = Math.max(nextAmountOwed - cappedAmountPaid, 0);
    if (remaining > 0) {
      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          customerId,
          customerNameSnapshot: nameSnapshot,
          phoneSnapshot,
          amount: remaining,
          status: 'PAID',
          verified: true,
          verifiedAt: new Date(),
          verificationMethod: 'MANUAL',
          receiptSentAt: new Date(),
        },
      });
      autoReceiptPaymentId = payment.id;
    }
  }

  await prisma.debt.update({
    where: { id: debt.id },
    data: {
      customerId,
      customerNameSnapshot: nameSnapshot,
      phoneSnapshot,
      amountOwed: nextAmountOwed,
      amountPaid: transitioningToPaid ? nextAmountOwed : cappedAmountPaid,
      dueDate: dueDate === undefined ? debt.dueDate : dueDate ? new Date(dueDate) : null,
      status: status ?? debt.status,
    },
  });

  await recomputeCustomerTotals(customerId);
  if (prevCustomerId !== customerId) {
    await recomputeCustomerTotals(prevCustomerId);
  }

  // If we auto-created a payment for the cleared debt, also persist a Receipt.
  let receiptId: string | null = null;
  let receiptNumber: string | null = null;
  if (autoReceiptPaymentId) {
    const receipt = await receiptService
      .ensureForPayment(user.id, autoReceiptPaymentId, { source: 'DEBT' })
      .catch(() => null);
    receiptId = receipt?.id ?? null;
    receiptNumber = receipt?.receiptNumber ?? null;
  }

  return NextResponse.json({
    ok: true,
    ...(autoReceiptPaymentId ? { receiptUrl: `/r/${autoReceiptPaymentId}` } : {}),
    ...(receiptId ? { receiptId, receiptNumber } : {}),
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debt = await prisma.debt.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.debt.delete({ where: { id: debt.id } });
  await recomputeCustomerTotals(debt.customerId);
  return NextResponse.json({ ok: true });
}
