import Link from 'next/link';
import {
  AlertTriangle,
  Users,
  Plus,
  ClipboardList,
  Send,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

/**
 * Suppliers page right rail:
 *   1. Low Rated Deliveries — top 5 suppliers with quality < 60% or on-time < 60%
 *   2. Recent Suppliers     — last 5 by createdAt
 *   3. Quick Actions        — 4 icon tiles
 */
export async function SuppliersRightRail({ userId }: { userId: string }) {
  const [lowRated, recent] = await Promise.all([
    prisma.supplier.findMany({
      where: {
        userId,
        deletedAt: null,
        OR: [
          { qualityRating: { lt: 60 } },
          { onTimeDeliveryRating: { lt: 60 } },
        ],
      },
      orderBy: [{ qualityRating: 'asc' }, { onTimeDeliveryRating: 'asc' }],
      take: 5,
      select: {
        id: true,
        name: true,
        qualityRating: true,
        onTimeDeliveryRating: true,
      },
    }),
    prisma.supplier.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
        supplierCategory: true,
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <LowRatedCard rows={lowRated} />
      <RecentSuppliersCard rows={recent} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Low Rated Deliveries ============== */

function LowRatedCard({
  rows,
}: {
  rows: {
    id: string;
    name: string;
    qualityRating: number | null;
    onTimeDeliveryRating: number | null;
  }[];
}) {
  return (
    <DashboardCard title="Low Rated Deliveries" viewAllHref="/suppliers">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">
          Every rated supplier is at or above 60%.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const qPct = r.qualityRating ?? 0;
            const otPct = r.onTimeDeliveryRating ?? 0;
            const worst = Math.min(qPct, otPct);
            const stars = Math.max(0, Math.min(5, qPct / 20));
            return (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/suppliers/${r.id}`}
                  className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <AlertTriangle size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <Star
                            key={i}
                            size={9}
                            className={
                              i < Math.round(stars)
                                ? 'fill-owed-500 text-owed-500'
                                : 'text-slate-300'
                            }
                          />
                        ))}
                      </span>
                      <span>· On-time {otPct}%</span>
                    </div>
                  </div>
                </Link>
                <span className="num shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                  {worst}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Recent Suppliers ============== */

function RecentSuppliersCard({
  rows,
}: {
  rows: { id: string; name: string; createdAt: Date; supplierCategory: string | null }[];
}) {
  return (
    <DashboardCard title="Recent Suppliers" viewAllHref="/suppliers">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-slate-500">
          Suppliers you add will appear here.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/suppliers/${r.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Users size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.name}
                  </div>
                  <div className="truncate text-[10px] text-slate-500">
                    {r.supplierCategory ?? 'No category'}
                  </div>
                </div>
              </Link>
              <span className="shrink-0 text-[10px] text-slate-500">
                {new Date(r.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                })}
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
    { Icon: Plus, label: 'New Supplier', href: '/suppliers/new', tone: 'brand' },
    { Icon: Send, label: 'Send PO', href: '/purchase-orders/new', tone: 'success' },
    { Icon: ClipboardList, label: 'Supplier History', href: '/purchase-orders', tone: 'owed' },
    { Icon: Star, label: 'Rate Quality', href: '/purchase-orders', tone: 'rose' },
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
