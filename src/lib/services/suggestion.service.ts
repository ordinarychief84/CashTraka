/**
 * Smart Suggestions Engine — CashTraka Phase 4
 *
 * Generates actionable suggestions based on customer behavior patterns,
 * collection performance, and business activity. Surfaces on the dashboard
 * as a "Suggestions" panel.
 *
 * Categories:
 *   - COLLECT    — chase outstanding money
 *   - REWARD     — nurture good customers
 *   - RE_ENGAGE  — wake up dormant customers
 *   - OPTIMISE   — improve business operations
 */

import { prisma } from '@/lib/prisma';

export type SuggestionType = 'COLLECT' | 'REWARD' | 'RE_ENGAGE' | 'OPTIMISE';
export type SuggestionPriority = 'high' | 'medium' | 'low';

export type Suggestion = {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  customerName?: string;
  customerId?: string;
  amount?: number;
};

export const suggestionService = {
  /**
   * Generate suggestions for the user. Returns up to 10 actionable items
   * sorted by priority. Each suggestion has a link to take action.
   */
  async generate(userId: string): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // ── 1. COLLECT: Debts with no reminder rule ────────────────────
    const debtsWithoutReminders = await prisma.debt.findMany({
      where: {
        userId,
        status: 'OPEN',
        reminderRules: { none: { enabled: true } },
      },
      include: {
        customer: { select: { id: true, name: true, behaviorTag: true } },
      },
      orderBy: { amountOwed: 'desc' },
      take: 3,
    });

    for (const debt of debtsWithoutReminders) {
      const remaining = debt.amountOwed - debt.amountPaid;
      if (remaining <= 0) continue;

      const isLate = debt.customer?.behaviorTag === 'LATE_PAYER';
      suggestions.push({
        id: `collect-reminder-${debt.id}`,
        type: 'COLLECT',
        priority: isLate ? 'high' : 'medium',
        title: `Set up auto-reminders for ${debt.customerNameSnapshot}`,
        body: `₦${remaining.toLocaleString('en-NG')} outstanding${isLate ? ' — this customer tends to pay late' : ''}. Auto-reminders can help collect faster.`,
        actionLabel: 'Set Reminder',
        actionHref: `/collections?debtId=${debt.id}&action=reminder`,
        customerName: debt.customerNameSnapshot,
        customerId: debt.customer?.id,
        amount: remaining,
      });
    }

    // ── 2. COLLECT: Claimed PayLinks awaiting confirmation ─────────
    const claimedPaylinks = await prisma.paymentRequest.findMany({
      where: { userId, status: 'claimed' },
      orderBy: { claimedAt: 'asc' },
      take: 3,
    });

    for (const pl of claimedPaylinks) {
      suggestions.push({
        id: `collect-confirm-${pl.id}`,
        type: 'COLLECT',
        priority: 'high',
        title: `${pl.customerName} says they paid ₦${pl.amount.toLocaleString('en-NG')}`,
        body: 'Check your bank and confirm if payment was received.',
        actionLabel: 'Confirm',
        actionHref: `/paylinks?id=${pl.id}&action=confirm`,
        customerName: pl.customerName,
        amount: pl.amount,
      });
    }

    // ── 3. COLLECT: Overdue debts without recent activity ──────────
    const overdueDebts = await prisma.debt.findMany({
      where: {
        userId,
        status: 'OPEN',
        dueDate: { lt: new Date() },
        lastRemindedAt: {
          lt: new Date(Date.now() - 7 * 86400000), // Not reminded in 7 days
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 3,
    });

    for (const debt of overdueDebts) {
      const remaining = debt.amountOwed - debt.amountPaid;
      const daysOverdue = Math.floor(
        (Date.now() - (debt.dueDate?.getTime() || Date.now())) / 86400000
      );

      suggestions.push({
        id: `collect-overdue-${debt.id}`,
        type: 'COLLECT',
        priority: daysOverdue > 30 ? 'high' : 'medium',
        title: `${debt.customerNameSnapshot} is ${daysOverdue} days overdue`,
        body: `₦${remaining.toLocaleString('en-NG')} outstanding. Send a PayLink or WhatsApp reminder.`,
        actionLabel: 'Send PayLink',
        actionHref: `/paylinks/new?name=${encodeURIComponent(debt.customerNameSnapshot)}&phone=${encodeURIComponent(debt.phoneSnapshot)}&amount=${remaining}&debtId=${debt.id}`,
        customerName: debt.customerNameSnapshot,
        customerId: debt.customer?.id,
        amount: remaining,
      });
    }

    // ── 4. RE_ENGAGE: Dormant customers ───────────────────────────
    const dormantCustomers = await prisma.customer.findMany({
      where: {
        userId,
        behaviorTag: 'DORMANT',
        totalPaid: { gt: 0 },
      },
      orderBy: { totalPaid: 'desc' },
      take: 3,
    });

    for (const c of dormantCustomers) {
      suggestions.push({
        id: `reengage-${c.id}`,
        type: 'RE_ENGAGE',
        priority: c.totalPaid > 50000 ? 'high' : 'low',
        title: `Re-engage ${c.name}`,
        body: `Previously paid ₦${c.totalPaid.toLocaleString('en-NG')} but inactive for 60+ days. A friendly check-in could bring them back.`,
        actionLabel: 'Send Message',
        actionHref: `/customers/${c.id}`,
        customerName: c.name,
        customerId: c.id,
        amount: c.totalPaid,
      });
    }

    // ── 5. REWARD: Fast payers / high-value customers ─────────────
    const fastPayers = await prisma.customer.findMany({
      where: {
        userId,
        behaviorTag: { in: ['FAST_PAYER', 'HIGH_VALUE'] },
        totalOwed: { equals: 0 },
      },
      orderBy: { totalPaid: 'desc' },
      take: 2,
    });

    for (const c of fastPayers) {
      suggestions.push({
        id: `reward-${c.id}`,
        type: 'REWARD',
        priority: 'low',
        title: `Thank ${c.name} — your best customer`,
        body: `Paid ₦${c.totalPaid.toLocaleString('en-NG')} across ${c.transactionCount} transactions${c.behaviorTag === 'FAST_PAYER' ? ', always on time' : ''}. A thank-you message builds loyalty.`,
        actionLabel: 'Send Thanks',
        actionHref: `/customers/${c.id}`,
        customerName: c.name,
        customerId: c.id,
      });
    }

    // ── 6. OPTIMISE: Debts with no due date ───────────────────────
    const noDueDateDebts = await prisma.debt.count({
      where: { userId, status: 'OPEN', dueDate: null },
    });

    if (noDueDateDebts > 0) {
      suggestions.push({
        id: 'optimise-due-dates',
        type: 'OPTIMISE',
        priority: 'low',
        title: `${noDueDateDebts} debts have no due date`,
        body: 'Setting due dates helps prioritise collections and enables auto-reminders.',
        actionLabel: 'View Debts',
        actionHref: '/debts',
      });
    }

    // Sort by priority weight
    const priorityWeight: Record<SuggestionPriority, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    suggestions.sort(
      (a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]
    );

    return suggestions.slice(0, 10);
  },
};
