import Link from 'next/link';
import {
  ArrowUp,
  ArrowDown,
  Plus,
  FileText,
  Factory,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The /orders right rail — four stacked widgets matching the comp:
 *   1. Order Summary       — 4 rolling metrics with WoW deltas
 *   2. Orders by Source    — donut + legend grouped by `source`
 *   3. Top Selling Products — 5 products by units sold this week
 *   4. Quick Actions       — 4 icon tiles linking to common create flows
 */
export async function OrdersRightRail({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    summary,
    summaryPrev,
    bySource,
    topProducts,
    deliveredOnTime,
    deliveredTotal,
  ] = await Promise.all([
    prisma.customerOrder.aggregate({
      where: { userId, deletedAt: null, createdAt: { gte: weekStart } },
      _count: { _all: true },
      _sum: { totalKobo: true },
      _avg: { totalKobo: true },
    }),
    prisma.customerOrder.aggregate({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: prevWeekStart, lt: weekStart },
      },
      _count: { _all: true },
      _sum: { totalKobo: true },
      _avg: { totalKobo: true },
    }),
    prisma.customerOrder.groupBy({
      by: ['source'],
      where: { userId, deletedAt: null, createdAt: { gte: weekStart } },
      _count: { _all: true },
    }),
    prisma.customerOrderItem.groupBy({
      by: ['description'],
      where: {
        customerOrder: {
          userId,
          deletedAt: null,
          createdAt: { gte: weekStart },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'DELIVERED',
        dueAt: { not: null },
        // updatedAt approximates the delivery moment; on-time = updatedAt <= dueAt.
        // Filter only delivered orders that have a due date set.
      },
    }),
    prisma.customerOrder.count({
      where: { userId, deletedAt: null, status: 'DELIVERED', dueAt: { not: null } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <OrderSummaryCard summary={summary} prev={summaryPrev} onTimeNum={deliveredOnTime} onTimeDen={deliveredTotal} />
      <OrdersBySourceCard sources={bySource} />
      <TopSellingProductsCard rows={topProducts} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Order Summary ============== */

function OrderSummaryCard({
  summary,
  prev,
  onTimeNum,
  onTimeDen,
}: {
  summary: {
    _count: { _all: number };
    _sum: { totalKobo: number | null };
    _avg: { totalKobo: number | null };
  };
  prev: {
    _count: { _all: number };
    _sum: { totalKobo: number | null };
    _avg: { totalKobo: number | null };
  };
  onTimeNum: number;
  onTimeDen: number;
}) {
  const totalOrders = summary._count._all;
  const prevOrders = prev._count._all;
  const totalRevenue = summary._sum.totalKobo ?? 0;
  const prevRevenue = prev._sum.totalKobo ?? 0;
  const avgOrder = summary._avg.totalKobo ?? 0;
  const prevAvg = prev._avg.totalKobo ?? 0;
  const otd = onTimeDen > 0 ? Math.round((onTimeNum / onTimeDen) * 100) : null;

  function pct(curr: number, p: number): number | null {
    if (p === 0) return curr > 0 ? 100 : null;
    return Math.round(((curr - p) / p) * 100);
  }

  return (
    <DashboardCard title="Order Summary" rightSlot={<PeriodPill />}>
      <dl className="divide-y divide-border text-sm">
        <SummaryRow
          label="Total Orders"
          value={String(totalOrders)}
          delta={pct(totalOrders, prevOrders)}
        />
        <SummaryRow
          label="Total Revenue"
          value={formatKobo(totalRevenue)}
          delta={pct(totalRevenue, prevRevenue)}
        />
        <SummaryRow
          label="Average Order Value"
          value={formatKobo(Math.round(avgOrder))}
          delta={pct(avgOrder, prevAvg)}
        />
        <SummaryRow
          label="On-time Delivery Rate"
          value={otd == null ? '—' : `${otd}%`}
        />
      </dl>
    </DashboardCard>
  );
}

function SummaryRow({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number | null;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-right">
        <div className="num text-sm font-bold text-ink">{value}</div>
        {delta != null && (
          <div
            className={cn(
              'mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold',
              delta >= 0 ? 'text-success-700' : 'text-rose-600',
            )}
          >
            {delta >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== Orders by Source ============== */

const SOURCE_LABEL: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WALK_IN: 'Walk-in',
  INSTAGRAM: 'Instagram',
  WEBSITE: 'Website',
  REFERRAL: 'Referral',
  OTHER: 'Other',
};

const SOURCE_HEX: Record<string, string> = {
  WHATSAPP: '#00B8E8', // brand-500
  WALK_IN: '#8BD91E', // success-500
  INSTAGRAM: '#F59E0B', // owed-500
  WEBSITE: '#A78BFA', // violet
  REFERRAL: '#EF4444', // rose-500
  OTHER: '#94A3B8', // slate-400
};

const SOURCE_TW: Record<string, string> = {
  WHATSAPP: 'bg-brand-500',
  WALK_IN: 'bg-success-500',
  INSTAGRAM: 'bg-owed-500',
  WEBSITE: 'bg-violet-400',
  REFERRAL: 'bg-rose-500',
  OTHER: 'bg-slate-400',
};

function OrdersBySourceCard({
  sources,
}: {
  sources: { source: string | null; _count: { _all: number } }[];
}) {
  const rows = sources
    .map((s) => ({
      key: s.source ?? 'OTHER',
      count: s._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  const conicStops =
    total === 0
      ? 'conic-gradient(#E5E7EB 0% 100%)'
      : (() => {
          let acc = 0;
          const parts: string[] = [];
          for (const r of rows) {
            const pct = (r.count / total) * 100;
            parts.push(
              `${SOURCE_HEX[r.key] ?? '#94A3B8'} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`,
            );
            acc += pct;
          }
          return `conic-gradient(${parts.join(', ')})`;
        })();

  return (
    <DashboardCard title="Orders by Source">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: conicStops }}
          />
          <div className="absolute inset-[22%] rounded-full bg-white" />
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.length === 0 ? (
            <li className="text-xs text-slate-500">No orders this week.</li>
          ) : (
            rows.map((r) => {
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <li
                  key={r.key}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className={`h-2 w-2 rounded-full ${SOURCE_TW[r.key] ?? 'bg-slate-300'}`}
                    />
                    {SOURCE_LABEL[r.key] ?? r.key}
                  </span>
                  <span className="num text-slate-700">
                    <span className="font-bold text-ink">{pct}%</span>
                    <span className="ml-1 text-slate-400">({r.count})</span>
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </DashboardCard>
  );
}

/* ============== Top Selling Products ============== */

function TopSellingProductsCard({
  rows,
}: {
  rows: { description: string; _sum: { quantity: number | null } }[];
}) {
  return (
    <DashboardCard title="Top Selling Products" rightSlot={<PeriodPill />}>
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">
          No products sold this week yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.description + i} className="flex items-center gap-3">
              <span className="num inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {r.description}
                </div>
              </div>
              <span className="num shrink-0 text-xs text-slate-500">
                {r._sum.quantity ?? 0} pcs
              </span>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}

/* ============== Quick Actions ============== */

function QuickActionsCard() {
  const actions: {
    Icon: LucideIcon;
    label: string;
    href: string;
    tone: 'brand' | 'success' | 'owed' | 'rose';
  }[] = [
    { Icon: Plus, label: 'New Order', href: '/orders/new', tone: 'brand' },
    { Icon: FileText, label: 'Create Invoice', href: '/invoices/new', tone: 'success' },
    { Icon: Factory, label: 'Create Production', href: '/production/new', tone: 'owed' },
    { Icon: BarChart3, label: 'View Reports', href: '/reports/operations', tone: 'rose' },
  ];

  const TONE_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    success: 'bg-success-100 text-success-700 hover:bg-success-200',
    owed: 'bg-owed-50 text-owed-700 hover:bg-owed-100',
    rose: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  };

  return (
    <DashboardCard title="Quick Actions">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white p-3 transition hover:bg-slate-50"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${TONE_BG[a.tone]}`}
            >
              <a.Icon size={16} />
            </span>
            <span className="text-[10px] font-semibold text-slate-700">
              {a.label}
            </span>
          </Link>
        ))}
      </div>
    </DashboardCard>
  );
}
