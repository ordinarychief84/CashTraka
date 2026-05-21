import Link from 'next/link';
import { CalendarRange, Factory, History, List, Plus, Repeat } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { ProductionKanban } from '@/components/ops/ProductionKanban';
import { ProductionHeroKpis } from '@/components/ops/ProductionHeroKpis';
import { ProductionTimelineGantt } from '@/components/ops/ProductionTimelineGantt';
import { TopProductsInProductionCard } from '@/components/ops/TopProductsInProductionCard';
import { MaterialReadinessCard } from '@/components/ops/MaterialReadinessCard';
import { ProductionActionsCard } from '@/components/ops/ProductionActionsCard';
import { ProductionOverviewCard } from '@/components/dashboard/ProductionOverviewCard';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { formatDate, timeAgo } from '@/lib/format';
import { ShareScheduleButton } from '@/components/ops/ShareScheduleButton';
import { StatusFilterNavSelect } from '@/components/ui/StatusFilterNavSelect';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SP = { status?: string; view?: string };

export default async function ProductionPage(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const user = await guard();
  const view = (searchParams.view === 'list' ? 'list' : 'board') as 'board' | 'list';
  const status = (searchParams.status?.split(',') as any) ?? undefined;

  const { rows: orders } = await productionOrdersService.listForUser(user.id, {
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
            Production
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Plan, track and manage your production from start to finish.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-full border border-border">
            <Link
              href="/production?view=board"
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide',
                view === 'board'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <Factory size={12} />
              Board
            </Link>
            <Link
              href="/production?view=list"
              className={cn(
                'inline-flex items-center gap-1 border-l border-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide',
                view === 'list'
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <List size={12} />
              List
            </Link>
          </div>
          <Link href="/production/schedule" className="btn-pill-ghost">
            <CalendarRange size={14} />
            Calendar
          </Link>
          <Link href="/production/history" className="btn-pill-ghost">
            <History size={14} />
            Work history
          </Link>
          <Link href="/production/templates" className="btn-pill-ghost">
            <Repeat size={14} />
            Templates
          </Link>
          <ShareScheduleButton />
          <Link href="/production/new" className="btn-pill-primary">
            <Plus size={14} />
            New Production Order
          </Link>
        </div>
      </div>

      {/* 7 KPI tiles */}
      <ProductionHeroKpis userId={user.id} />

      {/* 2-col layout: main (board/list, 3/4) + right rail (status overview + top products, 1/4) */}
      <div className="mb-5 grid gap-5 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {/* Status filter — list view only */}
          {view === 'list' && (
            <div className="mb-4">
              <StatusFilterNavSelect
                current={searchParams.status ?? ''}
                baseHref="/production"
                extraParams={{ view: 'list' }}
                options={[
                  { value: '', label: 'All' },
                  { value: 'PLANNED', label: 'Planned' },
                  { value: 'MATERIALS_NEEDED', label: 'Materials needed' },
                  { value: 'READY_TO_PRODUCE', label: 'Ready to produce' },
                  { value: 'IN_PRODUCTION', label: 'In production' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'DELAYED', label: 'Delayed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>
          )}

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
                        <StatusBadge status={o.status} />
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
          )}
        </div>
        <aside className="space-y-4 lg:col-span-1">
          <ProductionOverviewCard userId={user.id} />
          <TopProductsInProductionCard userId={user.id} />
        </aside>
      </div>

      {/* Bottom row: Gantt timeline (2/3) + Material Readiness + Production Actions (1/3 stacked) */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductionTimelineGantt userId={user.id} />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <MaterialReadinessCard userId={user.id} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <ProductionActionsCard userId={user.id} />
        </div>
      </div>
    </AppShell>
  );
}
