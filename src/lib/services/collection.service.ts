/**
 * Smart Collection Engine — CashTraka
 *
 * Combines overdue debts + expired/pending paylinks into a single prioritized
 * collection queue. Each item gets a priority score based on:
 *   - Amount owed (higher = higher priority)
 *   - Days overdue (more overdue = higher priority)
 *   - Claimed paylinks (need immediate confirmation)
 *   - Customer activity recency
 *
 * Provides action recommendations for each item.
 */

import { prisma } from '@/lib/prisma';

export type CollectionItem = {
  id: string;
  type: 'debt' | 'paylink' | 'promise' | 'installment';
  customerName: string;
  customerPhone: string;
  amount: number;
  amountPaid: number;
  remaining: number;
  status: string;
  dueDate: string | null;
  daysOverdue: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  priorityScore: number;
  suggestedAction: string;
  paylinkToken?: string;
  promiseToken?: string;
  debtId?: string;
  customerId?: string;
  installmentPlanId?: string;
};

export type CollectionSummary = {
  totalOutstanding: number;
  urgentCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  items: CollectionItem[];
};

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function scorePriority(amount: number, daysOverdue: number, isClaimed: boolean): number {
  let score = 0;

  // Amount weight (0-40 points)
  if (amount >= 100000) score += 40;
  else if (amount >= 50000) score += 30;
  else if (amount >= 20000) score += 20;
  else if (amount >= 5000) score += 10;
  else score += 5;

  // Days overdue weight (0-40 points)
  if (daysOverdue >= 30) score += 40;
  else if (daysOverdue >= 14) score += 30;
  else if (daysOverdue >= 7) score += 20;
  else if (daysOverdue >= 1) score += 10;

  // Claimed paylink bonus (immediate action needed)
  if (isClaimed) score += 25;

  return score;
}

