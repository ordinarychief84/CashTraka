import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { prisma } from '@/lib/prisma';
import { SupplierInvoicesTable, type SupplierInvoiceRow } from '@/components/purchases/SupplierInvoicesTable';
import { SupplierInvoicesPageHeader } from '@/components/purchases/SupplierInvoicesPageHeader';

export const dynamic = 'force-dynamic';

export default async function SupplierInvoicesPage() {
  const user = await guard();

  const [orders, rawSuppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { supplier: { select: { id: true, name: true } } },
    }),
    prisma.supplier.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

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

  const suppliers = rawSuppliers.map((s, i) => ({
    id: s.id,
    name: s.name,
    number: 1001 + i,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <PurchasingSubNav />

        <div className="flex-1 min-w-0">
          <SupplierInvoicesPageHeader rowCount={rows.length} suppliers={suppliers} />
          <SupplierInvoicesTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
