import Link from 'next/link';
import {
  AlertTriangle,
  ClipboardList,
  Factory,
  Boxes,
  Truck,
  CheckCircle2,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { shortageService } from '@/lib/services/shortage.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The world-class dashboard's 8 top KPI cards, exactly as the spec wants:
 *   - Pending Orders
 *   - Production In Progress
 *   - Low Materials
 *   - Shortage Alerts
 *   - Purchase Orders Pending
 *   - Completed Production (this week)
 *   - Revenue This Week
 *   - Outstanding Invoices
 */
export async function OpsKpiStrip({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    pendingOrders,
    productionInProgress,
    lowMaterials,
    shortageAlerts,
    posPending,
    completedThisWeek,
    revenueThisWeek,
    outstandingInvoices,
  ] = await Promise.all([
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
    inventoryService.computeLowStockMaterials(userId).then((r) => r.length),
    shortageService.countOpenForUser(userId),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: weekStart },
      },
    }),
    prisma.payment.aggregate({
      where: {
        userId,
        status: 'PAID',
        createdAt: { gte: weekStart },
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
  ]);

  const weekRevenueKobo = revenueThisWeek._sum.amountKobo ?? 0;
  const outstandingTotalKobo =
    (outstandingInvoices._sum.total ?? 0) -
    (outstandingInvoices._sum.amountPaid ?? 0);

  type Kpi = {
    label: string;
    value: string;
    href: string;
    Icon: LucideIcon;
    tone: 'slate' | 'brand' | 'amber' | 'rose' | 'emerald' | 'indigo';
    sub?: string;
  };

  const cards: Kpi[] = [
    {
      label: 'Pending orders',
      value: String(pendingOrders),
      href: '/orders?status=NEW',
      Icon: ClipboardList,
      tone: 'slate',
    },
    {
      label: 'In production',
      value: String(productionInProgress),
      href: '/production?status=IN_PRODUCTION',
      Icon: Factory,
      tone: 'brand',
    },
    {
      label: 'Low materials',
      value: String(lowMaterials),
      href: '/materials?lowStock=1',
      Icon: Boxes,
      tone: lowMaterials > 0 ? 'amber' : 'slate',
    },
    {
      label: 'Shortage alerts',
      value: String(shortageAlerts),
      href: '/shortages',
      Icon: AlertTriangle,
      tone: shortageAlerts > 0 ? 'rose' : 'slate',
    },
    {
      label: 'POs pending',
      value: String(posPending),
      href: '/purchase-orders',
      Icon: Truck,
      tone: 'indigo',
    },
    {
      label: 'Completed (7d)',
      value: String(completedThisWeek),
      href: '/production/history',
      Icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      label: 'Revenue (7d)',
      value: formatKobo(weekRevenueKobo),
      href: '/reports',
      Icon: TrendingUp,
      tone: 'emerald',
    },
    {
      label: 'Outstanding',
      value: formatKobo(outstandingTotalKobo),
      href: '/invoices',
      Icon: Receipt,
      tone: outstandingTotalKobo > 0 ? 'amber' : 'slate',
      sub:
        outstandingInvoices._count._all > 0
          ? `${outstandingInvoices._count._all} invoices`
          : undefined,
    },
  ];

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
        Operations
      </h2>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card flex flex-col gap-1 p-3 transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <c.Icon size={11} />
              {c.label}
            </div>
            <div className={cn('text-lg font-black', toneCls(c.tone))}>
              {c.value}
            </div>
            {c.sub ? (
              <div className="text-[10px] text-slate-400">{c.sub}</div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function toneCls(t: string): string {
  switch (t) {
    case 'rose':
      return 'text-rose-700';
    case 'amber':
      return 'text-owed-700';
    case 'emerald':
      return 'text-success-700';
    case 'brand':
      return 'text-brand-700';
    case 'indigo':
      return 'text-indigo-700';
    default:
      return 'text-slate-800';
  }
}
