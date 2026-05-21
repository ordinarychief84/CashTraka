import { notFound } from 'next/navigation';
import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { PurchaseOrderActions } from '@/components/ops/PurchaseOrderActions';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { formatKobo, formatDate, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrderDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await guard();
  let po;
  try {
    po = await purchaseOrdersService.getForUser(user.id, params.id);
  } catch {
    notFound();
  }

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader title={po.poNumber} subtitle={`${po.supplier.name} · ${po.status.replace('_', ' ')}`} backHref="/purchase-orders" />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Items</h2>
            <ul className="divide-y divide-slate-100">
              {po.items.map((it) => (
                <li key={it.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      <Link href={`/materials/${it.material.id}`} className="hover:underline">
                        {it.material.name}
                      </Link>
                    </p>
                    <p className="text-xs text-slate-500">
                      {it.quantity} {it.material.unit} @ {formatKobo(it.unitCostKobo)}
                      {it.quantityReceived > 0 && (
                        <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                          {it.quantityReceived} received
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-bold text-slate-900">{formatKobo(it.totalKobo)}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-slate-600">Total</span>
              <span className="text-xl font-black text-slate-900">{formatKobo(po.totalKobo)}</span>
            </div>
          </div>

          {po.notes && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Notes</h2>
              <p className="whitespace-pre-line text-sm text-slate-700">{po.notes}</p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Actions</h2>
            <PurchaseOrderActions
              orderId={po.id}
              status={po.status}
              items={po.items.map((it) => ({
                id: it.id,
                materialName: it.material.name,
                unit: it.material.unit,
                quantity: it.quantity,
                quantityReceived: it.quantityReceived,
              }))}
            />
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Supplier</h2>
            <Link href={`/suppliers/${po.supplier.id}`} className="text-sm font-medium text-brand-500 hover:underline">
              {po.supplier.name}
            </Link>
            {po.supplier.phone && <p className="text-xs text-slate-500">{po.supplier.phone}</p>}
            {po.supplier.email && <p className="text-xs text-slate-500">{po.supplier.email}</p>}
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Timeline</h2>
            <ul className="space-y-1 text-xs text-slate-500">
              <li>Created {formatDateTime(po.createdAt)}</li>
              {po.expectedAt && <li>Expected {formatDate(po.expectedAt)}</li>}
              {po.receivedAt && <li>Received {formatDateTime(po.receivedAt)}</li>}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
