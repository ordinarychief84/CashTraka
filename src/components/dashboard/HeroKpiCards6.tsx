import Link from 'next/link';
import {
  ShoppingBag,
  Factory,
  AlertTriangle,
  TrendingUp,
  FileText,
  Truck,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The 6-card KPI strip across the top of the dashboard.
 *
 * Each tile:
 *   - small uppercase label
 *   - big black number
 *   - delta line (green up / red down + "vs last week")
 *   - colored icon block in the top-right corner
 *
 * Trends are computed as week-over-week deltas. Click-through goes to
 * the list page the metric represents.
 */

type Tile = {
  label: string;
  value: string;
  delta: number | null;
  deltaLabel: string;
  href: string;
  Icon: LucideIcon;
  iconTone: 'brand' | 'success' | 'owed' | 'rose' | 'slate';
  /** When true, a downward delta is GOOD (e.g. fewer shortages). */
  invertDelta?: boolean;
};

const ICON_BG: Record<Tile['iconTone'], string> = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-100 text-success-700',
  owed: 'bg-owed-50 text-owed-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-700',
};

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function HeroKpiCards6({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const [
    ordersPending,
    ordersPendingPrev,
    productionInProgress,
    productionInProgressPrev,
    lowMaterials,
    revenueThisWeek,
    revenuePrevWeek,
    outstandingInvoices,
    outstandingPrevWeek,
    purchaseOrdersPending,
    purchaseOrdersDueToday,
  ] = await Promise.all([
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED'] },
        createdAt: { gte: weekStart },
      },
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED'] },
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
    inventoryService.computeLowStockMaterials(userId).then((r) => r.length),
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
    prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      _sum: { total: true, amountPaid: true },
    }),
    prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
      _sum: { total: true, amountPaid: true },
    }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        expectedAt: { gte: today, lt: endOfToday },
      },
    }),
  ]);

  const weekRevenueKobo = revenueThisWeek._sum.amountKobo ?? 0;
  const prevWeekRevenueKobo = revenuePrevWeek._sum.amountKobo ?? 0;
  const outstandingKobo =
    (outstandingInvoices._sum.total ?? 0) -
    (outstandingInvoices._sum.amountPaid ?? 0);
  const prevOutstandingKobo =
    (outstandingPrevWeek._sum.total ?? 0) -
    (outstandingPrevWeek._sum.amountPaid ?? 0);

  const tiles: Tile[] = [
    {
      label: 'Orders Pending',
      value: String(ordersPending),
      delta: pctDelta(ordersPending, ordersPendingPrev),
      deltaLabel: 'vs last week',
      href: '/orders?status=NEW',
      Icon: ShoppingBag,
      iconTone: 'brand',
    },
    {
      label: 'Production In Progress',
      value: String(productionInProgress),
      delta: pctDelta(productionInProgress, productionInProgressPrev),
      deltaLabel: 'vs last week',
      href: '/production?status=IN_PRODUCTION',
      Icon: Factory,
      iconTone: 'success',
    },
    {
      label: 'Low Materials',
      value: String(lowMaterials),
      delta: null,
      deltaLabel: 'vs last week',
      href: '/materials',
      Icon: AlertTriangle,
      iconTone: 'owed',
      invertDelta: true,
    },
    {
      label: 'Revenue This Week',
      value: formatKobo(weekRevenueKobo),
      delta: pctDelta(weekRevenueKobo, prevWeekRevenueKobo),
      deltaLabel: 'vs last week',
      href: '/reports',
      Icon: TrendingUp,
      iconTone: 'brand',
    },
    {
      label: 'Outstanding Invoices',
      value: formatKobo(outstandingKobo),
      delta: pctDelta(outstandingKobo, prevOutstandingKobo),
      deltaLabel: 'vs last week',
      href: '/invoices',
      Icon: FileText,
      iconTone: 'rose',
      invertDelta: true,
    },
    {
      label: 'Purchase Orders',
      value: String(purchaseOrdersPending),
      delta: null,
      deltaLabel:
        purchaseOrdersDueToday > 0
          ? `${purchaseOrdersDueToday} due today`
          : 'No PO due today',
      href: '/purchase-orders',
      Icon: Truck,
      iconTone: 'brand',
    },
  ];

  return (
    <section className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className="group rounded-2xl border border-border bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {t.label}
              </div>
              <div className="num mt-2 truncate text-2xl font-black text-ink">
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
          <DeltaLine
            delta={t.delta}
            label={t.deltaLabel}
            invert={t.invertDelta}
          />
        </Link>
      ))}
    </section>
  );
}

function DeltaLine({
  delta,
  label,
  invert,
}: {
  delta: number | null;
  label: string;
  invert?: boolean;
}) {
  if (delta === null) {
    return (
      <div className="mt-2 text-[11px] text-slate-500">{label}</div>
    );
  }
  // When delta is positive, normally that's "good" (up arrow, green).
  // For metrics where "less is more" (shortages, outstanding), invert
  // the colour mapping so a negative delta reads as green.
  const isPositiveDirection = invert ? delta < 0 : delta > 0;
  const Arrow = delta >= 0 ? ArrowUp : ArrowDown;
  const tone = isPositiveDirection ? 'text-success-700' : 'text-rose-600';
  return (
    <div className={cn('mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold', tone)}>
      <Arrow size={11} />
      {Math.abs(delta)}% {label}
    </div>
  );
}
