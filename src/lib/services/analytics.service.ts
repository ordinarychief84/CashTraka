import { prisma } from '@/lib/prisma';
import { PLAN_PRICING, isPaidPlan } from '@/lib/billing/pricing';

/**
 * System-wide analytics (for admin dashboard) and per-user metrics.
 * All queries run in parallel to keep the admin dashboard snappy.
 */

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfPrevMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function endOfPrevMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59);
}

export const analyticsService = {
  /** Top-level admin metrics: everything the /api/admin/metrics endpoint needs. */
  async systemMetrics() {
    const [
      totalUsers,
      activeUsersLast7,
      activatedUsers,
      totalPayments,
      totalDebts,
      totalCustomers,
      totalRevenueAgg,
      outstandingDebtAgg,
      recentSignups,
      recentPayments,
      recentDebts,
      zeroActivityUsers,
      suspendedUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: daysAgo(7) } } }),
      prisma.user.count({ where: { onboardingCompleted: true } }),
      prisma.payment.count(),
      prisma.debt.count(),
      prisma.customer.count(),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.debt.aggregate({
        where: { status: 'OPEN' },
        _sum: { amountOwed: true, amountPaid: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          businessType: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerNameSnapshot: true,
          amount: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, businessName: true } },
        },
      }),
      prisma.debt.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerNameSnapshot: true,
          amountOwed: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, businessName: true } },
        },
      }),
      prisma.user.count({
        where: {
          payments: { none: {} },
          debts: { none: {} },
        },
      }),
      prisma.user.count({ where: { isSuspended: true } }),
    ]);

    const outstandingDebt = Math.max(
      (outstandingDebtAgg._sum.amountOwed ?? 0) - (outstandingDebtAgg._sum.amountPaid ?? 0),
      0,
    );

    return {
      totals: {
        users: totalUsers,
        activeUsers7d: activeUsersLast7,
        activatedUsers,
        payments: totalPayments,
        debts: totalDebts,
        customers: totalCustomers,
        revenue: totalRevenueAgg._sum.amount ?? 0,
        outstandingDebt,
        zeroActivityUsers,
        suspendedUsers,
      },
      recentSignups,
      recentPayments,
      recentDebts,
    };
  },

  /**
   * Platform pulse — richer metrics for the redesigned admin dashboard.
   *
   * Returns:
   *   - growth    signups vs prior-7d, total users, active cohorts (7d / 30d)
   *   - plans     breakdown by subscription status + plan tier, with a
   *               rough MRR derived from paid-plan enrolments
   *   - billing   past-due list + trial-expiring-soon list + attempt health
   *   - platform  GMV this month + prior month, outstanding debt,
   *               average transaction size
   *   - topTenants top-5 businesses by GMV this month
   *   - activity   recent signups / payments / cancellations for the feed
   */
  async platformPulse() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const prevMonthStart = startOfPrevMonth(now);
    const prevMonthEnd = endOfPrevMonth(now);
    const last7 = daysAgo(7);
    const last30 = daysAgo(30);
    const prev7Start = daysAgo(14);
    const prev7End = daysAgo(7);
    const trialSoonEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersLast7,
      newUsersPrev7,
      activeLast7,
      activeLast30,
      zeroActivity,
      suspended,
      planBuckets,
      subStatusBuckets,
      gmvThisMonth,
      gmvPrevMonth,
      outstandingDebtAgg,
      avgTxnAgg,
      topTenants,
      trialExpiringSoon,
      pastDueUsers,
      attemptsLast30,
      recentSignups,
      recentPayments,
      recentCancellations,
      platformExpensesAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: last7 } } }),
      prisma.user.count({
        where: { createdAt: { gte: prev7Start, lt: prev7End } },
      }),
      prisma.user.count({ where: { lastLoginAt: { gte: last7 } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: last30 } } }),
      prisma.user.count({
        where: { payments: { none: {} }, debts: { none: {} } },
      }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.user.groupBy({ by: ['plan'], _count: true }),
      prisma.user.groupBy({ by: ['subscriptionStatus'], _count: true }),
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: {
          status: 'PAID',
          createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.debt.aggregate({
        where: { status: 'OPEN' },
        _sum: { amountOwed: true, amountPaid: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'PAID' },
        _avg: { amount: true },
      }),
      // Top tenants by GMV this month
      prisma.payment.groupBy({
        by: ['userId'],
        where: { status: 'PAID', createdAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          subscriptionStatus: 'trialing',
          trialEndsAt: { gte: now, lte: trialSoonEnd },
        },
        orderBy: { trialEndsAt: 'asc' },
        take: 10,
        select: { id: true, name: true, email: true, plan: true, trialEndsAt: true },
      }),
      prisma.user.findMany({
        where: { subscriptionStatus: 'past_due' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, plan: true, currentPeriodEnd: true },
      }),
      prisma.paymentAttempt.groupBy({
        by: ['status'],
        where: { createdAt: { gte: last30 } },
        _count: true,
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          businessType: true,
          businessName: true,
          plan: true,
          createdAt: true,
        },
      }),
      prisma.payment.findMany({
        where: { status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          customerNameSnapshot: true,
          amount: true,
          createdAt: true,
          user: { select: { id: true, name: true, businessName: true } },
        },
      }),
      prisma.user.findMany({
        where: { subscriptionStatus: 'cancelled' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          currentPeriodEnd: true,
          updatedAt: true,
        },
      }),
      // Platform-wide expense totals this month
      prisma.expense.aggregate({
        where: { incurredOn: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Resolve tenant names for the top-tenants query (separate fetch keeps
    // the groupBy clean).
    const topTenantIds = topTenants.map((t) => t.userId);
    const tenantUsers = topTenantIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topTenantIds } },
          select: { id: true, name: true, businessName: true, plan: true },
        })
      : [];
    const tenantById = new Map(tenantUsers.map((u) => [u.id, u]));

    // Plan distribution (count by tier). groupBy returns an array of { plan, _count }.
    const planCounts = Object.fromEntries(
      planBuckets.map((b) => [b.plan, b._count]),
    ) as Record<string, number>;

    const statusCounts = Object.fromEntries(
      subStatusBuckets.map((b) => [b.subscriptionStatus ?? 'free', b._count]),
    ) as Record<string, number>;

    // Rough MRR — sum of plan price for everyone on trial OR active.
    // A trialing user isn't paying YET, so we split the figure:
    //   committedMrr = active users only  (currently billing)
    //   pipelineMrr  = trialing users     (paying soon if they convert)
    let committedMrr = 0;
    let pipelineMrr = 0;
    const paidUsers = await prisma.user.findMany({
      where: {
        subscriptionStatus: { in: ['active', 'trialing'] },
      },
      select: { plan: true, subscriptionStatus: true },
    });
    for (const u of paidUsers) {
      if (!isPaidPlan(u.plan)) continue;
      const monthly = Math.round(PLAN_PRICING[u.plan].amountKobo / 100);
      if (u.subscriptionStatus === 'active') committedMrr += monthly;
      else pipelineMrr += monthly;
    }

    // Growth delta
    const signupDelta =
      newUsersPrev7 > 0
        ? Math.round(((newUsersLast7 - newUsersPrev7) / newUsersPrev7) * 100)
        : null;

    // GMV delta
    const thisMonthGmv = gmvThisMonth._sum.amount ?? 0;
    const prevMonthGmv = gmvPrevMonth._sum.amount ?? 0;
    const gmvDelta =
      prevMonthGmv > 0
        ? Math.round(((thisMonthGmv - prevMonthGmv) / prevMonthGmv) * 100)
        : null;

    const outstandingDebt = Math.max(
      (outstandingDebtAgg._sum.amountOwed ?? 0) -
        (outstandingDebtAgg._sum.amountPaid ?? 0),
      0,
    );

    const attemptCounts = Object.fromEntries(
      attemptsLast30.map((a) => [a.status, a._count]),
    ) as Record<string, number>;
    const attemptsTotal = Object.values(attemptCounts).reduce(
      (s, n) => s + (n ?? 0),
      0,
    );
    const attemptsSuccess = attemptCounts.success ?? 0;
    const successRate =
      attemptsTotal > 0 ? Math.round((attemptsSuccess / attemptsTotal) * 100) : null;

    return {
      growth: {
        totalUsers,
        newUsers7d: newUsersLast7,
        newUsersPrev7d: newUsersPrev7,
        signupDeltaPct: signupDelta,
        activeLast7d: activeLast7,
        activeLast30d: activeLast30,
        zeroActivity,
        suspended,
      },
      plans: {
        byPlan: planCounts,
        byStatus: statusCounts,
        committedMrr,
        pipelineMrr,
      },
      billing: {
        pastDueCount: statusCounts.past_due ?? 0,
        trialingCount: statusCounts.trialing ?? 0,
        activeCount: statusCounts.active ?? 0,
        cancelledCount: statusCounts.cancelled ?? 0,
        trialExpiringSoon, // users with trial ending in the next 3 days
        pastDueUsers,
        attemptsLast30d: {
          total: attemptsTotal,
          success: attemptsSuccess,
          failed: attemptCounts.failed ?? 0,
          pending: attemptCounts.pending ?? 0,
          abandoned: attemptCounts.abandoned ?? 0,
          successRatePct: successRate,
        },
      },
      platform: {
        gmvThisMonth: thisMonthGmv,
        gmvPrevMonth: prevMonthGmv,
        gmvDeltaPct: gmvDelta,
        txnsThisMonth: gmvThisMonth._count,
        outstandingDebt,
        avgTxn: Math.round(avgTxnAgg._avg.amount ?? 0),
        expensesThisMonth: platformExpensesAgg._sum.amount ?? 0,
        expenseCount: platformExpensesAgg._count,
      },
      topTenants: topTenants.map((t) => ({
        userId: t.userId,
        name:
          tenantById.get(t.userId)?.businessName ||
          tenantById.get(t.userId)?.name ||
          'Unknown',
        plan: tenantById.get(t.userId)?.plan ?? 'free',
        gmv: t._sum.amount ?? 0,
        txns: t._count,
      })),
      activity: {
        recentSignups,
        recentPayments,
        recentCancellations,
      },
    };
  },

  /**
   * Monthly trend data for the last N months. Useful for analytics charts.
   */
  async monthlyTrends(months = 6) {
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const [users, payments] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: { status: 'PAID', createdAt: { gte: start } },
        select: { amount: true, createdAt: true },
      }),
    ]);

    function monthIndex(d: Date): string {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    const labels: string[] = [];
    const signupCounts = new Map<string, number>();
    const revenueSums = new Map<string, number>();

    const cursor = new Date(start);
    for (let i = 0; i < months; i++) {
      const key = monthIndex(cursor);
      labels.push(key);
      signupCounts.set(key, 0);
      revenueSums.set(key, 0);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const u of users) {
      const k = monthIndex(u.createdAt);
      if (signupCounts.has(k)) signupCounts.set(k, (signupCounts.get(k) ?? 0) + 1);
    }
    for (const p of payments) {
      const k = monthIndex(p.createdAt);
      if (revenueSums.has(k)) revenueSums.set(k, (revenueSums.get(k) ?? 0) + p.amount);
    }

    return {
      labels,
      signups: labels.map((l) => signupCounts.get(l) ?? 0),
      revenue: labels.map((l) => revenueSums.get(l) ?? 0),
    };
  },
};
