/**
 * Auto VAT return generator, the headline feature of the Tax+ tier.
 *
 * Aggregates output VAT (from invoices the seller issued) and input VAT
 * (from expenses the seller paid) over a monthly or quarterly period and
 * stores the totals on a VatReturn row keyed by (userId, periodStart,
 * periodEnd). The service is gated by `requireFeature(user, 'vatReturns')`
 * at the route layer.
 *
 * Definitions used here:
 *   - Output VAT: Invoice.tax across rows where vatApplied=true and the
 *     invoice is "active" (PAID, PARTIALLY_PAID, SENT, VIEWED, OVERDUE).
 *     CANCELLED + CREDITED are excluded so reversed sales don't inflate the
 *     liability.
 *   - Input VAT: Expense.vatPaid across rows where incurredOn falls inside
 *     the period.
 *   - Net VAT: outputVat - inputVat. Negative means the seller is in a
 *     refund position.
 *
 * Period bounds use UTC. Quarter Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep,
 * Q4 = Oct-Dec. Monthly bounds are the calendar month containing the
 * reference date.
 */

import { prisma } from '@/lib/prisma';

export type VatPeriod = 'MONTHLY' | 'QUARTERLY';

export type VatReturnPreview = {
  period: VatPeriod;
  periodStart: Date;
  periodEnd: Date;
  outputVatKobo: number;
  inputVatKobo: number;
  netVatKobo: number;
  invoiceCount: number;
  expenseCount: number;
};

const ACTIVE_INVOICE_STATUSES = [
  'PAID',
  'PARTIALLY_PAID',
  'SENT',
  'VIEWED',
  'OVERDUE',
] as const;

/** Calendar-month bounds in UTC for the month containing `date`. */
export function monthBounds(date: Date): { periodStart: Date; periodEnd: Date } {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const periodStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  // Last day of the month at 23:59:59.999 UTC.
  const periodEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { periodStart, periodEnd };
}

/**
 * Calendar-quarter bounds in UTC for the quarter containing `date`.
 *
 *   Q1: Jan 1 .. Mar 31
 *   Q2: Apr 1 .. Jun 30
 *   Q3: Jul 1 .. Sep 30
 *   Q4: Oct 1 .. Dec 31
 */
