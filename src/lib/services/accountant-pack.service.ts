/**
 * Year-end accountant pack, Tax+ tier feature.
 *
 * Aggregates every receipt, invoice, credit note, payment, expense and VAT
 * return for a single financial year (Jan 1 .. Dec 31, UTC). Returns a set
 * of CSV strings keyed by section name plus a `manifest.csv` that lists
 * the per-section row counts and totals.
 *
 * The route layer is responsible for zipping these into a single download.
 * Returning string blobs (not a stream) keeps this file pure and easy to
 * test, and the resulting payload is small enough for a year of data.
 */

import { prisma } from '@/lib/prisma';

type SellerYearPack = {
  manifest: string;
  csvs: Record<string, string>;
};

const escape = (raw: unknown): string => {
  if (raw === null || raw === undefined) return '';
  const s = String(raw);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const naira = (k: number) => Math.round(k / 100).toString();
const toIso = (d: Date) => new Date(d).toISOString();
const toIsoDate = (d: Date) => new Date(d).toISOString().slice(0, 10);

function csvFromRows(header: string[], rows: string[][]): string {
  return [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join(
    '\n',
  );
}

export const accountantPackService = {
  async generateYearEndPack(userId: string, year: number): Promise<SellerYearPack> {
    const periodStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const [
      receipts,
      invoices,
      creditNotes,
      payments,
      expenses,
      vatReturns,
    ] = await Promise.all([
      prisma.receipt.findMany({
        where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.invoice.findMany({
        where: { userId, issuedAt: { gte: periodStart, lte: periodEnd } },
        orderBy: { issuedAt: 'asc' },
      }),
      prisma.creditNote.findMany({
        where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
        include: {
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.payment.findMany({
        where: { userId, createdAt: { gte: periodStart, lte: periodEnd } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: { userId, incurredOn: { gte: periodStart, lte: periodEnd } },
        orderBy: { incurredOn: 'asc' },
      }),
      prisma.vatReturn.findMany({
        where: { userId, periodStart: { gte: periodStart, lte: periodEnd } },
        orderBy: { periodStart: 'asc' },
      }),
    ]);

    // ── Receipts ───────────────────────────────────────────────
    const receiptHeader = [
      'ReceiptId',
      'ReceiptNumber',
      'CreatedAt',
      'PaymentId',
      'BalanceRemaining_NGN',
      'Source',
      'Status',
    ];
    const receiptRows = receipts.map((r) => [
      r.id,
      r.receiptNumber,
      toIso(r.createdAt),
      r.paymentId ?? '',
      r.balanceRemaining != null ? naira(r.balanceRemaining) : '',
      r.source,
      r.status,
    ]);

    // ── Invoices ───────────────────────────────────────────────
    const invoiceHeader = [
      'InvoiceId',
      'InvoiceNumber',
      'IssuedAt',
      'DueDate',
      'Status',
      'CustomerName',
      'CustomerPhone',
      'BuyerTIN',
      'Subtotal_NGN',
      'Discount_NGN',
      'VATApplied',
      'VATRate',
      'VAT_NGN',
      'Total_NGN',
      'AmountPaid_NGN',
      'Currency',
      'FIRSStatus',
      'FIRSIRN',
    ];
    const invoiceRows = invoices.map((it) => [
      it.id,
      it.invoiceNumber,
      toIso(it.issuedAt),
      it.dueDate ? toIso(it.dueDate) : '',
      it.status,
      it.customerName,
      it.customerPhone,
      it.buyerTin ?? '',
      naira(it.subtotal),
      naira(it.discount),
      it.vatApplied ? 'true' : 'false',
      String(it.vatRate ?? 0),
      naira(it.tax),
      naira(it.total),
      naira(it.amountPaid),
      it.currency,
      it.firsStatus ?? '',
      it.firsIrn ?? '',
    ]);

    // Status counts for the manifest narrative.
    const invoiceStatusCounts: Record<string, number> = {};
    for (const it of invoices) {
      invoiceStatusCounts[it.status] = (invoiceStatusCounts[it.status] ?? 0) + 1;
    }

    // ── Credit notes ───────────────────────────────────────────
    const creditNoteHeader = [
      'CreditNoteId',
      'CreditNoteNumber',
      'CreatedAt',
      'SourceInvoice',
      'Reason',
      'Subtotal_NGN',
      'Tax_NGN',
      'Total_NGN',
    ];
    const creditNoteRows = creditNotes.map((cn) => [
      cn.id,
      cn.creditNoteNumber,
      toIso(cn.createdAt),
      cn.invoice?.invoiceNumber ?? '',
      cn.reason ?? '',
      naira(cn.subtotal),
      naira(cn.taxAmount),
      naira(cn.total),
    ]);

    // ── Payments ───────────────────────────────────────────────
    const paymentHeader = [
      'PaymentId',
      'CreatedAt',
      'CustomerName',
      'CustomerPhone',
      'Amount_NGN',
      'Status',
      'ReferenceCode',
      'Provider',
      'InvoiceId',
      'Verified',
    ];
    const paymentRows = payments.map((p) => [
      p.id,
      toIso(p.createdAt),
      p.customerNameSnapshot,
      p.phoneSnapshot,
      naira(p.amount),
      p.status,
      p.referenceCode ?? '',
      p.provider ?? '',
      p.invoiceId ?? '',
      p.verified ? 'true' : 'false',
    ]);

    // ── Expenses ───────────────────────────────────────────────
    const expenseHeader = [
      'ExpenseId',
      'IncurredOn',
      'Category',
      'Vendor',
      'Note',
      'Kind',
      'PaymentMethod',
      'Amount_NGN',
      'VATPaid_NGN',
      'TaxDeductible',
    ];
    const expenseRows = expenses.map((ex) => [
      ex.id,
      toIsoDate(ex.incurredOn),
      ex.category,
      ex.vendor ?? '',
      ex.note ?? '',
      ex.kind,
      ex.paymentMethod ?? '',
      naira(ex.amount),
      naira(ex.vatPaid),
      ex.taxDeductible ? 'true' : 'false',
    ]);

    // ── VAT returns ────────────────────────────────────────────
    const vatReturnHeader = [
      'VatReturnId',
      'Period',
      'PeriodStart',
      'PeriodEnd',
      'Status',
      'OutputVAT_NGN',
      'InputVAT_NGN',
      'NetVAT_NGN',
      'InvoiceCount',
      'ExpenseCount',
      'FIRSReference',
      'FiledAt',
    ];
    const vatReturnRows = vatReturns.map((vr) => [
      vr.id,
      vr.period,
      toIsoDate(vr.periodStart),
      toIsoDate(vr.periodEnd),
      vr.status,
      naira(vr.outputVatKobo),
      naira(vr.inputVatKobo),
      naira(vr.netVatKobo),
      String(vr.invoiceCount),
      String(vr.expenseCount),
      vr.firsReference ?? '',
      vr.filedAt ? toIso(vr.filedAt) : '',
    ]);

    // ── Totals ─────────────────────────────────────────────────
    const totalRevenue = invoices.reduce((s, it) => s + (it.total ?? 0), 0);
    const totalPayments = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const totalExpense = expenses.reduce((s, ex) => s + ex.amount, 0);
    const totalVatOut = invoices.reduce(
      (s, it) => s + (it.vatApplied ? it.tax : 0),
      0,
    );
    const totalVatIn = expenses.reduce((s, ex) => s + ex.vatPaid, 0);

    // ── Manifest ───────────────────────────────────────────────
    const manifestHeader = ['Section', 'Rows', 'Total_NGN'];
    const manifestRows: string[][] = [
      ['receipts.csv', String(receipts.length), ''],
      ['invoices.csv', String(invoices.length), naira(totalRevenue)],
      ['credit-notes.csv', String(creditNotes.length), ''],
      ['payments.csv', String(payments.length), naira(totalPayments)],
      ['expenses.csv', String(expenses.length), naira(totalExpense)],
      ['vat-returns.csv', String(vatReturns.length), ''],
      ['', '', ''],
      ['Total output VAT', '', naira(totalVatOut)],
      ['Total input VAT', '', naira(totalVatIn)],
      ['Net VAT', '', naira(totalVatOut - totalVatIn)],
      ['', '', ''],
      ['Year', String(year), ''],
      ['Generated', toIso(new Date()), ''],
    ];
    for (const [status, count] of Object.entries(invoiceStatusCounts)) {
      manifestRows.push([`Invoices ${status}`, String(count), '']);
    }
    const manifest = csvFromRows(manifestHeader, manifestRows);

    return {
      manifest,
      csvs: {
        'receipts.csv': csvFromRows(receiptHeader, receiptRows),
        'invoices.csv': csvFromRows(invoiceHeader, invoiceRows),
        'credit-notes.csv': csvFromRows(creditNoteHeader, creditNoteRows),
        'payments.csv': csvFromRows(paymentHeader, paymentRows),
        'expenses.csv': csvFromRows(expenseHeader, expenseRows),
        'vat-returns.csv': csvFromRows(vatReturnHeader, vatReturnRows),
      },
    };
  },
};
