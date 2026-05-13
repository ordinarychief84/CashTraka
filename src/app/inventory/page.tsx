import Link from 'next/link';
import { AlertTriangle, Clock, Package } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { inventoryService } from '@/lib/services/inventory.service';

export const dynamic = 'force-dynamic';

export default async function InventoryOverviewPage() {
  const user = await guard();
  const [lowMaterials, lowProducts, shortages, expiring] = await Promise.all([
    inventoryService.computeLowStockMaterials(user.id),
    inventoryService.computeLowStockProducts(user.id),
    inventoryService.computeShortages(user.id),
    inventoryService.computeExpiringMaterials(user.id, 14),
  ]);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Inventory"
        subtitle="What's low, what's needed, what's expiring."
        action={
          <Link href="/inventory/movements" className="btn-secondary inline-flex items-center gap-2">
            View ledger
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <AlertTriangle size={14} /> Low raw materials
          </h2>
          {lowMaterials.length === 0 ? (
            <p className="text-sm text-emerald-700">Every material is above its reorder level.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowMaterials.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between text-sm">
                  <Link href={`/materials/${m.id}`} className="font-medium text-slate-900 hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-rose-600 font-bold">
                    {m.stock} / {m.reorderLevel} {m.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <Package size={14} /> Low finished products
          </h2>
          {lowProducts.length === 0 ? (
            <p className="text-sm text-emerald-700">No finished products below threshold.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowProducts.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <Link href={`/products/${p.id}`} className="font-medium text-slate-900 hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-rose-600 font-bold">{p.stock} / {p.lowStockAt}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <AlertTriangle size={14} /> Material shortages (active production)
          </h2>
          {shortages.length === 0 ? (
            <p className="text-sm text-emerald-700">All active production runs have enough materials.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shortages.map((s) => (
                <li key={s.materialId} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{s.materialName}</span>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                      short {s.shortBy} {s.unit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Needed for {s.productionNumbers.join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <Clock size={14} /> Expiring within 14 days
          </h2>
          {expiring.length === 0 ? (
            <p className="text-sm text-emerald-700">Nothing expiring soon.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expiring.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between text-sm">
                  <Link href={`/materials/${m.id}`} className="font-medium text-slate-900 hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-amber-700 font-semibold">
                    {m.expiresAt ? new Date(m.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
