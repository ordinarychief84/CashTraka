import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { ProductionOrderActions } from '@/components/ops/ProductionOrderActions';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { inventoryService } from '@/lib/services/inventory.service';
import { CustomerHistoryCard } from '@/components/customers/CustomerHistoryCard';
import { WaCustomerNotifyButton } from '@/components/orders/WaCustomerNotifyButton';
import { whatsappSendService } from '@/lib/services/whatsapp-send.service';
import { hasFeature } from '@/lib/gate';
import { BatchCostPanel } from '@/components/production/BatchCostPanel';
import { prisma } from '@/lib/prisma';
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

  const [shortages, estimatedCostKobo, linkedCustomerOrder] = await Promise.all([
    inventoryService.computeShortagesForOrder(user.id, order.id),
    inventoryService.computeProductionOrderCostKobo(user.id, order.id),
    // Resolve the linked CustomerOrder's customerId for the history card.
    // production-orders.service only selects {id, orderNumber, customerName}
    // so we re-fetch here rather than widening the service contract.
    order.customerOrder
      ? prisma.customerOrder.findUnique({
          where: { id: order.customerOrder.id },
          select: { customerId: true },
        })
      : Promise.resolve(null),
  ]);
  const hasShortages = shortages.some((s) => s.shortBy > 0);
  const customerId = linkedCustomerOrder?.customerId ?? null;

  // Decision 5 — "Ready for pickup" WhatsApp notification surfaces here
  // once the production order is COMPLETED and there's a linked customer
  // order with a phone number. The wa.me URL is minted on click via the
  // customer-orders /notify endpoint.
  const waReadySentAt =
    order.status === 'COMPLETED' && order.customerOrder?.id
      ? await whatsappSendService.latestSentAt(user.id, order.id, 'production_done')
      : null;
  const showReadyButton =
    order.status === 'COMPLETED' && Boolean(order.customerOrder?.id);

  // Batch Cost Intelligence — fetch the persisted result when the run is
  // COMPLETED so the panel can hydrate on first paint. Lines are loaded
  // here too; the panel polls when nothing has been calculated yet.
  const batchCostFeature = hasFeature(user, 'batchCostIntelligence');
  let initialBatchCost: React.ComponentProps<typeof BatchCostPanel>['initial'] = null;
  if (order.status === 'COMPLETED' && batchCostFeature) {
    const [costRow, lineRows] = await Promise.all([
      prisma.productionOrder.findUnique({
        where: { id: order.id },
        select: {
          materialCostKobo: true,
          labourCostKobo: true,
          overheadCostKobo: true,
          totalCostKobo: true,
          revenueKobo: true,
          grossMarginBps: true,
          costPerUnitKobo: true,
          hasUnpricedMaterials: true,
          batchCostCalculatedAt: true,
          customerOrder: { select: { id: true } },
        },
      }),
      prisma.batchCostLineItem.findMany({
        where: { productionOrderId: order.id, userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    if (costRow && costRow.batchCostCalculatedAt) {
      initialBatchCost = {
        materialCostKobo: costRow.materialCostKobo ?? 0,
        labourCostKobo: costRow.labourCostKobo,
        overheadCostKobo: costRow.overheadCostKobo,
        totalCostKobo: costRow.totalCostKobo ?? 0,
        revenueKobo: costRow.revenueKobo ?? 0,
        grossMarginBps: costRow.grossMarginBps ?? 0,
        costPerUnitKobo: costRow.costPerUnitKobo ?? 0,
        hasUnpricedMaterials: costRow.hasUnpricedMaterials,
        batchCostCalculatedAt: costRow.batchCostCalculatedAt.toISOString(),
        hasLinkedCustomerOrder: Boolean(costRow.customerOrder),
        lineItems: lineRows.map((l) => ({
          rawMaterialId: l.rawMaterialId,
          rawMaterialName: l.rawMaterialName,
          qtyNeeded: Number(l.qtyNeeded),
          unit: l.unit,
          unitPriceKobo: l.unitPriceKobo,
          totalKobo: l.totalKobo,
          isMissing: l.isMissing,
        })),
      };
    }
  }

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
              <AlertTriangle size={14} /> Material readiness
            </h2>
            {shortages.length === 0 ? (
              <p className="text-sm text-emerald-700">
                Every material is available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5">Material</th>
                      <th className="px-2 py-1.5 text-right">Required</th>
                      <th className="px-2 py-1.5 text-right">On hand</th>
                      <th className="px-2 py-1.5 text-right">Short</th>
                      <th className="px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shortages.map((s) => {
                      const short = s.shortBy > 0;
                      return (
                        <tr key={s.materialId}>
                          <td className="px-2 py-2 font-medium text-slate-900">
                            {s.materialName}
                          </td>
                          <td className="num px-2 py-2 text-right text-slate-600">
                            {s.required} {s.unit}
                          </td>
                          <td className="num px-2 py-2 text-right text-slate-600">
                            {s.onHand} {s.unit}
                          </td>
                          <td className="num px-2 py-2 text-right">
                            <span
                              className={
                                short
                                  ? 'font-bold text-rose-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {short ? s.shortBy : 'OK'}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            {short && (
                              <Link
                                href={`/purchase-orders/new?materialId=${s.materialId}&qty=${s.shortBy}`}
                                className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
                              >
                                Buy
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* QC summary panel — only after completion. */}
          {order.status === 'COMPLETED' &&
            (order.quantityProduced != null ||
              order.quantityDamaged != null ||
              order.quantityAccepted != null) && (
              <div className="card p-5">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Quality check
                </h2>
                <dl className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <dt className="text-[10px] font-bold uppercase text-slate-500">
                      Produced
                    </dt>
                    <dd className="num mt-0.5 text-xl font-black text-slate-800">
                      {order.quantityProduced ?? '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
                    <dt className="text-[10px] font-bold uppercase text-rose-700">
                      Damaged
                    </dt>
                    <dd className="num mt-0.5 text-xl font-black text-rose-700">
                      {order.quantityDamaged ?? 0}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                    <dt className="text-[10px] font-bold uppercase text-emerald-700">
                      Accepted (to stock)
                    </dt>
                    <dd className="num mt-0.5 text-xl font-black text-emerald-700">
                      {order.quantityAccepted ?? '—'}
                    </dd>
                  </div>
                </dl>
                {order.quantityProduced != null &&
                  order.quantityProduced > 0 && (
                    <p className="mt-3 text-xs text-slate-500">
                      Yield:{' '}
                      <strong>
                        {Math.round(
                          ((order.quantityAccepted ?? 0) /
                            order.quantityProduced) *
                            100,
                        )}
                        %
                      </strong>
                    </p>
                  )}
              </div>
            )}

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

          {/* Batch Cost Intelligence — only renders for COMPLETED runs.
              For PLANNED / IN_PRODUCTION runs the panel is hidden entirely.
              Free users see the UpgradeChip inside the panel. */}
          {order.status === 'COMPLETED' ? (
            <BatchCostPanel
              productionOrderId={order.id}
              hasFeature={batchCostFeature}
              initial={initialBatchCost}
            />
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Actions</h2>
            <ProductionOrderActions
              orderId={order.id}
              status={order.status}
              hasShortages={hasShortages}
              plannedQuantity={order.items.reduce(
                (s, it) => s + it.quantity,
                0,
              )}
            />
            {showReadyButton && order.customerOrder?.id ? (
              <div className="mt-3 border-t border-border pt-3">
                <WaCustomerNotifyButton
                  customerOrderId={order.customerOrder.id}
                  kind="READY"
                  entityType="production"
                  entityId={order.id}
                  touchpointType="production_done"
                  label="Send 'ready for pickup'"
                  lastSentAt={waReadySentAt ? waReadySentAt.toISOString() : null}
                />
              </div>
            ) : null}
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
          <CustomerHistoryCard userId={user.id} customerId={customerId} />
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
