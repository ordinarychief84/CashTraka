import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatKobo } from '@/lib/format';
import { ArrowDownToLine, ArrowUpFromLine, Repeat } from 'lucide-react';

/**
 * 3 chart cards row below the Inventory KPI strip:
 *   - Inventory Overview     · donut split by stock status (in / low / out / expiring)
 *   - Stock Value by Type    · donut split by category (Finished Goods, Raw Materials, Packaging, Consumables)
 *   - Stock Movement Summary · 7-day totals: received, used, adjusted
 */
export async function InventoryChartRow({ userId }: { userId: string }) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <InventoryOverviewCard userId={userId} />
      <StockValueByTypeCard userId={userId} />
      <StockMovementSummaryCard userId={userId} />
    </div>
  );
}

/* ============== Inventory Overview ============== */

async function InventoryOverviewCard({ userId }: { userId: string }) {
  const [
    productTotal,
    productOutOfStock,
    productLowList,
    materialTotal,
    materialOutOfStock,
    materialLowList,
    expiring,
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
    inventoryService.computeExpiringMaterials(userId, 14),
  ]);

  const total = productTotal + materialTotal;
  const outOfStock = productOutOfStock + materialOutOfStock;
  const lowStock =
    productLowList.filter((p) => p.stock > 0).length +
    materialLowList.filter((m) => m.stock > 0).length;
  const expiringSoon = expiring.length;
  const inStock = Math.max(0, total - lowStock - outOfStock - expiringSoon);

  const rows: { label: string; count: number; color: string; hex: string }[] = [
    { label: 'In Stock', count: inStock, color: 'bg-success-500', hex: '#8BD91E' },
    { label: 'Low Stock', count: lowStock, color: 'bg-owed-500', hex: '#F59E0B' },
    { label: 'Out of Stock', count: outOfStock, color: 'bg-rose-500', hex: '#EF4444' },
    { label: 'Expiring Soon', count: expiringSoon, color: 'bg-brand-500', hex: '#00B8E8' },
  ];

  const sum = rows.reduce((s, r) => s + r.count, 0);
  const conicStops = (() => {
    if (sum === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      if (r.count === 0) continue;
      const pct = (r.count / sum) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  return (
    <DashboardCard title="Inventory Overview">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-lg font-black leading-none text-ink">{total}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Items
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.map((r) => {
            const pct = sum > 0 ? Math.round((r.count / sum) * 100) : 0;
            return (
              <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${r.color}`} />
                  {r.label}
                </span>
                <span className="num text-slate-700">
                  <span className="font-bold text-ink">{r.count}</span>
                  <span className="ml-1 text-slate-400">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </DashboardCard>
  );
}

/* ============== Stock Value by Type ============== */

async function StockValueByTypeCard({ userId }: { userId: string }) {
  const [products, materials] = await Promise.all([
    prisma.product.findMany({
      where: { userId, archived: false },
      select: { stock: true, costKobo: true, priceKobo: true },
    }),
    prisma.rawMaterial.findMany({
      where: { userId, deletedAt: null },
      select: { stock: true, unitCostKobo: true, materialType: true },
    }),
  ]);

  const finishedGoodsValue = products.reduce(
    (s, p) => s + p.stock * (p.costKobo ?? p.priceKobo ?? 0),
    0,
  );

  // Split raw materials by materialType into our 3 buckets.
  let rawValue = 0;
  let packagingValue = 0;
  let consumableValue = 0;
  for (const m of materials) {
    const val = m.stock * m.unitCostKobo;
    const t = (m.materialType ?? '').toUpperCase();
    if (t === 'PACKAGING') packagingValue += val;
    else if (t === 'CONSUMABLE') consumableValue += val;
    else rawValue += val;
  }

  const rows: { label: string; value: number; color: string; hex: string }[] = [
    { label: 'Finished Goods', value: finishedGoodsValue, color: 'bg-brand-500', hex: '#00B8E8' },
    { label: 'Raw Materials', value: rawValue, color: 'bg-success-500', hex: '#8BD91E' },
    { label: 'Packaging', value: packagingValue, color: 'bg-owed-500', hex: '#F59E0B' },
    { label: 'Consumables', value: consumableValue, color: 'bg-slate-400', hex: '#94A3B8' },
  ];

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const conicStops = (() => {
    if (totalValue === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      if (r.value === 0) continue;
      const pct = (r.value / totalValue) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  return (
    <DashboardCard title="Stock Value by Type">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-[11px] font-black leading-none text-ink">
              {formatKobo(totalValue)}
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Value
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.map((r) => {
            const pct = totalValue > 0 ? Math.round((r.value / totalValue) * 100) : 0;
            return (
              <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${r.color}`} />
                  {r.label}
                </span>
                <span className="num text-slate-700">
                  <span className="font-bold text-ink">{formatKobo(r.value)}</span>
                  <span className="ml-1 text-slate-400">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </DashboardCard>
  );
}

/* ============== Stock Movement Summary ============== */

async function StockMovementSummaryCard({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [received, used, produced, adjusted, written] = await Promise.all([
    prisma.stockMovement.aggregate({
      where: {
        userId,
        reason: 'PURCHASE_RECEIVE',
        createdAt: { gte: weekStart },
      },
      _sum: { delta: true },
      _count: { id: true },
    }),
    prisma.stockMovement.aggregate({
      where: {
        userId,
        reason: 'PRODUCTION_CONSUME',
        createdAt: { gte: weekStart },
      },
      _sum: { delta: true },
      _count: { id: true },
    }),
    prisma.stockMovement.aggregate({
      where: {
        userId,
        reason: 'PRODUCTION_PRODUCE',
        createdAt: { gte: weekStart },
      },
      _sum: { delta: true },
      _count: { id: true },
    }),
    prisma.stockMovement.aggregate({
      where: {
        userId,
        reason: 'ADJUSTMENT',
        createdAt: { gte: weekStart },
      },
      _sum: { delta: true },
      _count: { id: true },
    }),
    prisma.stockMovement.aggregate({
      where: {
        userId,
        reason: 'WRITE_OFF',
        createdAt: { gte: weekStart },
      },
      _sum: { delta: true },
      _count: { id: true },
    }),
  ]);

  const rows: {
    Icon: typeof ArrowDownToLine;
    label: string;
    units: number;
    count: number;
    tone: 'success' | 'rose' | 'owed' | 'brand' | 'slate';
  }[] = [
    {
      Icon: ArrowDownToLine,
      label: 'Stock Received',
      units: Math.abs(received._sum.delta ?? 0),
      count: received._count.id,
      tone: 'success',
    },
    {
      Icon: ArrowUpFromLine,
      label: 'Used in Production',
      units: Math.abs(used._sum.delta ?? 0),
      count: used._count.id,
      tone: 'owed',
    },
    {
      Icon: ArrowDownToLine,
      label: 'Produced',
      units: Math.abs(produced._sum.delta ?? 0),
      count: produced._count.id,
      tone: 'brand',
    },
    {
      Icon: Repeat,
      label: 'Adjustments',
      units: Math.abs(adjusted._sum.delta ?? 0),
      count: adjusted._count.id,
      tone: 'slate',
    },
    {
      Icon: ArrowUpFromLine,
      label: 'Write-offs',
      units: Math.abs(written._sum.delta ?? 0),
      count: written._count.id,
      tone: 'rose',
    },
  ];

  const TONE_BG: Record<string, string> = {
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
    owed: 'bg-owed-50 text-owed-700',
    brand: 'bg-brand-50 text-brand-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <DashboardCard title="Stock Movement Summary" rightSlot={<PeriodPill />}>
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_BG[r.tone]}`}
              >
                <r.Icon size={14} />
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-ink">
                  {r.label}
                </div>
                <div className="text-[10px] text-slate-500">
                  {r.count} {r.count === 1 ? 'movement' : 'movements'}
                </div>
              </div>
            </div>
            <span className="num shrink-0 text-sm font-bold text-ink">
              {r.units.toLocaleString('en-NG')}
            </span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
