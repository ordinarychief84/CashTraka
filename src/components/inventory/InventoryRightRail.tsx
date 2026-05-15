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
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * Inventory page right rail:
 *   1. Low Stock Items   — top 5 (materials + products) at/below reorder
 *   2. Expiring Soon     — top 5 materials with expiresAt within 14 days
 *   3. Quick Actions     — 4 icon tiles (Add Item / Adjust Stock /
 *                          Record Movement / Stock Received)
 */
export async function InventoryRightRail({ userId }: { userId: string }) {
  const [lowMaterials, lowProducts, expiring] = await Promise.all([
    inventoryService.computeLowStockMaterials(userId),
    inventoryService.computeLowStockProducts(userId),
    inventoryService.computeExpiringMaterials(userId, 14),
  ]);

  const lowRows: LowRow[] = [
    ...lowMaterials.map((m) => ({
      id: m.id,
      href: `/materials/${m.id}`,
      name: m.name,
      kind: 'Material' as const,
      stock: m.stock,
      threshold: m.reorderLevel,
      unit: m.unit,
    })),
    ...lowProducts.map((p) => ({
      id: p.id,
      href: `/products/${p.id}`,
      name: p.name,
      kind: 'Product' as const,
      stock: p.stock,
      threshold: p.lowStockAt,
      unit: 'pcs',
    })),
  ]
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  const expiringRows = expiring.slice(0, 5);

  return (
    <div className="space-y-4">
      <LowStockItemsCard rows={lowRows} />
      <ExpiringSoonCard rows={expiringRows} />
      <QuickActionsCard />
    </div>
  );
}

/* ============== Low Stock Items ============== */

type LowRow = {
  id: string;
  href: string;
  name: string;
  kind: 'Material' | 'Product';
  stock: number;
  threshold: number;
  unit: string;
};

function LowStockItemsCard({ rows }: { rows: LowRow[] }) {
  return (
    <DashboardCard title="Low Stock Items" viewAllHref="/inventory">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">
          Every item is above its reorder level.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-2">
              <Link
                href={r.href}
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
                    {r.kind} · alert at {r.threshold}
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

/* ============== Expiring Soon ============== */

function ExpiringSoonCard({
  rows,
}: {
  rows: { id: string; name: string; unit: string; expiresAt: Date | null }[];
}) {
  return (
    <DashboardCard title="Expiring Soon" viewAllHref="/materials">
      {rows.length === 0 ? (
        <p className="py-1 text-xs text-success-700">
          Nothing expiring in the next 14 days.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const days = r.expiresAt
              ? Math.ceil(
                  (new Date(r.expiresAt).getTime() - Date.now()) /
                    (24 * 60 * 60 * 1000),
                )
              : null;
            const overdue = days !== null && days <= 0;
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
                      {days === null
                        ? 'No expiry date'
                        : overdue
                          ? `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
                          : `In ${days} day${days === 1 ? '' : 's'}`}
                    </div>
                  </div>
                </Link>
                <span
                  className={`num shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    overdue
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-owed-100 text-owed-800'
                  }`}
                >
                  {r.expiresAt
                    ? new Date(r.expiresAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '—'}
                </span>
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
    { Icon: Plus, label: 'Add Item', href: '/materials/new', tone: 'brand' },
    { Icon: Sliders, label: 'Adjust Stock', href: '/inventory/movements', tone: 'success' },
    { Icon: ClipboardList, label: 'Record Movement', href: '/inventory/movements', tone: 'owed' },
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
