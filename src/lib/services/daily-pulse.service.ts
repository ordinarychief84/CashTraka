/**
 * Daily Pulse Service — CashTraka
 *
 * Computes a daily business summary for a user:
 *   - Today's revenue
 *   - Outstanding debts & overdue count
 *   - Pending paylinks (especially claimed ones needing confirmation)
 *   - Reminders due today
 *   - Follow-up items
 *   - Yesterday's business expense total
 *
 * Used by:
 *   1. GET /api/daily-pulse — on-demand for dashboard card
 *   2. /api/cron/daily-pulse — daily email at 7 AM WAT
 */

import { prisma } from '@/lib/prisma';
import { promiseToPayService } from './promise-to-pay.service';

export type DailyPulseData = {
  todayRevenue: number;
  yesterdayRevenue: number;
  revenueDelta: number; // percentage change
  totalOwed: number;
  overdueDebts: number;
  pendingPaylinks: number;
  claimedPaylinks: number; // need seller confirmation
  remindersDueToday: number;
  quietCustomers: number; // no activity in 30+ days
  topDebtors: { name: string; phone: string; amount: number }[];
  yesterdaySpent: number; // business expenses yesterday
  // Promise to Pay & auto-confirmation stats
  activePromises: number;
  brokenPromises: number;
  committedUnpaid: number;
  autoConfirmedToday: number;
  autoConfirmedAmountToday: number;
};

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export async function computeDailyPulse(userId: string): Promise<DailyPulseData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    todayPayments,
    yesterdayPayments,
    openDebts,
    overdueDebts,
    pendingPaylinks,
    claimedPaylinks,
    remindersDue,
    quietCustomers,
    topDebtors,
    yesterdayExpenses,
  ] = await Promise.all([
    // Today's revenue
    prisma.payment.aggregate({
      where: { userId, createdAt: { gte: todayStart }, status: 'PAID' },
      _sum: { amountKobo: true },
    }),
    // Yesterday's revenue
    prisma.payment.aggregate({
      where: { userId, createdAt: { gte: yesterdayStart, lt: todayStart }, status: 'PAID' },
      _sum: { amountKobo: true },
    }),
    // Total outstanding debts
    prisma.debt.aggregate({
      where: { userId, status: 'OPEN' },
      _sum: { amountOwedKobo: true },
    }),
    // Overdue debts (past due date, still open)
    prisma.debt.count({
      where: { userId, status: 'OPEN', dueDate: { lt: now } },
    }),
    // Pending paylinks
    prisma.paymentRequest.count({
      where: { userId, status: { in: ['pending', 'viewed'] } },
    }),
    // Claimed paylinks needing confirmation
    prisma.paymentRequest.count({
      where: { userId, status: 'claimed' },
    }),
    // Reminders due today
    prisma.reminderSchedule.count({
      where: { userId, enabled: true, nextDueAt: { lte: now } },
    }),
    // Quiet customers (no activity in 30+ days)
    prisma.customer.count({
      where: { userId, lastActivityAt: { lt: thirtyDaysAgo } },
    }),
    // Top 5 debtors
    prisma.debt.findMany({
      where: { userId, status: 'OPEN' },
      orderBy: { amountOwedKobo: 'desc' },
      take: 5,
      select: { customerNameSnapshot: true, phoneSnapshot: true, amountOwedKobo: true, amountPaidKobo: true },
    }),
    // Yesterday's business expenses
    prisma.expense.aggregate({
      where: {
        userId,
        kind: 'business',
        incurredOn: { gte: yesterdayStart, lt: todayStart },
      },
      _sum: { amountKobo: true },
    }),
  ]);

  const todayRev = todayPayments._sum.amountKobo || 0;
  const yesterdayRev = yesterdayPayments._sum.amountKobo || 0;
  const delta = yesterdayRev > 0
    ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100)
    : todayRev > 0 ? 100 : 0;

  // Fetch promise stats
  let promiseStats = {
    activePromises: 0,
    brokenPromises: 0,
    committedUnpaid: 0,
    partiallyRecovered: 0,
    autoConfirmedToday: 0,
    autoConfirmedAmountToday: 0,
  };
  try {
    promiseStats = await promiseToPayService.pulseStats(userId);
  } catch {
    // Non-critical — pulse still works without promise data
  }

  return {
    todayRevenue: todayRev,
    yesterdayRevenue: yesterdayRev,
    revenueDelta: delta,
    totalOwed: openDebts._sum.amountOwedKobo || 0,
    overdueDebts,
    pendingPaylinks,
    claimedPaylinks,
    remindersDueToday: remindersDue,
    quietCustomers,
    topDebtors: topDebtors.map((d) => ({
      name: d.customerNameSnapshot,
      phone: d.phoneSnapshot,
      amount: d.amountOwedKobo - d.amountPaidKobo,
    })),
    yesterdaySpent: yesterdayExpenses._sum.amountKobo ?? 0,
    activePromises: promiseStats.activePromises,
    brokenPromises: promiseStats.brokenPromises,
    committedUnpaid: promiseStats.committedUnpaid,
    autoConfirmedToday: promiseStats.autoConfirmedToday,
    autoConfirmedAmountToday: promiseStats.autoConfirmedAmountToday,
  };
}
