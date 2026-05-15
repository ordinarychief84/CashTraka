import {
  Boxes,
  Coins,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 6 KPI tiles across the top of /inventory:
 *   Total Items · Total Stock Value · Items In Stock · Low Stock Items ·
 *   Out of Stock Items · Expiring Soon (14d)
 *
 * Counts treat every Product (finished goods) AND every RawMaterial as
 * an "item" — inventory is the union of both stock pools.
 */
export async function InventoryHeroKpis({ userId }: { userId: string }) {
  const [
    productTotal,
    productOutOfStock,
    productLowList,
    productStockRows,
    materialTotal,
    materialOutOfStock,
    materialLowList,
    materialStockRows,
    expiringRows,
  ] = await Promise.all([
    prisma.product.count({ where: { userId, archived: false } }),
    prisma.product.count({
      where: { userId, archived: false, trackStock: true, stock: 0 },
    }),
    inventoryService.computeLowStockProducts(userId),
    prisma.product.findMany({
      where: { userId, archived: false },
      select: { stock: true, costKobo: true, priceKobo: true },
    }),
    prisma.rawMaterial.count({ where: { userId, deletedAt: null } }),
    prisma.rawMaterial.count({
      where: { userId, deletedAt: null, stock: 0 },
    }),
    inventoryService.computeLowStockMaterials(userId),
    prisma.rawMaterial.findMany({
      where: { userId, deletedAt: null },
      select: { stock: true, unitCostKobo: true },
    }),
    inventoryService.computeExpiringMaterials(userId, 14),
  ]);

  const totalItems = productTotal + materialTotal;
  const outOfStock = productOutOfStock + materialOutOfStock;
  // "In stock" = items with stock > 0 (regardless of low/out classification).
  const productInStock = productStockRows.filter((p) => p.stock > 0).length;
  const materialInStock = materialStockRows.filter((m) => m.stock > 0).length;
  const inStock = productInStock + materialInStock;

  const lowStockCount =
    productLowList.filter((p) => p.stock > 0).length +
    materialLowList.filter((m) => m.stock > 0).length;

  const productValue = productStockRows.reduce(
    (s, p) => s + p.stock * (p.costKobo ?? p.priceKobo ?? 0),
    0,
  );
  const materialValue = materialStockRows.reduce(
    (s, m) => s + m.stock * m.unitCostKobo,
    0,
  );
  const totalValue = productValue + materialValue;

  const tiles: {
    label: string;
    value: string;
    delta: number | null;
    deltaLabel: string;
    Icon: LucideIcon;
    iconTone: 'brand' | 'success' | 'owed' | 'rose' | 'slate';
    invert?: boolean;
  }[] = [
    {
      label: 'Total Items',
      value: totalItems.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'all stock-tracked SKUs',
      Icon: Boxes,
      iconTone: 'brand',
    },
    {
      label: 'Total Stock Value',
      value: formatKobo(totalValue),
      delta: null,
      deltaLabel: 'at cost',
      Icon: Coins,
      iconTone: 'success',
    },
    {
      label: 'Items In Stock',
      value: inStock.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: `${totalItems > 0 ? Math.round((inStock / totalItems) * 100) : 0}% of catalogue`,
      Icon: CheckCircle2,
      iconTone: 'success',
    },
    {
      label: 'Low Stock Items',
      value: lowStockCount.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'at/below reorder',
      Icon: AlertTriangle,
      iconTone: 'owed',
      invert: true,
    },
    {
      label: 'Out of Stock Items',
      value: outOfStock.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'zero on hand',
      Icon: XCircle,
      iconTone: 'rose',
      invert: true,
    },
    {
      label: 'Expiring Soon',
      value: expiringRows.length.toLocaleString('en-NG'),
      delta: null,
      deltaLabel: 'within 14 days',
      Icon: Clock,
      iconTone: 'owed',
      invert: true,
    },
  ];

  const ICON_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    owed: 'bg-owed-50 text-owed-700',
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-border bg-white p-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {t.label}
              </div>
              <div className="num mt-2 truncate text-xl font-black text-ink">
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
          {t.delta !== null ? (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold',
                (t.invert ? t.delta < 0 : t.delta >= 0)
                  ? 'text-success-700'
                  : 'text-rose-600',
              )}
            >
              {t.delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {Math.abs(t.delta)}% {t.deltaLabel}
            </div>
          ) : (
            <div className="mt-2 text-[11px] text-slate-500">{t.deltaLabel}</div>
          )}
        </div>
      ))}
    </section>
  );
}
