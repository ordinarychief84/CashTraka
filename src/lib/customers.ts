import { prisma } from './prisma';
import { normalizeNigerianPhone } from './whatsapp';

/** Upsert a customer by (userId, normalized phone). Returns the customer. */
export async function upsertCustomer(
  userId: string,
  name: string,
  phone: string,
) {
  const normalizedPhone = normalizeNigerianPhone(phone);
  const existing = await prisma.customer.findUnique({
    where: { userId_phone: { userId, phone: normalizedPhone } },
  });

  if (existing) {
    // Update display name only if blank, otherwise keep the earlier name to avoid accidental overwrite.
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: existing.name || name,
        lastActivityAt: new Date(),
      },
    });
  }

  return prisma.customer.create({
    data: {
      userId,
      name: name.trim(),
      phone: normalizedPhone,
      lastActivityAt: new Date(),
    },
  });
}

/** Recompute totals for a customer from payments + debts. */
export async function recomputeCustomerTotals(customerId: string) {
  const [paidAgg, owedAgg, paymentCount, debtCount, latestPayment, latestDebt] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { customerId, status: 'PAID' },
        _sum: { amount: true },
      }),
      prisma.debt.aggregate({
        where: { customerId, status: 'OPEN' },
        _sum: { amountOwed: true, amountPaid: true },
      }),
      prisma.payment.count({ where: { customerId } }),
      prisma.debt.count({ where: { customerId } }),
      prisma.payment.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.debt.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  const last =
    [latestPayment?.createdAt, latestDebt?.createdAt]
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] ||
    new Date();

  // Outstanding balance = sum(amountOwed) − sum(amountPaid) across OPEN debts.
  const totalOwed =
    (owedAgg._sum.amountOwed ?? 0) - (owedAgg._sum.amountPaid ?? 0);

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      totalPaid: paidAgg._sum.amount ?? 0,
      totalOwed: Math.max(totalOwed, 0),
      transactionCount: paymentCount + debtCount,
      lastActivityAt: last as Date,
    },
  });
}
