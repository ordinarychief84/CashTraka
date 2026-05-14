import Link from 'next/link';
import { ClipboardList, Plus, Layers } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { OrdersTable } from '@/components/ops/OrdersTable';
import { customerOrdersService } from '@/lib/services/customer-orders.service';

export const dynamic = 'force-dynamic';

type SP = { status?: string };

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const status = (searchParams.status?.split(',') as any) ?? undefined;
  const { rows: orders, total } = await customerOrdersService.listForUser(user.id, {
    status,
    take: 200,
  });

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Orders"
        subtitle={`${total} customer order${total === 1 ? '' : 's'}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/production" className="btn-pill-ghost">
              <Layers size={14} />
              Production
            </Link>
            <Link href="/orders/new" className="btn-pill-primary">
              <Plus size={14} />
              Add order
            </Link>
          </div>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No customer orders yet"
          description="Capture orders before you fulfil them. We'll thread them through production, packaging, and invoicing."
          actionHref="/orders/new"
          actionLabel="Create your first order"
        />
      ) : (
        <OrdersTable
          rows={orders.map((o: any) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            customerName: o.customerName,
            customerPhone: o.customerPhone ?? null,
            totalKobo: o.totalKobo,
            dueAt: o.dueAt ? o.dueAt.toISOString() : null,
            createdAt: o.createdAt.toISOString(),
            notes: o.notes,
            itemCount: o.items?.length ?? 0,
            productSummary:
              (o.items ?? [])
                .map((it: any) => `${it.quantity}× ${it.description}`)
                .slice(0, 2)
                .join(', ') || '',
            productionStatus: o.productionOrder?.status ?? null,
          }))}
        />
      )}
    </AppShell>
  );
}
