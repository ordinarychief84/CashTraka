import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PurchasingSubNav } from '@/components/PurchasingSubNav';
import { prisma } from '@/lib/prisma';
import { purchaseOrdersService } from '@/lib/services/purchase-orders.service';
import { PurchaseOrdersTable, type PORow } from '@/components/purchases/PurchaseOrdersTable';
import { PurchaseOrdersPageHeader } from '@/components/purchases/PurchaseOrdersPageHeader';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
  const user = await guard();

  const [{ rows: orders }, rawSuppliers] = await Promise.all([
    purchaseOrdersService.listForUser(user.id, { take: 200 }),
    prisma.supplier.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
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
          <PurchaseOrdersPageHeader rowCount={rows.length} suppliers={suppliers} />
          <PurchaseOrdersTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
