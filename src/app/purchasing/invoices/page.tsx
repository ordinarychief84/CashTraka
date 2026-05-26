import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { prisma } from '@/lib/prisma';
import { SupplierInvoicesTable, type SupplierInvoiceRow } from '@/components/purchases/SupplierInvoicesTable';

export const dynamic = 'force-dynamic';

export default async function SupplierInvoicesPage() {
  const user = await guard();

  // Supplier invoices map to purchase orders — each PO that has been sent/received
  // becomes a "supplier invoice" entry.
  const orders = await prisma.purchaseOrder.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { supplier: { select: { id: true, name: true } } },
  });

  const rows: SupplierInvoiceRow[] = orders.map((o, i) => ({
    id: o.id,
    number: String(1001 + i),
    invoiceType: 'Invoice',
    dueDate: o.expectedAt ? o.expectedAt.toISOString() : null,
    purchaseOrderId: o.id,
    purchaseOrderNumber: o.poNumber,
    supplierId: o.supplier?.id ?? null,
    supplierName: o.supplier?.name ?? '—',
    heading: o.notes ?? '',
    booked: ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(o.status)
      ? 'Booked'
      : 'Draft',
    received:
      o.status === 'RECEIVED'
        ? 'Received'
        : o.status === 'PARTIALLY_RECEIVED'
          ? 'See order'
          : 'Not received',
    totalKobo: o.totalKobo,
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Supplier invoices
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Export ▾
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create new
              </button>
            </div>
          </div>

          <SupplierInvoicesTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
