import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Factory, Receipt as ReceiptIcon } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { CustomerOrderActions } from '@/components/ops/CustomerOrderActions';
import { CustomerHistoryCard } from '@/components/customers/CustomerHistoryCard';
import { ProductionReadinessCard } from '@/components/ops/ProductionReadinessCard';
import { OrderMarginCard } from '@/components/orders/OrderMarginCard';
import { WaCustomerNotifyButton } from '@/components/orders/WaCustomerNotifyButton';
import { customerOrdersService } from '@/lib/services/customer-orders.service';
import { whatsappSendService } from '@/lib/services/whatsapp-send.service';
import { formatKobo, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS_TIMELINE = ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED'];

export default async function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await guard();
  let order;
  try {
    order = await customerOrdersService.getForUser(user.id, params.id);
  } catch {
    notFound();
  }

  const currentIdx = STATUS_TIMELINE.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  // Decision 5 — lookup latest WhatsApp confirmation sends so the buttons
  // render their "sent {date}" state on first paint instead of the idle
  // "not yet notified" state when one has already gone out.
  const [confirmationSentAt, readySentAt] = await Promise.all([
    whatsappSendService.latestSentAt(user.id, order.id, 'order_confirmed'),
    order.productionOrderId
      ? whatsappSendService.latestSentAt(user.id, order.productionOrderId, 'production_done')
      : Promise.resolve(null),
  ]);
  const hasPhone = Boolean(order.customerPhone);
  const showConfirmationButton =
    hasPhone && !isCancelled && order.status !== 'NEW';
  const showReadyButton =
    hasPhone && order.productionOrderId && (order.status === 'READY' || order.status === 'DELIVERED');

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title={order.orderNumber}
        subtitle={order.customerName}
        backHref="/orders"
      />

      <div className="mb-5 card p-4">
        {isCancelled ? (
          <p className="text-sm font-semibold text-rose-700">This order was cancelled.</p>
        ) : (
          <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {STATUS_TIMELINE.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 ${
                    i <= currentIdx ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s.replace('_', ' ')}
                </span>
                {i < STATUS_TIMELINE.length - 1 && (
                  <span className={i < currentIdx ? 'text-emerald-400' : 'text-slate-300'}>→</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Items</h2>
            <ul className="divide-y divide-slate-100">
              {order.items.map((it) => (
                <li key={it.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{it.description}</p>
                    {it.product && (
                      <p className="text-xs text-slate-500">
                        Linked to <Link href={`/recipes/${it.product.id}`} className="text-brand-500 hover:underline">{it.product.name}</Link>
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm text-slate-700">
                    {it.quantity} × {formatKobo(it.unitPriceKobo)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-slate-600">Total</span>
              <span className="text-xl font-black text-slate-900">{formatKobo(order.totalKobo)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <Factory size={14} /> Production
              </h3>
              {order.productionOrder ? (
                <Link href={`/production/${order.productionOrder.id}`} className="text-sm font-mono font-semibold text-brand-500 hover:underline">
                  {order.productionOrder.productionNumber} <ExternalLink size={12} className="inline" />
                  <span className="ml-2 text-xs font-normal text-slate-500">{order.productionOrder.status.replace('_', ' ')}</span>
                </Link>
              ) : (
                <p className="text-sm text-slate-500">Not started.</p>
              )}
            </div>
            <div className="card p-4">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <ReceiptIcon size={14} /> Invoice
              </h3>
              {order.invoice ? (
                <Link href={`/invoices/${order.invoice.id}`} className="text-sm font-mono font-semibold text-brand-500 hover:underline">
                  {order.invoice.invoiceNumber} <ExternalLink size={12} className="inline" />
                  <span className="ml-2 text-xs font-normal text-slate-500">{order.invoice.status}</span>
                </Link>
              ) : (
                <p className="text-sm text-slate-500">Not issued.</p>
              )}
            </div>
          </div>

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
            <CustomerOrderActions
              orderId={order.id}
              status={order.status}
              hasProductionOrder={Boolean(order.productionOrderId)}
              hasInvoice={Boolean(order.invoiceId)}
            />
            {showConfirmationButton ? (
              <div className="mt-3 border-t border-border pt-3">
                <WaCustomerNotifyButton
                  customerOrderId={order.id}
                  kind="CONFIRMATION"
                  entityType="order"
                  entityId={order.id}
                  touchpointType="order_confirmed"
                  label="Send order confirmation"
                  lastSentAt={confirmationSentAt ? confirmationSentAt.toISOString() : null}
                />
              </div>
            ) : null}
            {showReadyButton && order.productionOrderId ? (
              <div className="mt-3 border-t border-border pt-3">
                <WaCustomerNotifyButton
                  customerOrderId={order.id}
                  kind="READY"
                  entityType="production"
                  entityId={order.productionOrderId}
                  touchpointType="production_done"
                  label="Send 'ready for pickup'"
                  lastSentAt={readySentAt ? readySentAt.toISOString() : null}
                />
              </div>
            ) : null}
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Customer</h2>
            <p className="text-sm font-medium text-slate-900">{order.customerName}</p>
            {order.customerPhone && <p className="text-xs text-slate-500">{order.customerPhone}</p>}
            <p className="mt-3 text-xs text-slate-400">Created {formatDateTime(order.createdAt)}</p>
            {order.dueAt && (
              <p className="text-xs text-slate-400">Due {formatDateTime(order.dueAt)}</p>
            )}
          </div>
          <OrderMarginCard userId={user.id} customerOrderId={order.id} />
          <ProductionReadinessCard userId={user.id} customerOrderId={order.id} />
          <CustomerHistoryCard userId={user.id} customerId={order.customerId ?? null} />
        </div>
      </div>
    </AppShell>
  );
}
