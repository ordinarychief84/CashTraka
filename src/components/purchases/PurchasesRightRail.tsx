import Link from 'next/link';
import {
  Truck,
  Clock,
  Plus,
  Send,
  PackageCheck,
  ClipboardList,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKobo } from '@/lib/format';

/**
 * Purchase Orders page right rail:
 *   1. Pending Orders     — top 5 by expected delivery date (oldest first)
 *   2. Recent Purchases   — last 5 received POs
 *   3. Quick Actions      — 4 icon tiles
 */
export async function PurchasesRightRail({ userId }: { userId: string }) {
  const [pending, recent] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
      orderBy: [{ expectedAt: 'asc' }, { createdAt: 'asc' }],
      take: 5,
      include: { supplier: { select: { name: true } } },
    }),
    prisma.purchaseOrder.findMany({
      where: { userId, deletedAt: null, status: 'RECEIVED' },
      orderBy: { receivedAt: 'desc' },
      take: 5,
      include: { supplier: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <PendingOrdersCard rows={pending} />
      <RecentPurchasesCard rows={recent} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Pending Orders ============== */

function PendingOrdersCard({
  rows,
}: {
  rows: {
    id: string;
    poNumber: string;
    status: string;
    expectedAt: Date | null;
    totalKobo: number;
    supplier: { name: string };
  }[];
}) {
  return (
    <DashboardCard title="Pending Orders" viewAllHref="/purchase-orders">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">No pending purchase orders.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const days = r.expectedAt
              ? Math.ceil(
                  (new Date(r.expectedAt).getTime() - Date.now()) /
                    (24 * 60 * 60 * 1000),
                )
              : null;
            const overdue = days !== null && days < 0;
            return (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/purchase-orders/${r.id}`}
                  className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Truck size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-bold text-ink">
                      {r.poNumber}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {r.supplier.name}
                      {days !== null
                        ? overdue
                          ? ` · overdue ${Math.abs(days)}d`
                          : days === 0
                            ? ' · due today'
                            : ` · in ${days}d`
                        : ''}
                    </div>
                  </div>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <StatusBadge status={r.status} />
                  <span className="num text-[10px] text-slate-500">
                    {formatKobo(r.totalKobo)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Recent Purchases ============== */

function RecentPurchasesCard({
  rows,
}: {
  rows: {
    id: string;
    poNumber: string;
    receivedAt: Date | null;
    totalKobo: number;
    supplier: { name: string };
  }[];
}) {
  return (
    <DashboardCard title="Recent Purchases" viewAllHref="/purchase-orders?status=RECEIVED">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">No completed purchases yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/purchase-orders/${r.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-100 text-success-700">
                  <Clock size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-bold text-ink">
                    {r.poNumber}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {r.supplier.name}
                    {r.receivedAt
                      ? ` · ${new Date(r.receivedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}`
                      : ''}
                  </div>
                </div>
              </Link>
              <span className="num shrink-0 text-xs font-bold text-ink">
                {formatKobo(r.totalKobo)}
              </span>
            </li>
          ))}
        </ul>
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
    { Icon: Plus, label: 'New PO', href: '/purchase-orders/new', tone: 'brand' },
    { Icon: Send, label: 'Send to Supplier', href: '/purchase-orders', tone: 'success' },
    { Icon: PackageCheck, label: 'Receive Stock', href: '/purchase-orders', tone: 'owed' },
    { Icon: ClipboardList, label: 'View History', href: '/inventory/movements', tone: 'rose' },
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
