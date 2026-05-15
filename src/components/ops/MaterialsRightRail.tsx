import Link from 'next/link';
import {
  AlertTriangle,
  CalendarX,
  Plus,
  Sliders,
  ClipboardList,
  PackageCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * Materials page right rail (or bottom strip on narrower screens):
 *   1. Low Stock Alerts   — top 5 materials at or below reorder level
 *   2. Expired Materials  — top 5 with expiresAt in the past
 *   3. Quick Actions      — 4 icon tiles linking to common material flows
 */
export async function MaterialsRightRail({ userId }: { userId: string }) {
  const [low, expired] = await Promise.all([
    inventoryService.computeLowStockMaterials(userId).then((all) => all.slice(0, 5)),
    prisma.rawMaterial.findMany({
      where: {
        userId,
        deletedAt: null,
        expiresAt: { not: null, lte: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
      take: 5,
      select: { id: true, name: true, unit: true, expiresAt: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <LowStockAlertsCard rows={low} />
      <ExpiredMaterialsCard rows={expired} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Low Stock Alerts ============== */

function LowStockAlertsCard({
  rows,
}: {
  rows: { id: string; name: string; stock: number; reorderLevel: number; unit: string }[];
}) {
  return (
    <DashboardCard title="Low Stock Alerts" viewAllHref="/materials?lowStock=1">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">
          Every material is above reorder level.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <Link
                href={`/materials/${r.id}`}
                className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-owed-50 text-owed-700">
                  <AlertTriangle size={14} />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {r.stock} {r.unit} · reorder at {r.reorderLevel}
                  </div>
                </div>
              </Link>
              <span className="num shrink-0 rounded-full bg-owed-100 px-2 py-0.5 text-[10px] font-bold text-owed-800">
                {r.stock} {r.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

/* ============== Expired Materials ============== */

function ExpiredMaterialsCard({
  rows,
}: {
  rows: { id: string; name: string; unit: string; expiresAt: Date | null }[];
}) {
  return (
    <DashboardCard title="Expired Materials" viewAllHref="/materials">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">No expired materials.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const days = r.expiresAt
              ? Math.floor(
                  (Date.now() - new Date(r.expiresAt).getTime()) /
                    (24 * 60 * 60 * 1000),
                )
              : null;
            return (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <Link
                  href={`/materials/${r.id}`}
                  className="flex min-w-0 items-center gap-2.5 hover:opacity-90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                    <CalendarX size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Expired {days != null ? `${days} day${days === 1 ? '' : 's'} ago` : ''}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
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
    { Icon: Plus, label: 'Add Material', href: '/materials/new', tone: 'brand' },
    { Icon: Sliders, label: 'Stock Adjustment', href: '/materials', tone: 'success' },
    { Icon: ClipboardList, label: 'Record Usage', href: '/production', tone: 'owed' },
    { Icon: PackageCheck, label: 'Stock Received', href: '/purchase-orders', tone: 'rose' },
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
