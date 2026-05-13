import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Boxes, FileText } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { SupplierForm } from '@/components/ops/SupplierForm';
import { suppliersService } from '@/lib/services/suppliers.service';
import { formatKobo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();
  let supplier;
  try {
    supplier = await suppliersService.getForUser(user.id, params.id);
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
      <PageHeader title={supplier.name} backHref="/suppliers" />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Details</h2>
            <SupplierForm initial={supplier} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <Boxes size={14} /> Materials supplied
            </h2>
            {supplier.rawMaterials.length === 0 ? (
              <p className="text-sm text-slate-500">
                No materials linked to this supplier yet.{' '}
                <Link href="/materials/new" className="text-brand-500 hover:underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {supplier.rawMaterials.map((m) => (
                  <li key={m.id} className="py-2 flex items-center justify-between gap-2">
                    <Link href={`/materials/${m.id}`} className="text-sm font-medium text-slate-900 hover:text-brand-500">
                      {m.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {m.stock} {m.unit}
                      {m.reorderLevel > 0 && (
                        <span className={m.stock <= m.reorderLevel ? 'ml-2 text-rose-600' : 'ml-2 text-slate-400'}>
                          (reorder at {m.reorderLevel})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <FileText size={14} /> Active purchase orders
            </h2>
            {supplier.purchaseOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No open POs.</p>
            ) : (
              <ul className="space-y-2">
                {supplier.purchaseOrders.map((po) => (
                  <li key={po.id}>
                    <Link href={`/purchase-orders/${po.id}`} className="flex items-center justify-between text-sm">
                      <span className="font-mono font-semibold text-slate-900">{po.poNumber}</span>
                      <span className="text-xs text-slate-500">{po.status}</span>
                    </Link>
                    <p className="text-xs text-slate-500">{formatKobo(po.totalKobo)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href={`/purchase-orders/new?supplierId=${supplier.id}`} className="btn-secondary mt-4 inline-flex w-full justify-center">
              New PO for this supplier
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
