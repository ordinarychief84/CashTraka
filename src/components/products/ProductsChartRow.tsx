import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatKobo } from '@/lib/format';

/**
 * Three chart cards row below the Products KPI strip:
 *   - Stock Status Overview · donut (in stock / low / out / inactive)
 *   - Top Selling Products · top 5 by units sold this week (bars)
 *   - Stock Value by Category · donut weighted by selling-price stock value
 */
export async function ProductsChartRow({ userId }: { userId: string }) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <StockStatusOverviewCard userId={userId} />
      <TopSellingProductsCard userId={userId} />
      <StockValueByCategoryCard userId={userId} />
    </div>
  );
}

/* ============== Stock Status Overview ============== */

async function StockStatusOverviewCard({ userId }: { userId: string }) {
  const [total, outOfStock, lowList, inactive] = await Promise.all([
    prisma.product.count({ where: { userId, archived: false } }),
    prisma.product.count({
      where: { userId, archived: false, trackStock: true, stock: 0 },
    }),
    inventoryService.computeLowStockProducts(userId),
    prisma.product.count({
      where: {
        userId,
        archived: false,
        status: { in: ['INACTIVE', 'DISCONTINUED'] },
      },
    }),
  ]);

  const low = lowList.length;
  const inStock = Math.max(0, total - low - outOfStock - inactive);

  const rows: { label: string; count: number; color: string; hex: string }[] = [
    { label: 'In Stock', count: inStock, color: 'bg-success-500', hex: '#8BD91E' },
    { label: 'Low Stock', count: low, color: 'bg-owed-500', hex: '#F59E0B' },
    { label: 'Out of Stock', count: outOfStock, color: 'bg-rose-500', hex: '#EF4444' },
    { label: 'Inactive', count: inactive, color: 'bg-slate-400', hex: '#94A3B8' },
  ];

  const sum = rows.reduce((s, r) => s + r.count, 0);
  const conicStops = (() => {
    if (sum === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      const pct = (r.count / sum) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  return (
    <DashboardCard title="Stock Status Overview">
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
              Products
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

/* ============== Top Selling Products ============== */

async function TopSellingProductsCard({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  // Sum CustomerOrderItem.quantity for orders in the last 7 days (READY or DELIVERED).
  const grouped = await prisma.customerOrderItem.groupBy({
    by: ['productId', 'description'],
    where: {
      customerOrder: {
        userId,
        deletedAt: null,
        status: { in: ['READY', 'DELIVERED'] },
        createdAt: { gte: weekStart },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });

  const productIds = grouped.map((g) => g.productId).filter(Boolean) as string[];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const byId = new Map(products.map((p) => [p.id, p.name]));

  const rows = grouped.map((g) => ({
    name: (g.productId && byId.get(g.productId)) || g.description,
    sold: g._sum.quantity ?? 0,
  }));

  const max = Math.max(1, ...rows.map((r) => r.sold));

  return (
    <DashboardCard title="Top Selling Products" rightSlot={<PeriodPill />}>
      {rows.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">
          No products sold this week yet.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="num inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-ink">
                    {r.name}
                  </span>
                  <span className="num shrink-0 text-[10px] text-slate-500">
                    {r.sold} pcs
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(r.sold / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}

/* ============== Stock Value by Category ============== */

async function StockValueByCategoryCard({ userId }: { userId: string }) {
  const products = await prisma.product.findMany({
    where: { userId, archived: false },
    select: { category: true, stock: true, priceKobo: true },
  });

  // Aggregate stock value by category.
  const byCategory = new Map<string, number>();
  for (const p of products) {
    const cat = (p.category ?? 'Other').trim() || 'Other';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + p.stock * p.priceKobo);
  }

  const PALETTE: { tw: string; hex: string }[] = [
    { tw: 'bg-brand-500', hex: '#00B8E8' },
    { tw: 'bg-success-500', hex: '#8BD91E' },
    { tw: 'bg-owed-500', hex: '#F59E0B' },
    { tw: 'bg-violet-400', hex: '#A78BFA' },
    { tw: 'bg-rose-500', hex: '#EF4444' },
    { tw: 'bg-slate-400', hex: '#94A3B8' },
  ];

  const rows = [...byCategory.entries()]
    .map(([label, value], i) => ({
      label,
      value,
      color: PALETTE[i % PALETTE.length].tw,
      hex: PALETTE[i % PALETTE.length].hex,
    }))
    .sort((a, b) => b.value - a.value);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  const conicStops = (() => {
    if (totalValue === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      const pct = (r.value / totalValue) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  return (
    <DashboardCard title="Stock Value by Category" rightSlot={<PeriodPill />}>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-base font-black leading-none text-ink">
              {formatKobo(totalValue).replace(/,/g, '')}
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
          {rows.length === 0 ? (
            <li className="text-xs text-slate-500">No categories yet.</li>
          ) : (
            rows.slice(0, 5).map((r) => {
              const pct = totalValue > 0 ? Math.round((r.value / totalValue) * 100) : 0;
              return (
                <li
                  key={r.label}
                  className="flex items-center justify-between gap-2 text-xs"
                >
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
            })
          )}
        </ul>
      </div>
    </DashboardCard>
  );
}
