import {
  FileText,
  Clock,
  PackageCheck,
  CheckCircle2,
  Coins,
  Wallet,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 6 KPI tiles across the top of /purchase-orders:
 *   Total POs · Pending · Partially Received · Fully Received ·
 *   Total Spent This Week · Total Due
 */
export async function PurchasesHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    total,
    pending,
    partial,
    received,
    spentThisWeek,
    spentPrevWeek,
    totalDue,
    receivedThisWeek,
    receivedPrevWeek,
    pendingPrevWeek,
  ] = await Promise.all([
    prisma.purchaseOrder.count({ where: { userId, deletedAt: null } }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['DRAFT', 'SENT', 'ORDERED'] },
      },
    }),
    prisma.purchaseOrder.count({
      where: { userId, deletedAt: null, status: 'PARTIALLY_RECEIVED' },
    }),
    prisma.purchaseOrder.count({
      where: { userId, deletedAt: null, status: 'RECEIVED' },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] },
        receivedAt: { gte: weekStart },
      },
      _sum: { totalKobo: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] },
        receivedAt: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { totalKobo: true },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
      _sum: { totalKobo: true, amountPaidKobo: true },
    }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'RECEIVED',
        receivedAt: { gte: weekStart },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'RECEIVED',
        receivedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['DRAFT', 'SENT', 'ORDERED'] },
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
  ]);

  const spentKobo = spentThisWeek._sum.totalKobo ?? 0;
  const prevSpentKobo = spentPrevWeek._sum.totalKobo ?? 0;
  const totalDueKobo =
    (totalDue._sum.totalKobo ?? 0) - (totalDue._sum.amountPaidKobo ?? 0);

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
      label: 'Total POs',
      value: total.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'all time',
      Icon: FileText,
      iconTone: 'brand',
    },
    {
      label: 'Pending',
      value: pending.toLocaleString('en-NG'),
      delta: pctDelta(pending, pendingPrevWeek),
      deltaLabel: 'vs last week',
      Icon: Clock,
      iconTone: 'owed',
      invert: true,
    },
    {
      label: 'Partially Received',
      value: partial.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'in progress',
      Icon: PackageCheck,
      iconTone: 'brand',
    },
    {
      label: 'Fully Received',
      value: received.toLocaleString('en-NG'),
      delta: pctDelta(receivedThisWeek, receivedPrevWeek),
      deltaLabel: 'vs last week',
      Icon: CheckCircle2,
      iconTone: 'success',
    },
    {
      label: 'Total Spent This Week',
      value: formatKobo(spentKobo),
      delta: pctDelta(spentKobo, prevSpentKobo),
      deltaLabel: 'vs last week',
      Icon: Coins,
      iconTone: 'brand',
    },
    {
      label: 'Total Due',
      value: formatKobo(totalDueKobo),
      delta: null,
      deltaLabel: 'unpaid balance',
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
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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
