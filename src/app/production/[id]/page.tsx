import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ProductionOrderActions } from '@/components/ops/ProductionOrderActions';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { formatKobo, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ProductionDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();
  let order;
  try {
    order = await productionOrdersService.getForUser(user.id, params.id);
  } catch {
    notFound();
  }

  const [shortages, estimatedCostKobo] = await Promise.all([
    inventoryService.computeShortagesForOrder(user.id, order.id),
    inventoryService.computeProductionOrderCostKobo(user.id, order.id),
  ]);
  const hasShortages = shortages.some((s) => s.shortBy > 0);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={order.productionNumber}
        subtitle={order.status.replace('_', ' ')}
        backHref="/production"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Producing</h2>
            <ul className="divide-y divide-slate-100">
              {order.items.map((it) => (
                <li key={it.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{it.product.name}</p>
                    {it.product.sku && <p className="text-xs text-slate-500">SKU {it.product.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{it.quantity} units</p>
                    {it.unitCostKoboSnapshot != null && (
                      <p className="text-xs text-slate-500">
                        Unit cost {formatKobo(it.unitCostKoboSnapshot)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-slate-600">Estimated material cost</span>
              <span className="text-lg font-bold text-slate-900">{formatKobo(estimatedCostKobo)}</span>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <AlertTriangle size={14} /> Material shortages
            </h2>
            {shortages.length === 0 ? (
              <p className="text-sm text-emerald-700">Every material is available.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {shortages.map((s) => (
                  <li key={s.materialId} className="py-2 flex items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{s.materialName}</p>
                      <p className="text-xs text-slate-500">
                        Need {s.required} {s.unit}, have {s.onHand}
                      </p>
                    </div>
                    {s.shortBy > 0 ? (
                      <Link
                        href={`/purchase-orders/new?materialId=${s.materialId}&qty=${s.shortBy}`}
                        className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                      >
                        Short {s.shortBy} — buy
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600">OK</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {order.customerOrder && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Customer order</h2>
              <Link href={`/orders/${order.customerOrder.id}`} className="font-mono font-bold text-brand-500 hover:underline">
                {order.customerOrder.orderNumber}
              </Link>
            </div>
          )}

          {order.notes && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Notes</h2>
              <p className="whitespace-pre-line text-sm text-slate-700">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Actions</h2>
            <ProductionOrderActions
              orderId={order.id}
              status={order.status}
              hasShortages={hasShortages}
            />
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Timeline</h2>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>Created {formatDateTime(order.createdAt)}</li>
              {order.plannedStartAt && <li>Planned start {formatDateTime(order.plannedStartAt)}</li>}
              {order.plannedEndAt && <li>Planned end {formatDateTime(order.plannedEndAt)}</li>}
              {order.startedAt && <li>Started {formatDateTime(order.startedAt)}</li>}
              {order.completedAt && <li>Completed {formatDateTime(order.completedAt)}</li>}
            </ul>
          </div>
          {(order.batchNumber || order.manufacturedAt || order.expiresAt) ? (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                Batch / lot
              </h2>
              <ul className="space-y-2 text-sm">
                {order.batchNumber ? (
                  <li>
                    <span className="text-slate-500">Batch # </span>
                    <span className="font-mono font-bold text-ink">{order.batchNumber}</span>
                  </li>
                ) : null}
                {order.manufacturedAt ? (
                  <li>
                    <span className="text-slate-500">Manufactured </span>
                    <span className="font-semibold text-ink">
                      {new Date(order.manufacturedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </li>
                ) : null}
                {order.expiresAt ? (
                  <li>
                    <span className="text-slate-500">Best before </span>
                    <span className="font-semibold text-ink">
                      {new Date(order.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </li>
                ) : null}
              </ul>
              <p className="mt-3 text-[11px] text-slate-500">
                Print these on every unit. NAFDAC requires lot + manufacturing
                + expiry on food + cosmetics labels.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
