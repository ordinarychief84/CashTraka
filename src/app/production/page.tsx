import Link from 'next/link';
import { Plus, Settings2 } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { ProductionOrdersTable } from '@/components/ops/ProductionOrdersTable';

export const dynamic = 'force-dynamic';

type SP = { started?: string; finished?: string; cancelled?: string; q?: string };

export default async function ProductionPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();

  // Build status filter from Rackbeat-style dropdown values
  function buildStatusFilter(
    started: string | undefined,
    finished: string | undefined,
    cancelled: string | undefined,
  ): string[] | undefined {
    // started=all means all statuses; finished=no/yes; cancelled=no/yes
    if (cancelled === 'yes') return ['CANCELLED'];

    const active = ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION', 'DELAYED'];
    const completed = ['COMPLETED'];

    if (started === 'yes' && finished === 'no') return ['IN_PRODUCTION', 'DELAYED'];
    if (started === 'yes' && finished === 'yes') return completed;
    if (started === 'no') return ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE'];
    if (finished === 'no') return [...active];
    if (finished === 'yes') return completed;
    return undefined; // all
  }

  const statusFilter = buildStatusFilter(
    searchParams.started,
    searchParams.finished,
    searchParams.cancelled,
  ) as any;

  const { rows: orders } = await productionOrdersService.listForUser(user.id, {
    status: statusFilter,
    take: 200,
  });

  const rows = orders.map((o: any) => ({
    id: o.id,
    productionNumber: o.productionNumber,
    products: (o.items ?? []).map((it: any) => it.product?.name ?? 'Product').join(', '),
    customerName: o.customerOrder?.customerName ?? null,
    orderNumber: o.customerOrder?.orderNumber ?? null,
    customerOrderId: o.customerOrder?.id ?? null,
    startedAt: o.startedAt ? (o.startedAt as Date).toISOString() : null,
    completedAt: o.completedAt ? (o.completedAt as Date).toISOString() : null,
    status: o.status as string,
    plannedEndAt: o.plannedEndAt ? (o.plannedEndAt as Date).toISOString() : null,
    cancelled: o.status === 'CANCELLED',
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
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          {/* Page header */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-ink">
              {rows.length} Production orders
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
              >
                <Settings2 size={15} />
              </button>
              <Link
                href="/production/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                <Plus size={13} />
                Create new
              </Link>
            </div>
          </div>

          <ProductionOrdersTable
            rows={rows}
            startedParam={searchParams.started ?? 'all'}
            finishedParam={searchParams.finished ?? 'no'}
            cancelledParam={searchParams.cancelled ?? 'no'}
          />
        </div>
      </div>
    </AppShell>
  );
}
