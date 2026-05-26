import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { suppliersService } from '@/lib/services/suppliers.service';
import { PurchaseOrdersTable, type PORow } from '@/components/purchases/PurchaseOrdersTable';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
  const user = await guard();

  const [{ rows: orders }] = await Promise.all([
    purchaseOrdersService.listForUser(user.id, { take: 200 }),
  ]);

  const rows: PORow[] = orders.map((o) => ({
    id: o.id,
    poNumber: o.poNumber,
    supplierName: o.supplier?.name ?? 'Supplier',
    status: o.status,
    totalKobo: o.totalKobo,
    expectedAt: o.expectedAt ? o.expectedAt.toISOString() : null,
    receivedAt: o.receivedAt ? o.receivedAt.toISOString() : null,
    deliveredCount: o.items.reduce((s, it) => s + (it.quantityReceived ?? 0), 0),
    totalQtyCount: o.items.reduce((s, it) => s + it.quantity, 0),
    notes: o.notes ?? null,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <PurchasingSubNav />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Purchase orders
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Bulk actions ▾
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Import / Export ▾
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Hide received lines
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Show lines
              </button>
              <Link
                href="/purchase-orders/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create new
              </Link>
            </div>
          </div>

          <PurchaseOrdersTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
