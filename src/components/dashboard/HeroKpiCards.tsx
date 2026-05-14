import Link from 'next/link';
import {
  ClipboardList,
  Factory,
  AlertTriangle,
  Receipt,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { shortageService } from '@/lib/services/shortage.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Hero KPI strip — four big primary numbers across the top of the
 * operational dashboard. Replaces the prior 8-card strip + the
 * legacy OpsDashboardCards block (which were duplicating each other).
 *
 * Each card is intentionally a single source-of-truth answer to one
 * question:
 *   1. "How much money came in this week?"   → Revenue (7d)
 *   2. "How much is still outstanding?"      → Outstanding invoices
 *   3. "What's coming through the door?"     → Open customer orders
 *   4. "What needs attention right now?"     → Risk score (shortages +
 *                                              delayed + low materials)
 *
 * Visual rules:
 *   - White card background by default; tinted only when the metric
 *     turns "needs attention"
 *   - One accent colour per card, applied to the icon and the number
 *   - Click-through to the relevant list page
 */

type KpiTone = 'neutral' | 'brand' | 'success' | 'owed' | 'rose';

const TONE_NUMBER: Record<KpiTone, string> = {
  neutral: 'text-ink',
  brand: 'text-brand-700',
  success: 'text-success-700',
  owed: 'text-owed-700',
  rose: 'text-rose-700',
};

const TONE_ICON_BG: Record<KpiTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-50 text-success-700',
  owed: 'bg-owed-50 text-owed-700',
  rose: 'bg-rose-50 text-rose-700',
};

const TONE_CARD: Record<KpiTone, string> = {
  neutral: 'bg-white border-border',
  brand: 'bg-white border-border',
  success: 'bg-white border-border',
  owed: 'bg-owed-50/40 border-owed-200',
  rose: 'bg-rose-50/40 border-rose-200',
};

export async function HeroKpiCards({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    revenueThisWeek,
    revenuePrevWeek,
    outstandingInvoices,
    openOrders,
    inProductionCount,
    shortageCount,
    lowMaterialsCount,
    delayedCount,
  ] = await Promise.all([
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
    prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      _sum: { total: true, amountPaid: true },
      _count: { _all: true },
    }),
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED'] },
      },
    }),
    prisma.productionOrder.count({
      where: { userId, deletedAt: null, status: 'IN_PRODUCTION' },
    }),
    shortageService.countOpenForUser(userId),
    inventoryService.computeLowStockMaterials(userId).then((r) => r.length),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { status: 'DELAYED' },
          {
            status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
            plannedEndAt: { lt: now },
          },
        ],
      },
    }),
  ]);

  const weekRevenueKobo = revenueThisWeek._sum.amountKobo ?? 0;
  const prevWeekKobo = revenuePrevWeek._sum.amountKobo ?? 0;
  const weekDelta =
    prevWeekKobo > 0
      ? Math.round(((weekRevenueKobo - prevWeekKobo) / prevWeekKobo) * 100)
      : null;

  const outstandingTotalKobo =
    (outstandingInvoices._sum.total ?? 0) -
    (outstandingInvoices._sum.amountPaid ?? 0);

  // Composite risk score — surfaces a single "needs attention" tile.
  const riskCount = shortageCount + lowMaterialsCount + delayedCount;
  const riskTone: KpiTone =
    riskCount === 0 ? 'success' : riskCount > 5 ? 'rose' : 'owed';

  const cards: Array<{
    label: string;
    value: string;
    sub?: string;
    href: string;
    Icon: LucideIcon;
    tone: KpiTone;
  }> = [
    {
      label: 'Revenue · 7 days',
      value: formatKobo(weekRevenueKobo),
      sub:
        revenueThisWeek._count._all > 0
          ? `${revenueThisWeek._count._all} payments${
              weekDelta !== null
                ? ` · ${weekDelta >= 0 ? '+' : ''}${weekDelta}% vs prev`
                : ''
            }`
          : 'No payments yet',
      href: '/payments',
      Icon: TrendingUp,
      tone: weekRevenueKobo > 0 ? 'success' : 'neutral',
    },
    {
      label: 'Outstanding',
      value: formatKobo(outstandingTotalKobo),
      sub:
        outstandingInvoices._count._all > 0
          ? `${outstandingInvoices._count._all} ${
              outstandingInvoices._count._all === 1 ? 'invoice' : 'invoices'
            } open`
          : 'All settled',
      href: '/invoices',
      Icon: Receipt,
      tone: outstandingTotalKobo > 0 ? 'owed' : 'neutral',
    },
    {
      label: 'Open orders',
      value: String(openOrders),
      sub:
        inProductionCount > 0
          ? `${inProductionCount} in production`
          : 'Waiting on production',
      href: '/orders?status=NEW',
      Icon: ClipboardList,
      tone: openOrders > 0 ? 'brand' : 'neutral',
    },
    {
      label: 'Needs attention',
      value: String(riskCount),
      sub:
        riskCount === 0
          ? 'All clear'
          : [
              shortageCount > 0 && `${shortageCount} shortage`,
              lowMaterialsCount > 0 && `${lowMaterialsCount} low stock`,
              delayedCount > 0 && `${delayedCount} delayed`,
            ]
              .filter(Boolean)
              .join(' · '),
      href: riskCount > 0 ? '/shortages' : '/production',
      Icon: AlertTriangle,
      tone: riskTone,
    },
  ];

  return (
    <section className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className={cn(
            'group relative rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md',
            TONE_CARD[c.tone],
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-xl',
                TONE_ICON_BG[c.tone],
              )}
            >
              <c.Icon size={16} />
            </span>
            <ArrowRight
              size={14}
              className="mt-1 text-slate-300 transition group-hover:text-slate-500"
            />
          </div>
          <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {c.label}
          </div>
          <div className={cn('num mt-1 text-2xl font-black', TONE_NUMBER[c.tone])}>
            {c.value}
          </div>
          {c.sub ? (
            <div className="mt-1 truncate text-xs text-slate-500">{c.sub}</div>
          ) : null}
        </Link>
      ))}
    </section>
  );
}
