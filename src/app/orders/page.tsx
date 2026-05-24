import Link from 'next/link';
import { ClipboardList, Plus, Download } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { OrdersTable } from '@/components/ops/OrdersTable';
import { OrdersHeroKpis } from '@/components/ops/OrdersHeroKpis';
import { customerOrdersService } from '@/lib/services/customer-orders.service';

export const dynamic = 'force-dynamic';

type SP = { status?: string };

export default async function OrdersPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const status = (searchParams.status?.split(',') as any) ?? undefined;
  const { rows: orders, total: _total } = await customerOrdersService.listForUser(user.id, {
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
      {/* Page header — matches the approved comp */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink md:text-[28px]">
            Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage customer orders and track fulfillment from start to finish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/orders/export" className="btn-pill-ghost">
            <Download size={14} />
            Export
          </a>
          <Link href="/orders/new" className="btn-pill-primary">
            <Plus size={14} />
            New Order
          </Link>
        </div>
      </div>

      {/* 5 KPI tiles */}
      <OrdersHeroKpis userId={user.id} />

      {/* Full-width orders table */}
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
