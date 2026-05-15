import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Coins,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * 6 KPI tiles across the top of /products. Mirrors the approved comp:
 *   Total Products · Active Products · Low Stock · Out of Stock ·
 *   Total Stock Value · Products Sold (This Week).
 */
export async function ProductsHeroKpis({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    total,
    active,
    outOfStock,
    lowStockList,
    productsForValue,
    soldThisWeek,
  ] = await Promise.all([
    prisma.product.count({ where: { userId, archived: false } }),
    prisma.product.count({
      where: { userId, archived: false, status: 'ACTIVE' },
    }),
    prisma.product.count({
      where: { userId, archived: false, trackStock: true, stock: 0 },
    }),
    inventoryService.computeLowStockProducts(userId),
    prisma.product.findMany({
      where: { userId, archived: false },
      select: { stock: true, priceKobo: true },
    }),
    prisma.stockMovement.aggregate({
      where: {
        userId,
        itemType: 'PRODUCT',
        reason: { in: ['SALE'] },
        createdAt: { gte: weekStart },
      },
      _sum: { delta: true },
    }),
  ]);

  const stockValueKobo = productsForValue.reduce(
    (sum, p) => sum + p.stock * p.priceKobo,
    0,
  );
  const unitsSold = Math.abs(soldThisWeek._sum.delta ?? 0);

  const tiles: {
    label: string;
    value: string;
    delta: number | null;
    Icon: LucideIcon;
    iconTone: 'brand' | 'success' | 'owed' | 'rose';
  }[] = [
    {
      label: 'Total Products',
      value: String(total),
      delta: null,
      Icon: Package,
      iconTone: 'brand',
    },
    {
      label: 'Active Products',
      value: String(active),
      delta: null,
      Icon: CheckCircle2,
      iconTone: 'success',
    },
    {
      label: 'Low Stock Products',
      value: String(lowStockList.length),
      delta: null,
      Icon: AlertTriangle,
      iconTone: 'owed',
    },
    {
      label: 'Out of Stock',
      value: String(outOfStock),
      delta: null,
      Icon: XCircle,
      iconTone: 'rose',
    },
    {
      label: 'Total Stock Value',
      value: formatKobo(stockValueKobo),
      delta: null,
      Icon: Coins,
      iconTone: 'brand',
    },
    {
      label: 'Products Sold (7d)',
      value: unitsSold.toLocaleString('en-NG'),
      delta: null,
      Icon: TrendingUp,
      iconTone: 'brand',
    },
  ];

  const ICON_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    owed: 'bg-owed-50 text-owed-700',
    success: 'bg-success-100 text-success-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <section className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-2xl border border-border bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {t.label}
              </div>
              <div className="num mt-2 truncate text-[26px] font-black leading-tight text-ink md:text-[28px]">
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
          {t.delta !== null && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold',
                t.delta >= 0 ? 'text-success-700' : 'text-rose-600',
              )}
            >
              {t.delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
              {Math.abs(t.delta)}% vs last week
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
