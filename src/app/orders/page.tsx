import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { customerOrdersService } from '@/lib/services/customer-orders.service';
import { OrdersRackbeatTable, type OrderRackbeatRow } from '@/components/sales/OrdersRackbeatTable';
import { OrdersPageHeader } from '@/components/sales/OrdersPageHeader';

export const dynamic = 'force-dynamic';

function deriveDeliveryStatus(status: string): string {
  if (status === 'DELIVERED') return 'Shipped';
  if (status === 'READY') return 'Ready for shipping';
  return 'Not shipped';
}

function deriveInvoiceStatus(status: string, invoiceId: string | null): string {
  if (invoiceId) return 'Invoiced';
  if (status === 'DELIVERED' || status === 'READY') return 'Ready for invoicing';
  return 'Not invoiced';
}

export default async function OrdersPage() {
  const user = await guard();

  const [{ rows: orders }, rawCustomers] = await Promise.all([
    customerOrdersService.listForUser(user.id, { take: 200 }),
    prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
      take: 500,
      select: { id: true, name: true },
    }),
  ]);

  const rows: OrderRackbeatRow[] = orders.map((o: any) => ({
    id: o.id,
    number: o.orderNumber,
    customerName: o.customerName,
    customerId: o.customerId ?? null,
    orderStatus: o.status,
    deliveryStatus: deriveDeliveryStatus(o.status),
    invoiceStatus: deriveInvoiceStatus(o.status, o.invoiceId ?? null),
    deliveryDate: o.dueAt ? o.dueAt.toISOString() : null,
    totalKobo: o.totalKobo,
  }));

  const customers = rawCustomers.map((c, i) => ({
    id: c.id,
    name: c.name,
    email: null as string | null,
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
      <div className="flex min-h-[calc(100vh-8rem)] gap-6">
        <SalesSubNav />

        <div className="flex-1 min-w-0">
          <OrdersPageHeader rowCount={rows.length} customers={customers} />
          <OrdersRackbeatTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
