import { Package, Boxes, AlertTriangle, XCircle, ArrowUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { DashboardCard } from './DashboardCard';

/**
 * Inventory Summary — a donut showing overall stock health on the
 * right, and a 4-row breakdown (total products / raw materials / low
 * stock / out of stock) on the left.
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
  // Healthy = total - low - out
  const healthy = Math.max(0, totalItems - lowStockTotal - outOfStockTotal);
  const healthyPct = totalItems > 0 ? Math.round((healthy / totalItems) * 100) : 100;

  // Donut: healthy (success), low (owed), out-of-stock (rose), rest neutral.
  const lowPct = totalItems > 0 ? (lowStockTotal / totalItems) * 100 : 0;
  const outPct = totalItems > 0 ? (outOfStockTotal / totalItems) * 100 : 0;
  const healthyPctFloat = totalItems > 0 ? (healthy / totalItems) * 100 : 100;
  const conicStops = totalItems === 0
    ? 'conic-gradient(#E5E7EB 0% 100%)'
    : `conic-gradient(
        #8BD91E 0% ${healthyPctFloat.toFixed(2)}%,
        #F59E0B ${healthyPctFloat.toFixed(2)}% ${(healthyPctFloat + lowPct).toFixed(2)}%,
        #EF4444 ${(healthyPctFloat + lowPct).toFixed(2)}% ${(healthyPctFloat + lowPct + outPct).toFixed(2)}%
      )`;

  type Row = {
    Icon: LucideIcon;
    label: string;
    iconTone: 'brand' | 'success' | 'owed' | 'rose';
  };
  const rows: Row[] = [
    { Icon: Package, label: 'Total Products', iconTone: 'brand' },
    { Icon: Boxes, label: 'Raw Materials', iconTone: 'success' },
    { Icon: AlertTriangle, label: 'Low Stock Items', iconTone: 'owed' },
    { Icon: XCircle, label: 'Out of Stock Items', iconTone: 'rose' },
  ];

  const ICON_TONE: Record<Row['iconTone'], string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-100 text-success-700',
    owed: 'bg-owed-50 text-owed-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  const values: Record<string, number> = {
    'Total Products': totalProducts,
    'Raw Materials': totalMaterials,
    'Low Stock Items': lowStockTotal,
    'Out of Stock Items': outOfStockTotal,
  };

  return (
    <DashboardCard title="Inventory Summary" viewAllHref="/inventory">
      <div className="flex items-center gap-4">
        <ul className="flex-1 space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${ICON_TONE[r.iconTone]}`}
                >
                  <r.Icon size={13} />
                </span>
                {r.label}
              </span>
              <span className="num text-sm font-bold text-ink">
                {values[r.label] ?? 0}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center">
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
            <div className="absolute inset-[22%] rounded-full bg-white" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="num text-xl font-black leading-none text-ink">
                {healthyPct}%
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Healthy
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Stock
              </div>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold text-success-700">
            <ArrowUp size={11} />
            9% vs last week
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
