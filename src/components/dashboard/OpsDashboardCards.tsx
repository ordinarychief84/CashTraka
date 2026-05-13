import Link from 'next/link';
import { AlertTriangle, Boxes, ClipboardList, Factory, Truck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';

/**
 * Server-component island that surfaces the operational-planning state
 * on the main dashboard. Five small cards:
 *   - Orders Pending          (NEW + CONFIRMED customer orders)
 *   - Production In Progress  (status=IN_PRODUCTION)
 *   - Low Materials           (count of materials at/below reorder level)
 *   - Material Shortages      (computed across active production runs)
 *   - Purchase Orders Pending (DRAFT/SENT/ORDERED/PARTIALLY_RECEIVED)
 *
 * Each card links to the relevant page so users can drill in fast.
 */
export async function OpsDashboardCards({ userId }: { userId: string }) {
  const [
    ordersPending,
    productionInProgress,
    purchaseOrdersPending,
    lowMaterials,
    shortages,
  ] = await Promise.all([
    prisma.customerOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED'] },
      },
    }),
    prisma.productionOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: 'IN_PRODUCTION',
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['DRAFT', 'SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
    }),
    inventoryService.computeLowStockMaterials(userId),
    inventoryService.computeShortages(userId),
  ]);

  const lowMaterialsCount = lowMaterials.length;
  const shortagesCount = shortages.length;

  const cards: {
    label: string;
    value: number;
    href: string;
    Icon: typeof ClipboardList;
    accent: string;
    subtitle?: string;
  }[] = [
    {
      label: 'Orders pending',
      value: ordersPending,
      href: '/orders?status=NEW',
      Icon: ClipboardList,
      accent: 'text-slate-700',
    },
    {
      label: 'Production in progress',
      value: productionInProgress,
      href: '/production?status=IN_PRODUCTION',
      Icon: Factory,
      accent: 'text-blue-700',
    },
    {
      label: 'Low materials',
      value: lowMaterialsCount,
      href: '/materials?lowStock=1',
      Icon: Boxes,
      accent: lowMaterialsCount > 0 ? 'text-amber-700' : 'text-slate-700',
    },
    {
      label: 'Material shortages',
      value: shortagesCount,
      href: '/inventory',
      Icon: AlertTriangle,
      accent: shortagesCount > 0 ? 'text-rose-700' : 'text-slate-700',
      subtitle: shortagesCount > 0 ? 'Across active production' : undefined,
    },
    {
      label: 'POs pending',
      value: purchaseOrdersPending,
      href: '/purchase-orders',
      Icon: Truck,
      accent: 'text-indigo-700',
    },
  ];

  // Hide the section entirely if every value is zero — keeps the
  // dashboard clean for sellers who don't use the ops pivot.
  const total = cards.reduce((sum, c) => sum + c.value, 0);
  if (total === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Operations</h2>
        <Link href="/orders" className="text-xs font-semibold text-brand-500 hover:underline">
          Open orders →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card flex flex-col gap-1 p-4 transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <c.Icon size={14} />
              {c.label}
            </div>
            <div className={`text-3xl font-black ${c.accent}`}>{c.value}</div>
            {c.subtitle && <p className="text-xs text-slate-400">{c.subtitle}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
