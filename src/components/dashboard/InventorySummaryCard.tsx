import { Package, Boxes, AlertTriangle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { DashboardCard } from './DashboardCard';

/**
 * Inventory Summary — compact 4-row breakdown with a tight stock-health
 * progress bar at the top. The previous design used a 112 px donut and
 * a hardcoded "+9% vs last week" delta that was never connected to real
 * data — both have been removed in favour of an honest at-a-glance view.
 */
export async function InventorySummaryCard({ userId }: { userId: string }) {
  const [
    totalProducts,
    outOfStockProducts,
    lowStockProductsList,
    totalMaterials,
    outOfStockMaterials,
    lowStockMaterialsList,
  ] = await Promise.all([
    prisma.product.count({ where: { userId, archived: false } }),
    prisma.product.count({
      where: { userId, archived: false, trackStock: true, stock: 0 },
    }),
    inventoryService.computeLowStockProducts(userId),
    prisma.rawMaterial.count({ where: { userId, deletedAt: null } }),
    prisma.rawMaterial.count({
      where: { userId, deletedAt: null, stock: 0 },
    }),
    inventoryService.computeLowStockMaterials(userId),
  ]);

  const lowStockTotal = lowStockProductsList.length + lowStockMaterialsList.length;
  const outOfStockTotal = outOfStockProducts + outOfStockMaterials;
  const totalItems = totalProducts + totalMaterials;
  const healthy = Math.max(0, totalItems - lowStockTotal - outOfStockTotal);
  const healthyPct = totalItems > 0 ? Math.round((healthy / totalItems) * 100) : 100;

  const healthyPctFloat = totalItems > 0 ? (healthy / totalItems) * 100 : 100;
  const lowPctFloat = totalItems > 0 ? (lowStockTotal / totalItems) * 100 : 0;
  const outPctFloat = totalItems > 0 ? (outOfStockTotal / totalItems) * 100 : 0;

  type Row = {
    Icon: LucideIcon;
    label: string;
    iconTone: 'brand' | 'success' | 'owed' | 'rose';
    value: number;
    href: string;
  };

  const rows: Row[] = [
    { Icon: Package,        label: 'Total products',     iconTone: 'brand',   value: totalProducts,   href: '/products' },
    { Icon: Boxes,          label: 'Raw materials',      iconTone: 'success', value: totalMaterials,  href: '/materials' },
    { Icon: AlertTriangle,  label: 'Low stock items',    iconTone: 'owed',    value: lowStockTotal,   href: '/inventory?filter=low' },
    { Icon: XCircle,        label: 'Out of stock',       iconTone: 'rose',    value: outOfStockTotal, href: '/inventory?filter=oos' },
  ];

  const ICON_TONE: Record<Row['iconTone'], string> = {
    brand:   'bg-brand-50 text-brand-700',
    success: 'bg-success-50 text-success-700',
    owed:    'bg-owed-50 text-owed-700',
    rose:    'bg-rose-50 text-rose-700',
  };

  // Tone the headline number with the actual health: green if mostly
  // healthy, amber if there's noticeable low-stock pressure, rose if
  // out-of-stock dominates.
  const headlineTone =
    totalItems === 0
      ? 'text-slate-400'
      : healthyPct >= 80
        ? 'text-success-700'
        : healthyPct >= 50
          ? 'text-owed-700'
          : 'text-rose-700';

  return (
    <DashboardCard title="Inventory summary" viewAllHref="/inventory">
      {/* Health headline */}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className={`num text-2xl font-black leading-none ${headlineTone}`}>
              {healthyPct}%
            </span>
            <span className="text-[11px] font-medium text-slate-500">healthy stock</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {totalItems === 0
              ? 'No items tracked yet'
              : `${healthy} of ${totalItems} items in good standing`}
          </p>
        </div>
      </div>

      {/* Stacked health bar */}
      <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {totalItems > 0 ? (
          <>
            {healthyPctFloat > 0 && (
              <div className="bg-success-500" style={{ width: `${healthyPctFloat}%` }} />
            )}
            {lowPctFloat > 0 && (
              <div className="bg-owed-500" style={{ width: `${lowPctFloat}%` }} />
            )}
            {outPctFloat > 0 && (
              <div className="bg-rose-500" style={{ width: `${outPctFloat}%` }} />
            )}
          </>
        ) : null}
      </div>

      {/* 4-row breakdown */}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[13px] text-slate-600">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md ${ICON_TONE[r.iconTone]}`}>
                <r.Icon size={12} />
              </span>
              {r.label}
            </span>
            <span className="num text-[13px] font-bold text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
