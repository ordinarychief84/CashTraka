import Link from 'next/link';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { SalesSubNav } from '@/components/SalesSubNav';
import { customerOrdersService } from '@/lib/services/customer-orders.service';
import { OrdersRackbeatTable, type OrderRackbeatRow } from '@/components/sales/OrdersRackbeatTable';

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

  const { rows: orders } = await customerOrdersService.listForUser(user.id, { take: 200 });

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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Orders
            </h1>
            <div className="flex flex-wrap items-center gap-2">
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
                Hide shipped lines
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Show lines
              </button>
              <Link
                href="/orders/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                + Create new
              </Link>
            </div>
          </div>

          <OrdersRackbeatTable rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
