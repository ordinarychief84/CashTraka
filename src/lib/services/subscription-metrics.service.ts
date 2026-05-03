/**
 * Cross-tenant subscription analytics for the admin Subscriptions overview.
 *
 * MRR is computed from `PLAN_PRICING.perMonthKobo` for every user whose
 * lifecycle status is `active` or `trialing` and whose plan resolves to a
 * paid Starter tier. Legacy plans (business, business_plus, etc.) are
 * mapped to `starter_quarterly` via `resolvePlanKey()` so historical rows
 * still contribute.
 */
import { prisma } from '@/lib/prisma';
import { PLAN_PRICING, resolvePlanKey } from '@/lib/billing/pricing';

export type SubscriptionStats = {
  activeSubscribers: number;
  trialing: number;
  pastDue: number;
  cancelled: number;
  mrrKobo: number;
  newThisMonth: number;
  churnThisMonth: number;
  netNewMrrKobo: number;
};

function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfPrevMonth(d: Date): Date {
  const m = startOfMonth(d);
  m.setMonth(m.getMonth() - 1);
  return m;
}

function planMrrKobo(plan: string): number {
  const key = resolvePlanKey(plan);
  if (!key) return 0;
  return PLAN_PRICING[key].perMonthKobo;
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfPrevMonth(now);

  const [
    activeSubscribers,
    trialing,
    pastDue,
    cancelled,
    activePayingUsers,
    newThisMonth,
    churnThisMonth,
    prevMonthActiveUsers,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        subscriptionStatus: { in: ['active', 'trialing'] },
        plan: { not: 'free' },
      },
    }),
    prisma.user.count({
      where: { subscriptionStatus: 'trialing', plan: { not: 'free' } },
    }),
    prisma.user.count({
      where: { subscriptionStatus: 'past_due' },
    }),
    prisma.user.count({
      where: { subscriptionStatus: 'cancelled' },
    }),
    prisma.user.findMany({
      where: {
        subscriptionStatus: { in: ['active', 'trialing'] },
        plan: { not: 'free' },
      },
      select: { plan: true },
    }),
    prisma.user.count({
      where: {
        subscriptionStatus: { in: ['active', 'trialing'] },
        plan: { not: 'free' },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.user.count({
      where: {
        OR: [
          { subscriptionStatus: 'cancelled', updatedAt: { gte: monthStart } },
          {
            subscriptionStatus: 'past_due',
            currentPeriodEnd: { lt: now, gte: monthStart },
          },
        ],
      },
    }),
    prisma.user.findMany({
      where: {
        subscriptionStatus: { in: ['active', 'trialing'] },
        plan: { not: 'free' },
        createdAt: { lt: monthStart, gte: prevMonthStart },
      },
      select: { plan: true },
    }),
  ]);

  const mrrKobo = activePayingUsers.reduce(
    (sum, u) => sum + planMrrKobo(u.plan),
    0,
  );
  const prevMrrKobo = prevMonthActiveUsers.reduce(
    (sum, u) => sum + planMrrKobo(u.plan),
    0,
  );

  return {
    activeSubscribers,
    trialing,
    pastDue,
    cancelled,
    mrrKobo,
    newThisMonth,
    churnThisMonth,
    netNewMrrKobo: mrrKobo - prevMrrKobo,
  };
}
