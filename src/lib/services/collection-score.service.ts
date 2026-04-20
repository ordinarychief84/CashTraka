/**
 * Collection Performance Score — CashTraka Phase 4
 *
 * Computes a 0-100 "Collection Score" for each seller based on:
 *   - On-time collection rate (40% weight)
 *   - Average days to collect (30% weight)
 *   - Outstanding vs. collected ratio (20% weight)
 *   - Active reminder usage (10% weight)
 *
 * Snapshots are stored in the CollectionScore table for trend tracking.
 * The daily cron computes a new snapshot; the dashboard shows the latest.
 */

import { prisma } from '@/lib/prisma';

export type ScoreBreakdown = {
  score: number;
  onTimeRate: number;
  avgCollectionDays: number;
  collectedAmount: number;
  outstandingAmount: number;
  activeReminders: number;
  trend: 'up' | 'down' | 'stable';
  previousScore: number | null;
};

export const collectionScoreService = {
  /**
   * Compute and store a collection score for a user.
   * Scoring window: last 90 days.
   */
  async compute(userId: string): Promise<ScoreBreakdown> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 90 * 86400000);

    // Debts closed in the window
    const closedDebts = await prisma.debt.findMany({
      where: {
        userId,
        status: { in: ['CLOSED', 'PAID'] },
        updatedAt: { gte: windowStart },
      },
      select: {
        amountOwed: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Open debts (current outstanding)
    const openDebts = await prisma.debt.findMany({
      where: { userId, status: 'OPEN' },
      select: { amountOwed: true, amountPaid: true },
    });

    // Active reminder rules
    const activeReminders = await prisma.reminderRule.count({
      where: { userId, enabled: true },
    });

    // Calculate metrics
    const collectedAmount = closedDebts.reduce((sum, d) => sum + d.amountOwed, 0);
    const outstandingAmount = openDebts.reduce(
      (sum, d) => sum + (d.amountOwed - d.amountPaid),
      0
    );

    // On-time rate: debts paid before or on due date
    let onTimeCount = 0;
    let totalWithDueDate = 0;
    let totalCollectionDays = 0;

    for (const debt of closedDebts) {
      const collectionDays = Math.max(
        0,
        Math.floor((debt.updatedAt.getTime() - debt.createdAt.getTime()) / 86400000)
      );
      totalCollectionDays += collectionDays;

      if (debt.dueDate) {
        totalWithDueDate++;
        if (debt.updatedAt <= debt.dueDate) {
          onTimeCount++;
        }
      }
    }

    const onTimeRate = totalWithDueDate > 0
      ? Math.round((onTimeCount / totalWithDueDate) * 100)
      : 50; // Default to 50% if no due dates set

    const avgCollectionDays = closedDebts.length > 0
      ? Math.round((totalCollectionDays / closedDebts.length) * 10) / 10
      : 0;

    // Compute score (0-100)
    // On-time rate component (0-40)
    const onTimeScore = Math.round(onTimeRate * 0.4);

    // Speed component (0-30): < 3 days = 30, 3-7 = 25, 7-14 = 15, 14+ = 5
    let speedScore = 5;
    if (closedDebts.length > 0) {
      if (avgCollectionDays < 3) speedScore = 30;
      else if (avgCollectionDays < 7) speedScore = 25;
      else if (avgCollectionDays < 14) speedScore = 15;
      else if (avgCollectionDays < 30) speedScore = 10;
    } else {
      speedScore = 15; // Neutral if no data
    }

    // Collection ratio component (0-20)
    const totalVolume = collectedAmount + outstandingAmount;
    const collectionRatio = totalVolume > 0
      ? collectedAmount / totalVolume
      : 0.5;
    const ratioScore = Math.round(collectionRatio * 20);

    // Reminder usage component (0-10)
    const openDebtCount = openDebts.length;
    const reminderCoverage = openDebtCount > 0
      ? Math.min(1, activeReminders / openDebtCount)
      : 1;
    const reminderScore = Math.round(reminderCoverage * 10);

    const score = Math.min(100, onTimeScore + speedScore + ratioScore + reminderScore);

    // Get previous score for trend
    const previousSnapshot = await prisma.collectionScore.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { score: true },
    });

    const previousScore = previousSnapshot?.score ?? null;
    const trend: 'up' | 'down' | 'stable' =
      previousScore === null
        ? 'stable'
        : score > previousScore
          ? 'up'
          : score < previousScore
            ? 'down'
            : 'stable';

    // Store snapshot
    await prisma.collectionScore.upsert({
      where: {
        userId_periodStart: { userId, periodStart: windowStart },
      },
      create: {
        userId,
        score,
        onTimeRate,
        avgCollectionDays,
        collectedAmount,
        outstandingAmount,
        activeReminders,
        periodStart: windowStart,
        periodEnd: now,
      },
      update: {
        score,
        onTimeRate,
        avgCollectionDays,
        collectedAmount,
        outstandingAmount,
        activeReminders,
        periodEnd: now,
      },
    });

    return {
      score,
      onTimeRate,
      avgCollectionDays,
      collectedAmount,
      outstandingAmount,
      activeReminders,
      trend,
      previousScore,
    };
  },

  /** Get the latest score snapshot without recomputing */
  async getLatest(userId: string): Promise<ScoreBreakdown | null> {
    const snapshots = await prisma.collectionScore.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    if (snapshots.length === 0) return null;

    const current = snapshots[0];
    const previous = snapshots[1] ?? null;

    return {
      score: current.score,
      onTimeRate: current.onTimeRate,
      avgCollectionDays: current.avgCollectionDays,
      collectedAmount: current.collectedAmount,
      outstandingAmount: current.outstandingAmount,
      activeReminders: current.activeReminders,
      trend:
        previous === null
          ? 'stable'
          : current.score > previous.score
            ? 'up'
            : current.score < previous.score
              ? 'down'
              : 'stable',
      previousScore: previous?.score ?? null,
    };
  },

  /** Score history for chart (last N snapshots) */
  async history(userId: string, take = 30) {
    return prisma.collectionScore.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take,
      select: {
        score: true,
        onTimeRate: true,
        avgCollectionDays: true,
        collectedAmount: true,
        outstandingAmount: true,
        createdAt: true,
      },
    });
  },
};
