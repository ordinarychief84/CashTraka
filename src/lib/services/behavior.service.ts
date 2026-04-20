/**
 * Customer Behavior Tracking Service — CashTraka Phase 2 + 4
 *
 * Analyzes payment patterns and assigns behavior tags:
 *   FAST_PAYER   — avg < 3 days, always pays on time
 *   LATE_PAYER   — avg > 14 days or > 50% late payments
 *   DORMANT      — no activity in 60+ days
 *   HIGH_VALUE   — totalPaid in top 10% of user's customers
 *   NEW          — fewer than 3 transactions
 *
 * Tags are recomputed by `recomputeAll()` (called from daily cron)
 * and on-demand via `recomputeOne()`.
 */

import { prisma } from '@/lib/prisma';

export type BehaviorTag = 'FAST_PAYER' | 'LATE_PAYER' | 'DORMANT' | 'HIGH_VALUE' | 'NEW';

// ── Tag computation ──────────────────────────────────────────────────

function computeTag(args: {
  transactionCount: number;
  avgPayDays: number | null;
  lastActivityAt: Date;
  totalPaid: number;
  highValueThreshold: number;
}): BehaviorTag {
  const daysSinceActivity = Math.floor(
    (Date.now() - args.lastActivityAt.getTime()) / 86400000
  );

  // NEW: fewer than 3 transactions
  if (args.transactionCount < 3) return 'NEW';

  // DORMANT: no activity in 60+ days
  if (daysSinceActivity >= 60) return 'DORMANT';

  // HIGH_VALUE: total paid exceeds threshold
  if (args.totalPaid >= args.highValueThreshold && args.highValueThreshold > 0) {
    return 'HIGH_VALUE';
  }

  // FAST_PAYER: average pay days < 3
  if (args.avgPayDays !== null && args.avgPayDays < 3) return 'FAST_PAYER';

  // LATE_PAYER: average pay days > 14
  if (args.avgPayDays !== null && args.avgPayDays > 14) return 'LATE_PAYER';

  // Default to FAST_PAYER if they pay reasonably quickly
  if (args.avgPayDays !== null && args.avgPayDays <= 7) return 'FAST_PAYER';

  return 'LATE_PAYER';
}

// ── Service ──────────────────────────────────────────────────────────

export const behaviorService = {
  /**
   * Compute the avg pay days for a customer by looking at their debts.
   * For each CLOSED debt, measure days between createdAt and when it was
   * fully paid (updatedAt with status CLOSED/PAID).
   */
  async computeAvgPayDays(customerId: string): Promise<number | null> {
    const closedDebts = await prisma.debt.findMany({
      where: { customerId, status: { in: ['CLOSED', 'PAID'] } },
      select: { createdAt: true, updatedAt: true },
    });

    if (closedDebts.length === 0) return null;

    const totalDays = closedDebts.reduce((sum, d) => {
      const days = Math.max(
        0,
        Math.floor((d.updatedAt.getTime() - d.createdAt.getTime()) / 86400000)
      );
      return sum + days;
    }, 0);

    return totalDays / closedDebts.length;
  },

  /** Recompute behavior for a single customer */
  async recomputeOne(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        userId: true,
        transactionCount: true,
        totalPaid: true,
        lastActivityAt: true,
      },
    });
    if (!customer) return null;

    const avgPayDays = await this.computeAvgPayDays(customerId);

    // Get high-value threshold (top 10% of user's customers by totalPaid)
    const highValueThreshold = await this.getHighValueThreshold(customer.userId);

    const tag = computeTag({
      transactionCount: customer.transactionCount,
      avgPayDays,
      lastActivityAt: customer.lastActivityAt,
      totalPaid: customer.totalPaid,
      highValueThreshold,
    });

    await prisma.customer.update({
      where: { id: customerId },
      data: { behaviorTag: tag, avgPayDays },
    });

    return { customerId, tag, avgPayDays };
  },

  /** Get the totalPaid threshold for "HIGH_VALUE" (90th percentile) */
  async getHighValueThreshold(userId: string): Promise<number> {
    const customers = await prisma.customer.findMany({
      where: { userId, transactionCount: { gte: 3 } },
      select: { totalPaid: true },
      orderBy: { totalPaid: 'desc' },
    });

    if (customers.length < 5) return Infinity; // Not enough data
    const p90Index = Math.floor(customers.length * 0.1);
    return customers[p90Index]?.totalPaid ?? Infinity;
  },

  /**
   * Recompute behavior tags for ALL customers of a user.
   * Called by daily cron. Returns count of updated customers.
   */
  async recomputeAll(userId: string): Promise<number> {
    const customers = await prisma.customer.findMany({
      where: { userId },
      select: {
        id: true,
        transactionCount: true,
        totalPaid: true,
        lastActivityAt: true,
      },
    });

    if (customers.length === 0) return 0;

    const highValueThreshold = await this.getHighValueThreshold(userId);
    let updated = 0;

    for (const customer of customers) {
      const avgPayDays = await this.computeAvgPayDays(customer.id);
      const tag = computeTag({
        transactionCount: customer.transactionCount,
        avgPayDays,
        lastActivityAt: customer.lastActivityAt,
        totalPaid: customer.totalPaid,
        highValueThreshold,
      });

      await prisma.customer.update({
        where: { id: customer.id },
        data: { behaviorTag: tag, avgPayDays },
      });
      updated++;
    }

    return updated;
  },

  /** Get behavior breakdown for a user's customers */
  async breakdown(userId: string) {
    const [fast, late, dormant, highValue, newC, total] = await Promise.all([
      prisma.customer.count({ where: { userId, behaviorTag: 'FAST_PAYER' } }),
      prisma.customer.count({ where: { userId, behaviorTag: 'LATE_PAYER' } }),
      prisma.customer.count({ where: { userId, behaviorTag: 'DORMANT' } }),
      prisma.customer.count({ where: { userId, behaviorTag: 'HIGH_VALUE' } }),
      prisma.customer.count({ where: { userId, behaviorTag: 'NEW' } }),
      prisma.customer.count({ where: { userId } }),
    ]);

    return {
      fastPayer: fast,
      latePayer: late,
      dormant,
      highValue,
      new: newC,
      untagged: total - fast - late - dormant - highValue - newC,
      total,
    };
  },

  /** Get a single customer's behavior profile */
  async profile(customerId: string, userId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId },
      select: {
        id: true,
        name: true,
        phone: true,
        behaviorTag: true,
        avgPayDays: true,
        totalPaid: true,
        totalOwed: true,
        transactionCount: true,
        totalReminders: true,
        lastRemindedAt: true,
        lastActivityAt: true,
        createdAt: true,
      },
    });
    if (!customer) return null;

    // Get recent payment history
    const recentPayments = await prisma.payment.findMany({
      where: { customerId, userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { amount: true, createdAt: true, status: true },
    });

    // Get open debts
    const openDebts = await prisma.debt.findMany({
      where: { customerId, userId, status: 'OPEN' },
      select: {
        id: true,
        amountOwed: true,
        amountPaid: true,
        dueDate: true,
        reminderCount: true,
      },
    });

    return {
      ...customer,
      recentPayments,
      openDebts,
    };
  },
};
