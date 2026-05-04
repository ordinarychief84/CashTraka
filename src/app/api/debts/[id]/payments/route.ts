import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recomputeCustomerTotals } from '@/lib/customers';
import { nairaToKobo } from '@/lib/money';

const schema = z.object({
  amount: z.coerce.number().int().positive('Amount must be greater than 0'),
});

/**
 * Record a partial (or full) payment against an OPEN debt.
 *
 * Side effects:
 *  1. Creates a Payment row (status=PAID) so the money counts toward "Total received".
 *  2. Increments Debt.amountPaid.
 *  3. If the debt is fully settled, flips Debt.status to PAID.
 *  4. Recomputes the customer's totals.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const debt = await prisma.debt.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!debt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (debt.status === 'PAID') {
    return NextResponse.json({ error: 'This debt is already paid' }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const remaining = debt.amountOwed - debt.amountPaid;
  if (remaining <= 0) {
    return NextResponse.json({ error: 'Nothing left to pay' }, { status: 409 });
  }

  // Cap the amount at the remaining balance to avoid over-payment.
  const amount = Math.min(parsed.data.amount, remaining);
  const newAmountPaid = debt.amountPaid + amount;
  const nextStatus = newAmountPaid >= debt.amountOwed ? 'PAID' : 'OPEN';

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId: user.id,
        customerId: debt.customerId,
        customerNameSnapshot: debt.customerNameSnapshot,
        phoneSnapshot: debt.phoneSnapshot,
        amount,
        amountKobo: nairaToKobo(amount),
        status: 'PAID',
      },
    }),
    prisma.debt.update({
      where: { id: debt.id },
      data: {
        amountPaid: newAmountPaid,
        amountPaidKobo: nairaToKobo(newAmountPaid),
        status: nextStatus,
      },
    }),
  ]);

  await recomputeCustomerTotals(debt.customerId);

  return NextResponse.json({ ok: true, amount, remaining: debt.amountOwed - newAmountPaid });
}
