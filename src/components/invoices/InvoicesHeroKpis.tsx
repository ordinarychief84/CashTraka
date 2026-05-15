import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Coins,
  Wallet,
  Banknote,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 7 KPI tiles across the top of /invoices:
 *   Total · Paid · Outstanding · Overdue ·
 *   Total Invoiced This Week · Total Received This Week · Outstanding Amount
 */
export async function InvoicesHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const liveStatuses = ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'];

  const [
    total,
    paid,
    outstandingRows,
    overdueRows,
    invoicedThisWeek,
    invoicedPrevWeek,
    receivedThisWeek,
    receivedPrevWeek,
  ] = await Promise.all([
    prisma.invoice.count({
      where: { userId, status: { in: liveStatuses } },
    }),
    prisma.invoice.count({
      where: { userId, status: 'PAID' },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: { totalKobo: true, amountPaidKobo: true, dueDate: true },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { lt: now },
      },
      select: { totalKobo: true, amountPaidKobo: true },
    }),
    prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: liveStatuses },
        createdAt: { gte: weekStart },
      },
      _sum: { totalKobo: true },
    }),
    prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: liveStatuses },
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { totalKobo: true },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
        invoiceId: { not: null },
        createdAt: { gte: weekStart },
      },
      _sum: { amountKobo: true },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
        invoiceId: { not: null },
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { amountKobo: true },
    }),
  ]);

  const outstandingCount = outstandingRows.filter(
    (i) => i.totalKobo - i.amountPaidKobo > 0,
  ).length;
  const outstandingAmount = outstandingRows.reduce(
    (s, i) => s + Math.max(0, i.totalKobo - i.amountPaidKobo),
    0,
  );
  const overdueCount = overdueRows.filter(
    (i) => i.totalKobo - i.amountPaidKobo > 0,
  ).length;

  const invoicedKobo = invoicedThisWeek._sum.totalKobo ?? 0;
  const prevInvoicedKobo = invoicedPrevWeek._sum.totalKobo ?? 0;
  const receivedKobo = receivedThisWeek._sum.amountKobo ?? 0;
  const prevReceivedKobo = receivedPrevWeek._sum.amountKobo ?? 0;

  const pctDelta = (cur: number, prev: number): number | null => {
    if (prev === 0) return cur === 0 ? null : null;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const tiles: {
    label: string;
    value: string;
    delta: number | null;
    deltaLabel: string;
    Icon: LucideIcon;
    iconTone: 'brand' | 'success' | 'owed' | 'rose' | 'slate';
    invert?: boolean;
  }[] = [
    {
      label: 'Total Invoices',
      value: total.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'live invoices',
      Icon: FileText,
      iconTone: 'brand',
    },
    {
      label: 'Paid',
      value: paid.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: `${total > 0 ? Math.round((paid / total) * 100) : 0}% of total`,
      Icon: CheckCircle2,
      iconTone: 'success',
    },
    {
      label: 'Outstanding',
      value: outstandingCount.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'awaiting payment',
      Icon: Clock,
      iconTone: 'owed',
      invert: true,
    },
    {
      label: 'Overdue',
      value: overdueCount.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'past due date',
      Icon: AlertTriangle,
      iconTone: 'rose',
      invert: true,
    },
    {
      label: 'Total Invoiced This Week',
      value: formatKobo(invoicedKobo),
      delta: pctDelta(invoicedKobo, prevInvoicedKobo),
      deltaLabel: 'vs last week',
      Icon: Coins,
      iconTone: 'brand',
    },
    {
      label: 'Total Received This Week',
      value: formatKobo(receivedKobo),
      delta: pctDelta(receivedKobo, prevReceivedKobo),
      deltaLabel: 'vs last week',
      Icon: Banknote,
      iconTone: 'success',
    },
    {
      label: 'Outstanding Amount',
      value: formatKobo(outstandingAmount),
      delta: null,
      deltaLabel: 'cash awaiting',
      Icon: Wallet,
      iconTone: 'rose',
      invert: true,
    },
  ];

  const ICON_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    owed: 'bg-owed-50 text-owed-700',
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-border bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {t.label}
              </div>
              <div className="num mt-2 truncate text-[26px] font-black leading-tight text-ink md:text-[28px]">
                {t.value}
              </div>
            </div>
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                ICON_BG[t.iconTone],
              )}
            >
              <t.Icon size={16} />
            </span>
          </div>
          {t.delta !== null ? (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold',
                (t.invert ? t.delta < 0 : t.delta >= 0)
                  ? 'text-success-700'
                  : 'text-rose-600',
              )}
            >
              {t.delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {Math.abs(t.delta)}% {t.deltaLabel}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-500">{t.deltaLabel}</div>
          )}
        </div>
      ))}
    </section>
  );
}
