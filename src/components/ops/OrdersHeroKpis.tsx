import {
  ShoppingBag,
  Clock,
  Factory,
  Truck,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

/**
 * 5 KPI tiles across the top of /orders. Counts every CustomerOrder by
 * lifecycle status, with a week-over-week delta line under each number.
 */
export async function OrdersHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    total,
    totalPrev,
    pending,
    pendingPrev,
    inProduction,
    inProductionPrev,
    ready,
    readyPrev,
    delivered,
    deliveredPrev,
  ] = await Promise.all([
    prisma.customerOrder.count({ where: { userId, deletedAt: null } }),
    prisma.customerOrder.count({
      where: { userId, deletedAt: null, createdAt: { gte: prevWeekStart, lt: weekStart } },
    }),
    prisma.customerOrder.count({
      where: { userId, deletedAt: null, status: { in: ['NEW', 'CONFIRMED'] } },
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED'] },
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.customerOrder.count({
      where: { userId, deletedAt: null, status: 'IN_PRODUCTION' },
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'IN_PRODUCTION',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.customerOrder.count({
      where: { userId, deletedAt: null, status: 'READY' },
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'READY',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.customerOrder.count({
      where: { userId, deletedAt: null, status: 'DELIVERED' },
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'DELIVERED',
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
  ]);

  function pct(curr: number, prev: number): number | null {
    if (prev === 0) return curr > 0 ? 100 : null;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const tiles: {
    label: string;
    value: number;
    delta: number | null;
    Icon: LucideIcon;
    iconTone: 'brand' | 'owed' | 'success' | 'rose';
  }[] = [
    {
      label: 'Total Orders',
      value: total,
      delta: pct(total, totalPrev),
      Icon: ShoppingBag,
      iconTone: 'brand',
    },
    {
      label: 'Pending Orders',
      value: pending,
      delta: pct(pending, pendingPrev),
      Icon: Clock,
      iconTone: 'owed',
    },
    {
      label: 'In Production',
      value: inProduction,
      delta: pct(inProduction, inProductionPrev),
      Icon: Factory,
      iconTone: 'success',
    },
    {
      label: 'Ready to Deliver',
      value: ready,
      delta: pct(ready, readyPrev),
      Icon: Truck,
      iconTone: 'brand',
    },
    {
      label: 'Delivered',
      value: delivered,
      delta: pct(delivered, deliveredPrev),
      Icon: CheckCircle2,
      iconTone: 'success',
    },
  ];

  const ICON_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    owed: 'bg-owed-50 text-owed-700',
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
              <div className="num mt-2 text-2xl font-black text-ink">
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
