import {
  Users,
  UserCheck,
  UserPlus,
  Coins,
  Wallet,
  Receipt,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 6 KPI tiles across the top of /customers:
 *   Total Customers · Active Customers · New Customers (This Week) ·
 *   Total Sales (This Week) · Outstanding Receivables · Avg Order Value
 *
 * "Active" = lastActivityAt within the last 30 days.
 */
export async function CustomersHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const activeThreshold = new Date(now);
  activeThreshold.setDate(activeThreshold.getDate() - 30);

  const [
    total,
    active,
    newThisWeek,
    newPrevWeek,
    salesThisWeek,
    salesPrevWeek,
    outstandingRows,
    paymentCountThisWeek,
  ] = await Promise.all([
    prisma.customer.count({ where: { userId } }),
    prisma.customer.count({
      where: { userId, lastActivityAt: { gte: activeThreshold } },
    }),
    prisma.customer.count({
      where: { userId, createdAt: { gte: weekStart } },
    }),
    prisma.customer.count({
      where: { userId, createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
      _sum: { amountKobo: true },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { amountKobo: true },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: {
          in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      select: { totalKobo: true, amountPaidKobo: true },
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
      _avg: { amountKobo: true },
    }),
  ]);

  const salesKobo = salesThisWeek._sum.amountKobo ?? 0;
  const prevSalesKobo = salesPrevWeek._sum.amountKobo ?? 0;
  const outstandingKobo = outstandingRows.reduce(
    (s, i) => s + Math.max(0, i.totalKobo - i.amountPaidKobo),
    0,
  );
  const avgOrderKobo = paymentCountThisWeek._avg.amountKobo ?? 0;

  const pctDelta = (cur: number, prev: number): number | null => {
    if (prev === 0) return null;
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
      label: 'Total Customers',
      value: total.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'all time',
      Icon: Users,
      iconTone: 'brand',
    },
    {
      label: 'Active Customers',
      value: active.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: `${total > 0 ? Math.round((active / total) * 100) : 0}% of all`,
      Icon: UserCheck,
      iconTone: 'success',
    },
    {
      label: 'New Customers (This Week)',
      value: newThisWeek.toLocaleString('en-NG'),
      delta: pctDelta(newThisWeek, newPrevWeek),
      deltaLabel: 'vs last week',
      Icon: UserPlus,
      iconTone: 'brand',
    },
    {
      label: 'Total Sales (This Week)',
      value: formatKobo(salesKobo),
      delta: pctDelta(salesKobo, prevSalesKobo),
      deltaLabel: 'vs last week',
      Icon: Coins,
      iconTone: 'success',
    },
    {
      label: 'Outstanding Receivables',
      value: formatKobo(outstandingKobo),
      delta: null,
      deltaLabel: 'cash awaiting',
      Icon: Wallet,
      iconTone: 'rose',
      invert: true,
    },
    {
      label: 'Avg Order Value',
      value: formatKobo(Math.round(avgOrderKobo)),
      delta: null,
      deltaLabel: 'this week',
      Icon: Receipt,
      iconTone: 'brand',
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
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-border bg-white p-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {t.label}
              </div>
              <div className="num mt-2 truncate text-xl font-black text-ink">
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
