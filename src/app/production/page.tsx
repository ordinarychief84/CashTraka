import Link from 'next/link';
import { CalendarRange, Factory, History, List, Plus } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProductionKanban } from '@/components/ops/ProductionKanban';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { formatDate, timeAgo } from '@/lib/format';
import { ShareScheduleButton } from '@/components/ops/ShareScheduleButton';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUS_COLOURS: Record<string, string> = {
  PLANNED: 'bg-slate-100 text-slate-700',
  MATERIALS_NEEDED: 'bg-amber-100 text-amber-800',
  IN_PRODUCTION: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  DELAYED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
};

type SP = { status?: string; view?: string };

export default async function ProductionPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const view = (searchParams.view === 'list' ? 'list' : 'board') as 'board' | 'list';
  const status = (searchParams.status?.split(',') as any) ?? undefined;

  const { rows: orders, total } = await productionOrdersService.listForUser(user.id, {
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
        title="Production schedule"
        subtitle={`${total} run${total === 1 ? '' : 's'} · ${
          view === 'board' ? 'Board view' : 'List view'
        }`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-border">
              <Link
                href="/production?view=board"
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold',
                  view === 'board'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                <Factory size={12} />
                Board
              </Link>
              <Link
                href="/production?view=list"
                className={cn(
                  'inline-flex items-center gap-1 border-l border-border px-2.5 py-1.5 text-xs font-semibold',
                  view === 'list'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                <List size={12} />
                List
              </Link>
            </div>
            <Link
              href="/production/schedule"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CalendarRange size={14} />
              Calendar
            </Link>
            <Link
              href="/production/history"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <History size={14} />
              Work history
            </Link>
            <ShareScheduleButton />
            <Link
              href="/production/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus size={14} />
              Add task
            </Link>
          </div>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No production runs yet"
          description="Production orders are usually spawned from a customer order. Confirm an order to plan production automatically."
          actionHref="/orders"
          actionLabel="Go to orders"
        />
      ) : view === 'board' ? (
        <ProductionKanban
          cards={orders.map((o: any) => ({
            id: o.id,
            productionNumber: o.productionNumber,
            status: o.status,
            plannedStartAt: o.plannedStartAt
              ? o.plannedStartAt.toISOString()
              : null,
            plannedEndAt: o.plannedEndAt ? o.plannedEndAt.toISOString() : null,
            startedAt: o.startedAt ? o.startedAt.toISOString() : null,
            completedAt: o.completedAt ? o.completedAt.toISOString() : null,
            customerOrder: o.customerOrder
              ? {
                  orderNumber: o.customerOrder.orderNumber,
                  customerName: o.customerOrder.customerName,
                }
              : null,
            items: (o.items ?? []).map((it: any) => ({
              productId: it.productId,
              productName: it.product?.name ?? 'Product',
              quantity: it.quantity,
            })),
            batchNumber: o.batchNumber ?? null,
            notes: o.notes ?? null,
          }))}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION', 'COMPLETED'].map((s) => (
              <Link
                key={s}
                href={`/production?view=list&status=${s}`}
                className={`rounded-full px-3 py-1 ${STATUS_COLOURS[s]} ${
                  searchParams.status === s ? 'ring-2 ring-offset-1 ring-brand-400' : ''
                }`}
              >
                {s.replace('_', ' ')}
              </Link>
            ))}
            <Link href="/production?view=list" className="rounded-full px-3 py-1 text-slate-500 hover:underline">
              All
            </Link>
          </div>

          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/production/${o.id}`}
                  className="card flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {o.productionNumber}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_COLOURS[o.status] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {o.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {o.items
                        .map((it) => `${it.quantity} × ${it.product.name}`)
                        .join(', ')}
                    </p>
                    {o.customerOrder && (
                      <p className="text-xs text-slate-400">
                        From {o.customerOrder.orderNumber} ({o.customerOrder.customerName})
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {o.plannedEndAt && (
                      <p className="text-xs text-slate-500">due {formatDate(o.plannedEndAt)}</p>
                    )}
                    <p className="text-xs text-slate-400">{timeAgo(o.createdAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