function priorityLabel(score: number): 'urgent' | 'high' | 'medium' | 'low' {
  if (score >= 60) return 'urgent';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

function suggestAction(type: string, status: string, daysOverdue: number, hasPaylink: boolean): string {
  if (type === 'paylink' && status === 'claimed') return 'Confirm payment — customer says they paid';
  if (type === 'paylink' && status === 'expired') return 'Resend — create a new PayLink';
  if (type === 'paylink' && status === 'viewed') return 'Follow up — customer saw the link but hasn\'t paid';

  if (daysOverdue >= 30) return 'Final notice — send stern reminder via WhatsApp';
  if (daysOverdue >= 14) return 'Escalate — call or send a firm reminder';
  if (daysOverdue >= 7) return hasPaylink ? 'Check PayLink status' : 'Send PayLink — make it easy to pay';
  if (daysOverdue >= 1) return hasPaylink ? 'Nudge via WhatsApp' : 'Send PayLink with gentle reminder';
  return 'Send friendly reminder';
}

export async function getCollectionQueue(userId: string): Promise<CollectionSummary> {
  const now = new Date();

  // Fetch open debts
  const debts = await prisma.debt.findMany({
    where: { userId, status: 'OPEN' },
    include: { customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { dueDate: 'asc' },
  });

  // Fetch active/problematic paylinks
  const paylinks = await prisma.paymentRequest.findMany({
    where: {
      userId,
      status: { in: ['pending', 'viewed', 'claimed', 'expired'] },
    },
    include: { customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Debt IDs that already have active paylinks
  const debtIdsWithPaylinks = new Set(
    paylinks
      .filter((pl) => pl.debtId && ['pending', 'viewed', 'claimed'].includes(pl.status))
      .map((pl) => pl.debtId!)
  );

  const items: CollectionItem[] = [];

  // Process debts
  for (const debt of debts) {
    const remaining = debt.amountOwed - debt.amountPaid;
    if (remaining <= 0) continue;

    const daysOverdue = debt.dueDate ? Math.max(0, daysBetween(debt.dueDate, now)) : 0;
    const hasPaylink = debtIdsWithPaylinks.has(debt.id);
    const score = scorePriority(remaining, daysOverdue, false);

    items.push({
      id: debt.id,
      type: 'debt',
      customerName: debt.customerNameSnapshot,
      customerPhone: debt.phoneSnapshot,
      amount: debt.amountOwed,
      amountPaid: debt.amountPaid,
      remaining,
      status: daysOverdue > 0 ? 'overdue' : 'open',
      dueDate: debt.dueDate?.toISOString() || null,
      daysOverdue,
      priority: priorityLabel(score),
      priorityScore: score,
      suggestedAction: suggestAction('debt', debt.status, daysOverdue, hasPaylink),
      debtId: debt.id,
      customerId: debt.customer?.id,
    });
  }

  // Process paylinks (only non-confirmed, non-cancelled)
  for (const pl of paylinks) {
    // Skip paylinks that are tied to debts already in the queue
    // (they show as the debt's action instead)
    if (pl.debtId && items.some((i) => i.debtId === pl.debtId)) continue;

    const daysOld = daysBetween(pl.createdAt, now);
    const isClaimed = pl.status === 'claimed';
    const score = scorePriority(pl.amount, daysOld, isClaimed);

    items.push({
      id: pl.id,
      type: 'paylink',
      customerName: pl.customerName,
      customerPhone: pl.customerPhone,
      amount: pl.amount,
      amountPaid: 0,
      remaining: pl.amount,
      status: pl.status,
      dueDate: pl.expiresAt?.toISOString() || null,
      daysOverdue: daysOld,
      priority: priorityLabel(score),
      priorityScore: score,
      suggestedAction: suggestAction('paylink', pl.status, daysOld, true),
      paylinkToken: pl.token,
      customerId: pl.customer?.id,
    });
  }

  // Fetch active promises and merge into the queue
  const promises = await prisma.promiseToPay.findMany({
    where: {
      userId,
      status: { in: ['OPEN', 'PARTIALLY_PAID', 'PROMISED', 'BROKEN'] },
    },
    include: {
      commitments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  for (const p of promises) {
    if (p.remainingAmount <= 0) continue;
    // Skip promises linked to debts already in the queue
    if (p.debtId && items.some((i) => i.debtId === p.debtId)) continue;

    const daysOld = daysBetween(p.createdAt, now);
    const isBroken = p.status === 'BROKEN';
    const score = scorePriority(p.remainingAmount, daysOld, isBroken);

    const commitment = p.commitments[0];
    let suggestedAction = 'Send reminder';
    if (isBroken) suggestedAction = 'Broken promise — follow up urgently';
    else if (p.status === 'PROMISED') suggestedAction = 'Awaiting promised payment';
    else if (p.status === 'PARTIALLY_PAID') suggestedAction = 'Partial payment received — follow up for balance';
    else suggestedAction = 'Resend promise link';

    items.push({
      id: p.id,
      type: 'promise',
      customerName: p.customerNameSnapshot,
      customerPhone: p.phoneSnapshot,
      amount: p.originalAmount,
      amountPaid: p.originalAmount - p.remainingAmount,
      remaining: p.remainingAmount,
      status: p.status.toLowerCase(),
      dueDate: commitment?.promisedDate?.toISOString() || null,
      daysOverdue: daysOld,
      priority: priorityLabel(score),
      priorityScore: score,
      suggestedAction,
      promiseToken: p.publicToken,
      customerId: p.customerId || undefined,
      debtId: p.debtId || undefined,
    });
  }

  // Fetch failed/paused installment plans — these need manual intervention
  const failedInstallments = await prisma.installmentPlan.findMany({
    where: {
      userId,
      status: { in: ['FAILED', 'PAUSED'] },
      remainingAmount: { gt: 0 },
    },
    include: {
      charges: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });

  for (const plan of failedInstallments) {
    // Skip plans whose linked debt is already in the queue
    if (plan.debtId && items.some((i) => i.debtId === plan.debtId)) continue;

    const daysSinceUpdate = daysBetween(plan.updatedAt, now);
    const consecutiveFailures = plan.failedAttempts;
    // Score high — these represent stuck revenue that was expected to auto-collect
    const score = scorePriority(plan.remainingAmount, daysSinceUpdate, consecutiveFailures >= 3);

    let suggestedAction = 'Send reminder now';
    if (consecutiveFailures >= 3) {
      suggestedAction = 'Disable auto-charge and follow up manually';
    } else if (consecutiveFailures >= 2) {
      suggestedAction = 'Call customer';
    } else {
      const lastCharge = plan.charges[0];
      if (lastCharge?.failureReason?.includes('insufficient')) {
        suggestedAction = 'Resend promise link';
      } else {
        suggestedAction = 'Send reminder now';
      }
    }

    items.push({
      id: plan.id,
      type: 'installment',
      customerName: plan.customerNameSnapshot,
      customerPhone: plan.phoneSnapshot,
      amount: plan.totalAmount,
      amountPaid: plan.totalAmount - plan.remainingAmount,
      remaining: plan.remainingAmount,
      status: plan.status.toLowerCase(),
      dueDate: plan.nextChargeAt?.toISOString() || null,
      daysOverdue: daysSinceUpdate,
      priority: priorityLabel(score),
      priorityScore: score,
      suggestedAction,
      customerId: plan.customerId || undefined,
      debtId: plan.debtId || undefined,
      installmentPlanId: plan.id,
    });
  }

  // Sort by priority score descending
  items.sort((a, b) => b.priorityScore - a.priorityScore);

  const totalOutstanding = items.reduce((sum, i) => sum + i.remaining, 0);

  return {
    totalOutstanding,
    urgentCount: items.filter((i) => i.priority === 'urgent').length,
    highCount: items.filter((i) => i.priority === 'high').length,
    mediumCount: items.filter((i) => i.priority === 'medium').length,
    lowCount: items.filter((i) => i.priority === 'low').length,
    items,
  };
}
