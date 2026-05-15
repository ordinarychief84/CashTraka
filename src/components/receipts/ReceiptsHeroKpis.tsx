import {
  Receipt as ReceiptIcon,
  Coins,
  CalendarDays,
  Sun,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 6 KPI tiles across the top of /receipts:
 *   Total Receipts · Total Received · This Week · Today · Pending · Avg Receipt Value
 *
 * "Pending" = receipts that originated from a partial payment (balanceRemainingKobo > 0).
 * Amounts come from the receipt's linked Payment.amountKobo (Debt fallback handled
 * by the table; KPI aggregates use linked Payment amounts only for accuracy).
 */
export async function ReceiptsHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    total,
    pending,
    receivedAllTime,
    receivedThisWeek,
    receivedPrevWeek,
    receivedToday,
  ] = await Promise.all([
    prisma.receipt.count({ where: { userId } }),
    prisma.receipt.count({
      where: { userId, balanceRemainingKobo: { gt: 0 } },
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'PAID' },
      _sum: { amountKobo: true },
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
      _sum: { amountKobo: true },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { amountKobo: true },
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'PAID', createdAt: { gte: todayStart } },
      _sum: { amountKobo: true },
    }),
  ]);

  const allTimeKobo = receivedAllTime._sum.amountKobo ?? 0;
  const weekKobo = receivedThisWeek._sum.amountKobo ?? 0;
  const prevWeekKobo = receivedPrevWeek._sum.amountKobo ?? 0;
  const todayKobo = receivedToday._sum.amountKobo ?? 0;
  const avgKobo = total > 0 ? Math.round(allTimeKobo / total) : 0;

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
      label: 'Total Receipts',
      value: total.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'all time',
      Icon: ReceiptIcon,
      iconTone: 'brand',
    },
    {
      label: 'Total Received',
      value: formatKobo(allTimeKobo),
      delta: null,
      deltaLabel: 'cash collected',
      Icon: Coins,
      iconTone: 'success',
    },
    {
      label: 'This Week',
      value: formatKobo(weekKobo),
      delta: pctDelta(weekKobo, prevWeekKobo),
      deltaLabel: 'vs last week',
      Icon: CalendarDays,
      iconTone: 'brand',
    },
    {
      label: 'Today',
      value: formatKobo(todayKobo),
      delta: null,
      deltaLabel: 'cleared today',
      Icon: Sun,
      iconTone: 'success',
    },
    {
      label: 'Pending',
      value: pending.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'partial payments',
      Icon: Clock,
      iconTone: 'owed',
      invert: true,
    },
    {
      label: 'Avg Receipt Value',
      value: formatKobo(avgKobo),
      delta: null,
      deltaLabel: 'per receipt',
      Icon: TrendingUp,
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
