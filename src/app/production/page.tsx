import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { ItemsSubNav } from '@/components/ItemsSubNav';
import { productionOrdersService } from '@/lib/services/production-orders.service';
import { ProductionOrdersTable } from '@/components/ops/ProductionOrdersTable';
import { ProductionPageHeader } from '@/components/ops/ProductionPageHeader';

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

  const [{ rows: orders }, producableProducts, openCustomerOrders] = await Promise.all([
    productionOrdersService.listForUser(user.id, { status: statusFilter, take: 200 }),
    prisma.product.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { name: 'asc' },
      take: 200,
      select: { id: true, name: true, sku: true },
    }),
    prisma.customerOrder.findMany({
      where: { userId: user.id, deletedAt: null, status: { in: ['NEW', 'CONFIRMED'] }, productionOrderId: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, orderNumber: true, customerName: true },
    }),
  ]);

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
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <ItemsSubNav />

        <div className="flex-1 min-w-0">
          <ProductionPageHeader
            rowCount={rows.length}
            products={producableProducts}
            customerOrders={openCustomerOrders}
          />

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
