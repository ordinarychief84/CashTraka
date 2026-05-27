import { notFound } from 'next/navigation';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { OrderDetailRackbeat, type OrderDetailData } from '@/components/sales/OrderDetailRackbeat';
import { customerOrdersService } from '@/lib/services/customer-orders.service';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const user = await guard();

  let order;
  try {
    order = await customerOrdersService.getForUser(user.id, params.id);
  } catch {
    notFound();
  }

  const data: OrderDetailData = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone ?? null,
    customerId: order.customerId ?? null,
    dueAt: order.dueAt ? order.dueAt.toISOString() : null,
    notes: order.notes ?? null,
    totalKobo: order.totalKobo,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it) => ({
      id: it.id,
      description: it.description,
      quantity: it.quantity,
      unitPriceKobo: it.unitPriceKobo,
      totalKobo: it.totalKobo,
      product: it.product
        ? { id: it.product.id, name: it.product.name, sku: it.product.sku ?? null }
        : null,
    })),
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone ?? null,
          address: order.customer.address ?? null,
        }
      : null,
    productionOrder: order.productionOrder
      ? {
          id: order.productionOrder.id,
          productionNumber: order.productionOrder.productionNumber,
          status: order.productionOrder.status,
        }
      : null,
    invoice: order.invoice
      ? {
          id: order.invoice.id,
          invoiceNumber: order.invoice.invoiceNumber,
          status: order.invoice.status,
        }
      : null,
  };

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex min-h-[calc(100vh-4rem)]">
        <SalesSubNav />
        <div className="flex-1 min-w-0 overflow-auto">
          <OrderDetailRackbeat order={data} />
        </div>
      </div>
    </AppShell>
  );
}