export function quarterBounds(date: Date): { periodStart: Date; periodEnd: Date } {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const qStartMonth = Math.floor(m / 3) * 3;
  const periodStart = new Date(Date.UTC(y, qStartMonth, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(y, qStartMonth + 3, 0, 23, 59, 59, 999));
  return { periodStart, periodEnd };
}

/** Human-readable label, e.g. "Q2 2025" or "May 2025". */
export function periodLabel(period: VatPeriod, periodStart: Date): string {
  if (period === 'QUARTERLY') {
    const q = Math.floor(periodStart.getUTCMonth() / 3) + 1;
    return `Q${q} ${periodStart.getUTCFullYear()}`;
  }
  const month = periodStart.toLocaleString('en-NG', {
    month: 'long',
    timeZone: 'UTC',
  });
  return `${month} ${periodStart.getUTCFullYear()}`;
}

function boundsFor(period: VatPeriod, referenceDate: Date) {
  return period === 'QUARTERLY'
    ? quarterBounds(referenceDate)
    : monthBounds(referenceDate);
}

export const vatReturnService = {
  /**
   * Pure read: compute what a return for this period would contain. Does
   * not write anything. Used by the preview pane in the UI before the
   * seller commits to generating a row.
   */
  async previewVatReturn(
    userId: string,
    period: VatPeriod,
    referenceDate: Date,
  ): Promise<VatReturnPreview> {
    const { periodStart, periodEnd } = boundsFor(period, referenceDate);

    const [invoiceAgg, expenseAgg] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          userId,
          vatApplied: true,
          status: { in: [...ACTIVE_INVOICE_STATUSES] },
          issuedAt: { gte: periodStart, lte: periodEnd },
        },
        _sum: { tax: true },
        _count: { _all: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          incurredOn: { gte: periodStart, lte: periodEnd },
        },
        _sum: { vatPaid: true },
        _count: { _all: true },
      }),
    ]);

    const outputVatKobo = invoiceAgg._sum.tax ?? 0;
    const inputVatKobo = expenseAgg._sum.vatPaid ?? 0;

    return {
      period,
      periodStart,
      periodEnd,
      outputVatKobo,
      inputVatKobo,
      netVatKobo: outputVatKobo - inputVatKobo,
      invoiceCount: invoiceAgg._count._all,
      expenseCount: expenseAgg._count._all,
    };
  },

  /**
   * Compute and persist a VatReturn for the period containing
   * `referenceDate`. Idempotent on (userId, periodStart, periodEnd):
   *
   *   - If no row exists, create a DRAFT.
   *   - If a DRAFT exists, refresh its totals.
   *   - If a FILED row exists, refuse with a CONFLICT error so a filed
   *     return is never silently rewritten.
   */
  async generateVatReturn(
    userId: string,
    period: VatPeriod,
    referenceDate: Date,
  ) {
    const preview = await this.previewVatReturn(userId, period, referenceDate);

    const existing = await prisma.vatReturn.findUnique({
      where: {
        userId_periodStart_periodEnd: {
          userId,
          periodStart: preview.periodStart,
          periodEnd: preview.periodEnd,
        },
      },
    });

    if (existing && existing.status === 'FILED') {
      const err: any = new Error(
        'This period has already been filed. Filed returns are read-only.',
      );
      err.code = 'CONFLICT';
      throw err;
    }

    if (existing) {
      return prisma.vatReturn.update({
        where: { id: existing.id },
        data: {
          period: preview.period,
          outputVatKobo: preview.outputVatKobo,
          inputVatKobo: preview.inputVatKobo,
          netVatKobo: preview.netVatKobo,
          invoiceCount: preview.invoiceCount,
          expenseCount: preview.expenseCount,
        },
      });
    }

    return prisma.vatReturn.create({
      data: {
        userId,
        period: preview.period,
        periodStart: preview.periodStart,
        periodEnd: preview.periodEnd,
        outputVatKobo: preview.outputVatKobo,
        inputVatKobo: preview.inputVatKobo,
        netVatKobo: preview.netVatKobo,
        invoiceCount: preview.invoiceCount,
        expenseCount: preview.expenseCount,
        status: 'DRAFT',
      },
    });
  },

  /**
   * Lock a return as FILED. Once filed it will not be regenerated by the
   * idempotent path above. The seller can paste a FIRS reference number
   * for their own records (it's not validated here, FIRS API integration
   * comes in Phase 2).
   */
  async markFiled(returnId: string, userId: string, firsReference?: string) {
    const row = await prisma.vatReturn.findFirst({
      where: { id: returnId, userId },
    });
    if (!row) {
      const err: any = new Error('VAT return not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (row.status === 'FILED') return row;
    return prisma.vatReturn.update({
      where: { id: row.id },
      data: {
        status: 'FILED',
        filedAt: new Date(),
        filedBy: userId,
        firsReference: firsReference?.trim() || null,
      },
    });
  },

  /** Owner-scoped list, sorted desc by periodStart. */
  async listVatReturns(userId: string) {
    return prisma.vatReturn.findMany({
      where: { userId },
      orderBy: { periodStart: 'desc' },
      take: 100,
    });
  },

  /**
   * Owner-scoped fetch with the contributing invoice + expense rows. Used
   * by the detail page and the PDF/CSV builders. Returns null when the
   * row isn't owned by the user.
   */
  async getVatReturn(returnId: string, userId: string) {
    const row = await prisma.vatReturn.findFirst({
      where: { id: returnId, userId },
    });
    if (!row) return null;

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          userId,
          vatApplied: true,
          status: { in: [...ACTIVE_INVOICE_STATUSES] },
          issuedAt: { gte: row.periodStart, lte: row.periodEnd },
        },
        orderBy: { issuedAt: 'desc' },
        take: 500,
        select: {
          id: true,
          invoiceNumber: true,
          issuedAt: true,
          customerName: true,
          subtotal: true,
          tax: true,
          total: true,
          vatRate: true,
          status: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          incurredOn: { gte: row.periodStart, lte: row.periodEnd },
        },
        orderBy: { incurredOn: 'desc' },
        take: 500,
        select: {
          id: true,
          incurredOn: true,
          category: true,
          vendor: true,
          note: true,
          amount: true,
          vatPaid: true,
        },
      }),
    ]);

    return { vatReturn: row, invoices, expenses };
  },

  /**
   * Build a flat CSV the accountant can paste into Excel. Two stacked
   * sections: invoice lines (output VAT), then a blank row, then expense
   * lines (input VAT). All money figures are in naira (kobo divided by 100).
   */
  buildCsv(args: {
    vatReturn: {
      period: string;
      periodStart: Date;
      periodEnd: Date;
      outputVatKobo: number;
      inputVatKobo: number;
      netVatKobo: number;
    };
    invoices: {
      invoiceNumber: string;
      issuedAt: Date;
      customerName: string;
      subtotal: number;
      tax: number;
      total: number;
      status: string;
    }[];
    expenses: {
      incurredOn: Date;
      category: string;
      vendor: string | null;
      note: string | null;
      amount: number;
      vatPaid: number;
    }[];
  }): string {
    const escape = (raw: unknown): string => {
      if (raw === null || raw === undefined) return '';
      const s = String(raw);
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const naira = (k: number) => Math.round(k / 100).toString();
    const toIso = (d: Date) => new Date(d).toISOString().slice(0, 10);

    const lines: string[] = [];
    lines.push(
      ['Section', 'Period', 'PeriodStart', 'PeriodEnd', 'OutputVAT_NGN', 'InputVAT_NGN', 'NetVAT_NGN']
        .map(escape)
        .join(','),
    );
    lines.push(
      [
        'SUMMARY',
        args.vatReturn.period,
        toIso(args.vatReturn.periodStart),
        toIso(args.vatReturn.periodEnd),
        naira(args.vatReturn.outputVatKobo),
        naira(args.vatReturn.inputVatKobo),
        naira(args.vatReturn.netVatKobo),
      ]
        .map(escape)
        .join(','),
    );
    lines.push('');
    lines.push(
      ['InvoiceNumber', 'IssuedAt', 'Customer', 'Status', 'Subtotal_NGN', 'VAT_NGN', 'Total_NGN']
        .map(escape)
        .join(','),
    );
    for (const inv of args.invoices) {
      lines.push(
        [
          inv.invoiceNumber,
          toIso(inv.issuedAt),
          inv.customerName,
          inv.status,
          naira(inv.subtotal),
          naira(inv.tax),
          naira(inv.total),
        ]
          .map(escape)
          .join(','),
      );
    }
    lines.push('');
    lines.push(
      ['ExpenseDate', 'Category', 'Vendor', 'Note', 'Amount_NGN', 'VATPaid_NGN']
        .map(escape)
        .join(','),
    );
    for (const ex of args.expenses) {
      lines.push(
        [
          toIso(ex.incurredOn),
          ex.category,
          ex.vendor ?? '',
          ex.note ?? '',
          naira(ex.amount),
          naira(ex.vatPaid),
        ]
          .map(escape)
          .join(','),
      );
    }
    return lines.join('\n');
  },
};
