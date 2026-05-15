import {
  Layers,
  CalendarDays,
  Factory,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  Package,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

/**
 * 7 KPI tiles across the top of /production. Each tile is a count of
 * ProductionOrder rows in a single status, plus a "Output This Week"
 * tile that sums the quantity completed in the last 7 days.
 */
export async function ProductionHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    total,
    totalPrev,
    planned,
    plannedPrev,
    inProduction,
    inProductionPrev,
    completed,
    completedPrev,
    delayed,
    delayedPrev,
    cancelled,
    cancelledPrev,
    outputThisWeek,
    outputPrevWeek,
  ] = await Promise.all([
    prisma.productionOrder.count({ where: { userId, deletedAt: null } }),
    prisma.productionOrder.count({
      where: { userId, deletedAt: null, createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.productionOrder.count({
      where: { userId, deletedAt: null, status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE'] } },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE'] },
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.productionOrder.count({
      where: { userId, deletedAt: null, status: 'IN_PRODUCTION' },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'IN_PRODUCTION',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.productionOrder.count({
      where: { userId, deletedAt: null, status: 'COMPLETED' },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.productionOrder.count({
      where: { userId, deletedAt: null, status: 'DELAYED' },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'DELAYED',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.productionOrder.count({
      where: { userId, deletedAt: null, status: 'CANCELLED' },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'CANCELLED',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.productionOrder.aggregate({
      where: {
        userId,
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: weekStart },
      },
      _sum: { quantityAccepted: true },
    }),
    prisma.productionOrder.aggregate({
      where: {
        userId,
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { quantityAccepted: true },
    }),
  ]);

  function pct(curr: number, p: number): number | null {
    if (p === 0) return curr > 0 ? 100 : null;
    return Math.round(((curr - p) / p) * 100);
  }

  const tiles: {
    label: string;
    value: string;
    delta: number | null;
    Icon: LucideIcon;
    iconTone: 'brand' | 'success' | 'owed' | 'rose' | 'slate';
  }[] = [
    {
      label: 'Total Production Orders',
      value: String(total),
      delta: pct(total, totalPrev),
      Icon: Layers,
      iconTone: 'brand',
    },
    {
      label: 'Planned',
      value: String(planned),
      delta: pct(planned, plannedPrev),
      Icon: CalendarDays,
      iconTone: 'slate',
    },
    {
      label: 'In Production',
      value: String(inProduction),
      delta: pct(inProduction, inProductionPrev),
      Icon: Factory,
      iconTone: 'brand',
    },
    {
      label: 'Completed',
      value: String(completed),
      delta: pct(completed, completedPrev),
      Icon: CheckCircle2,
      iconTone: 'success',
    },
    {
      label: 'Delayed',
      value: String(delayed),
      delta: pct(delayed, delayedPrev),
      Icon: AlertOctagon,
      iconTone: 'rose',
    },
    {
      label: 'Cancelled',
      value: String(cancelled),
      delta: pct(cancelled, cancelledPrev),
      Icon: XCircle,
      iconTone: 'slate',
    },
    {
      label: 'Output This Week',
      value:
        (outputThisWeek._sum.quantityAccepted ?? 0).toLocaleString('en-NG') + ' pcs',
      delta: pct(
        outputThisWeek._sum.quantityAccepted ?? 0,
        outputPrevWeek._sum.quantityAccepted ?? 0,
      ),
      Icon: Package,
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
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
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
          {t.delta !== null && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold',
                t.delta >= 0 ? 'text-success-700' : 'text-rose-600',
              )}
            >
              {t.delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {Math.abs(t.delta)}% vs last week
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
