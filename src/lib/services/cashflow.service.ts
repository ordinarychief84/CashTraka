/**
 * Cash flow forecast - internal service.
 *
 * Computes a 30-day projection for a single seller based on data already in
 * the system. Numbers are best-effort estimates, not predictions, and the v1
 * intentionally keeps the math simple and explainable:
 *
 *   - Expected inflow: sum of (total - amountPaid) on Invoices that are
 *     SENT / VIEWED / PARTIALLY_PAID with dueDate in the next 30 days.
 *   - Recurring inflow: sum of the most recent generated invoice total per
 *     ACTIVE rule whose nextRunAt falls in the next 30 days. Falls back to
 *     parsing templateData JSON `items` when no historical invoice exists.
 *   - Expected outflow: sum of Expense rows in the LAST 30 days, used as a
 *     proxy for the next 30 days' spending. Real prediction is out of scope.
 *   - Recent revenue trend: percent change in Payments + manual receipts
 *     between (now-30d .. now) and (now-60d .. now-30d).
 *
 * All amounts are integers in naira.
 */

import { prisma } from '@/lib/prisma';

export type CashflowForecast = {
  expectedInflow: number;
  recurringInflow: number;
  expectedOutflow: number;
  recentRevenueTrend30d: number | null; // null when prior period is empty
  projectedNet: number;
  asOf: Date;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ParsedTemplateItem = {
  unitPrice?: number;
  quantity?: number;
};

function estimateRuleAmountFromTemplate(templateData: string): number {
  try {
    const parsed = JSON.parse(templateData) as { items?: ParsedTemplateItem[] };
    if (!parsed.items || !Array.isArray(parsed.items)) return 0;
    return parsed.items.reduce((sum, it) => {
      const unit = typeof it.unitPrice === 'number' ? it.unitPrice : 0;
      const qty = typeof it.quantity === 'number' ? it.quantity : 1;
      return sum + Math.max(0, unit * qty);
    }, 0);
  } catch {
    return 0;
  }
}

export async function getCashflowForecast(userId: string): Promise<CashflowForecast> {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * MS_PER_DAY);
  const last30Start = new Date(now.getTime() - 30 * MS_PER_DAY);
  const prior30Start = new Date(now.getTime() - 60 * MS_PER_DAY);

  const [
    expectedInvoiceRows,
    recurringRules,
    expensesAgg,
    paymentsLast30,
    paymentsPrior30,
  ] = await Promise.all([
    // Open invoices coming due inside the window. Using (total - amountPaid)
    // captures partial-paid balances correctly.
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID'] },
        dueDate: { gte: now, lte: in30 },
      },
      select: { total: true, amountPaid: true },
    }),
    // Active rules due to fire next inside the window. Pull the latest
    // generated invoice for each so we can use the actual amount when
    // available; fall back to templateData when there's no run history yet.
    prisma.recurringInvoiceRule.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        nextRunAt: { lte: in30 },
      },
      select: {
        id: true,
        templateData: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { total: true },
        },
      },
    }),
    prisma.expense.aggregate({
      where: { userId, incurredOn: { gte: last30Start, lte: now } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
        createdAt: { gte: last30Start, lte: now },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
        createdAt: { gte: prior30Start, lt: last30Start },
      },
      _sum: { amount: true },
    }),
  ]);

  const expectedInflow = expectedInvoiceRows.reduce(
    (sum, row) => sum + Math.max(0, row.total - row.amountPaid),
    0,
  );

  const recurringInflow = recurringRules.reduce((sum, rule) => {
    const lastTotal = rule.invoices[0]?.total ?? 0;
    if (lastTotal > 0) return sum + lastTotal;
    return sum + estimateRuleAmountFromTemplate(rule.templateData);
  }, 0);

  const expectedOutflow = expensesAgg._sum.amount ?? 0;

  const last30Total = paymentsLast30._sum.amount ?? 0;
  const prior30Total = paymentsPrior30._sum.amount ?? 0;
  const recentRevenueTrend30d =
    prior30Total > 0
      ? Math.round(((last30Total - prior30Total) / prior30Total) * 100)
      : null;

  const projectedNet = expectedInflow + recurringInflow - expectedOutflow;

  return {
    expectedInflow,
    recurringInflow,
    expectedOutflow,
    recentRevenueTrend30d,
    projectedNet,
    asOf: now,
  };
}
