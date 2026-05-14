import Link from 'next/link';
import {
  CalendarCheck,
  ClipboardList,
  Factory,
  Boxes,
  Truck,
  Receipt,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatKobo } from '@/lib/format';

/**
 * Today panel — surfaces every operational deadline / queue that touches
 * today's date. Each cluster links to the underlying list page. Empty
 * clusters get hidden so the panel stays tight.
 */
export async function DailyActionPanel({ userId }: { userId: string }) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [
    ordersDueToday,
    productionDueToday,
    lowMaterials,
    posExpectedToday,
    overdueInvoices,
  ] = await Promise.all([
    prisma.customerOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['NEW', 'CONFIRMED', 'IN_PRODUCTION'] },
        dueAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }],
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalKobo: true,
        priority: true,
      },
    }),
    prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
        plannedEndAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { plannedEndAt: 'asc' },
      take: 5,
      select: {
        id: true,
        productionNumber: true,
        items: { select: { product: { select: { name: true } } } },
      },
    }),
    inventoryService.computeLowStockMaterials(userId),
    prisma.purchaseOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: { in: ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
        expectedAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { expectedAt: 'asc' },
      take: 5,
      select: {
        id: true,
        poNumber: true,
        totalKobo: true,
        supplier: { select: { name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        status: { in: ['SENT', 'VIEWED', 'OVERDUE'] },
        dueDate: { lt: startOfDay },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        total: true,
        amountPaid: true,
        dueDate: true,
      },
    }),
  ]);

  const lowMaterialsToday = lowMaterials.slice(0, 5);

  const hasAny =
    ordersDueToday.length +
      productionDueToday.length +
      lowMaterialsToday.length +
      posExpectedToday.length +
      overdueInvoices.length >
    0;

  if (!hasAny) {
    return (
      <section className="card mb-6 flex items-center gap-3 p-4">
        <CalendarCheck className="text-emerald-600" size={20} />
        <div>
          <div className="text-sm font-bold text-emerald-700">
            Nothing on fire today
          </div>
          <p className="text-xs text-slate-500">
            No deadlines, no shortages, no overdue invoices. Plan ahead or take
            the win.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <CalendarCheck size={14} />
        Today
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ordersDueToday.length > 0 && (
          <Cluster
            icon={ClipboardList}
            label="Orders due"
            count={ordersDueToday.length}
            tone="brand"
          >
            <ul className="space-y-1 text-xs">
              {ordersDueToday.map((o) => (
                <li key={o.id} className="flex justify-between gap-2">
                  <Link
                    href={`/orders/${o.id}`}
                    className="truncate font-mono text-brand-700 hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <span className="num truncate text-slate-500">
                    {formatKobo(o.totalKobo)}
                  </span>
                </li>
              ))}
            </ul>
          </Cluster>
        )}
        {productionDueToday.length > 0 && (
          <Cluster
            icon={Factory}
            label="Production due"
            count={productionDueToday.length}
            tone="brand"
          >
            <ul className="space-y-1 text-xs">
              {productionDueToday.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <Link
                    href={`/production/${p.id}`}
                    className="truncate font-mono text-brand-700 hover:underline"
                  >
                    {p.productionNumber}
                  </Link>
                  <span className="truncate text-slate-500">
                    {p.items[0]?.product.name ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Cluster>
        )}
        {lowMaterialsToday.length > 0 && (
          <Cluster
            icon={Boxes}
            label="Materials low"
            count={lowMaterials.length}
            tone="amber"
          >
            <ul className="space-y-1 text-xs">
              {lowMaterialsToday.map((m) => (
                <li key={m.id} className="flex justify-between gap-2">
                  <Link
                    href={`/materials/${m.id}`}
                    className="truncate text-slate-700 hover:underline"
                  >
                    {m.name}
                  </Link>
                  <span className="num text-amber-700">
                    {m.stock} {m.unit}
                  </span>
                </li>
              ))}
            </ul>
          </Cluster>
        )}
        {posExpectedToday.length > 0 && (
          <Cluster
            icon={Truck}
            label="POs expected"
            count={posExpectedToday.length}
            tone="indigo"
          >
            <ul className="space-y-1 text-xs">
              {posExpectedToday.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <Link
                    href={`/purchase-orders/${p.id}`}
                    className="truncate font-mono text-brand-700 hover:underline"
                  >
                    {p.poNumber}
                  </Link>
                  <span className="truncate text-slate-500">
                    {p.supplier.name}
                  </span>
                </li>
              ))}
            </ul>
          </Cluster>
        )}
        {overdueInvoices.length > 0 && (
          <Cluster
            icon={Receipt}
            label="Invoices overdue"
            count={overdueInvoices.length}
            tone="rose"
          >
            <ul className="space-y-1 text-xs">
              {overdueInvoices.map((inv) => (
                <li key={inv.id} className="flex justify-between gap-2">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="truncate font-mono text-rose-700 hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                  <span className="num text-rose-700">
                    {formatKobo(inv.total - (inv.amountPaid ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
          </Cluster>
        )}
      </div>
    </section>
  );
}

function Cluster({
  icon: Icon,
  label,
  count,
  tone,
  children,
}: {
  icon: typeof CalendarCheck;
  label: string;
  count: number;
  tone: 'brand' | 'amber' | 'indigo' | 'rose';
  children: React.ReactNode;
}) {
  const toneCls = {
    brand: 'text-brand-700 border-brand-200 bg-brand-50/60',
    amber: 'text-amber-700 border-amber-200 bg-amber-50/60',
    indigo: 'text-indigo-700 border-indigo-200 bg-indigo-50/60',
    rose: 'text-rose-700 border-rose-200 bg-rose-50/60',
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${toneCls}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
          <Icon size={11} />
          {label}
        </span>
        <span className="num text-xs font-bold">{count}</span>
      </div>
      {children}
    </div>
  );
}
