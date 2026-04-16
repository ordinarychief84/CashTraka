import { prisma } from './prisma';
import { normalizeNigerianPhone } from './whatsapp';
import { Err } from './errors';
import { limitsFor, effectivePlan } from './plan-limits';

/**
 * Upsert a customer by (userId, normalized phone). Returns the customer.
 *
 * Enforces the owner's customer-count cap on CREATE. Existing customers are
 * never blocked — the cap is about "how many unique customers have you
 * accumulated", so an update is always free.
 *
 * We fetch the owner's plan inside this helper (instead of asking callers to
 * pass it) because customers are upserted from many places — payments, debts,
 * invoices — and threading `user` through every one would be noisy.
 */
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

  // About to create a brand-new customer — cap check applies.
  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  });
  if (owner) {
    const eff = effectivePlan({
      plan: owner.plan,
      subscriptionStatus: owner.subscriptionStatus,
      trialEndsAt: owner.trialEndsAt,
      currentPeriodEnd: owner.currentPeriodEnd,
    });
    const limits = limitsFor(eff.plan);
    if (limits.customers !== null) {
      const currentCount = await prisma.customer.count({ where: { userId } });
      if (currentCount >= limits.customers) {
        throw Err.paymentRequired(
          `Your plan is capped at ${limits.customers} customers. Upgrade to add more.`,
        );
      }
    }
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
