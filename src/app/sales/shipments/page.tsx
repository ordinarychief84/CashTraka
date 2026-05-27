import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { ShipmentsTable, type ShipmentRow } from '@/components/sales/ShipmentsTable';

export const dynamic = 'force-dynamic';

export default async function ShipmentsPage() {
  const user = await guard();

  // Shipments = CustomerOrders that are READY or DELIVERED
  const orders = await prisma.customerOrder.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      status: { in: ['READY', 'DELIVERED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      customer: { select: { id: true, name: true } },
    },
  });

  const rows: ShipmentRow[] = orders.map((o, i) => ({
    id: o.id,
    number: String(i + 1),
    customerName: o.customerName,
    customerId: o.customerId,
    orderNumber: o.orderNumber,
    orderId: o.id,
    deliveryResponsible: user.name ?? 'User',
    picked: o.status === 'DELIVERED' ? 'Picked' : 'Not picked',
    sent: o.status === 'DELIVERED' ? 'Shipped' : 'Not shipped',
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
        <SalesSubNav />

        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} {rows.length === 1 ? 'Shipment' : 'Shipments'}
            </h1>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Bulk actions ▾
            </button>
          </div>

          <ShipmentsTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
