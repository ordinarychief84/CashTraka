import { prisma } from '@/lib/prisma';

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
