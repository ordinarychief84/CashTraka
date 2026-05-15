import {
  TrendingUp,
  TrendingDown,
  Coins,
  ShoppingBag,
  Truck,
  Boxes,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 6 KPI tiles across the top of /reports:
 *   Total Revenue · Total Cost · Gross Profit ·
 *   Total Orders · Total Purchases · Stock Value
 */
export async function ReportsHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    revenueThisWeek,
    revenuePrevWeek,
    costThisWeek,
    costPrevWeek,
    ordersThisWeek,
    ordersPrevWeek,
    purchasesThisWeek,
    purchasesPrevWeek,
    productStockRows,
    materialStockRows,
  ] = await Promise.all([
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
    prisma.expense.aggregate({
      where: {
        userId,
        kind: 'business',
        incurredOn: { gte: weekStart },
      },
      _sum: { amountKobo: true },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        kind: 'business',
        incurredOn: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { amountKobo: true },
    }),
    prisma.customerOrder.count({
      where: { userId, deletedAt: null, createdAt: { gte: weekStart } },
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.purchaseOrder.count({
      where: { userId, deletedAt: null, createdAt: { gte: weekStart } },
    }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),
    prisma.product.findMany({
      where: { userId, archived: false },
      select: { stock: true, costKobo: true, priceKobo: true },
    }),
    prisma.rawMaterial.findMany({
      where: { userId, deletedAt: null },
      select: { stock: true, unitCostKobo: true },
    }),
  ]);

  const revenueKobo = revenueThisWeek._sum.amountKobo ?? 0;
  const prevRevenueKobo = revenuePrevWeek._sum.amountKobo ?? 0;
  const costKobo = costThisWeek._sum.amountKobo ?? 0;
  const prevCostKobo = costPrevWeek._sum.amountKobo ?? 0;
  const grossProfitKobo = revenueKobo - costKobo;
  const prevGrossProfitKobo = prevRevenueKobo - prevCostKobo;

  const stockValueKobo =
    productStockRows.reduce(
      (s, p) => s + p.stock * (p.costKobo ?? p.priceKobo ?? 0),
      0,
    ) + materialStockRows.reduce((s, m) => s + m.stock * m.unitCostKobo, 0);

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
      label: 'Total Revenue',
      value: formatKobo(revenueKobo),
      delta: pctDelta(revenueKobo, prevRevenueKobo),
      deltaLabel: 'vs last week',
      Icon: TrendingUp,
      iconTone: 'success',
    },
    {
      label: 'Total Cost',
      value: formatKobo(costKobo),
      delta: pctDelta(costKobo, prevCostKobo),
      deltaLabel: 'vs last week',
      Icon: TrendingDown,
      iconTone: 'rose',
      invert: true,
    },
    {
      label: 'Gross Profit',
      value: formatKobo(grossProfitKobo),
      delta: pctDelta(grossProfitKobo, prevGrossProfitKobo),
      deltaLabel: 'vs last week',
      Icon: Coins,
      iconTone: 'success',
    },
    {
      label: 'Total Orders',
      value: ordersThisWeek.toLocaleString('en-NG'),
      delta: pctDelta(ordersThisWeek, ordersPrevWeek),
      deltaLabel: 'vs last week',
      Icon: ShoppingBag,
      iconTone: 'brand',
    },
    {
      label: 'Total Purchases',
      value: purchasesThisWeek.toLocaleString('en-NG'),
      delta: pctDelta(purchasesThisWeek, purchasesPrevWeek),
      deltaLabel: 'vs last week',
      Icon: Truck,
      iconTone: 'owed',
    },
    {
      label: 'Stock Value',
      value: formatKobo(stockValueKobo),
      delta: null,
      deltaLabel: 'at cost',
      Icon: Boxes,
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
