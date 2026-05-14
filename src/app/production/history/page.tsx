import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { guard } from '@/lib/guard';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { WorkHistoryTable } from '@/components/ops/WorkHistoryTable';

export const dynamic = 'force-dynamic';

/**
 * Work history — read-only ledger of every ProductionOrder the tenant
 * has run, alive or completed. Mirrors the role Prodio's "Work history"
 * plays: the report you scroll when month-end comes around or a customer
 * disputes a cost.
 *
 * CashTraka doesn't track worker-level time-on-task, machine costs, or
 * worker efficiency the way Prodio does — those concepts have no shipped
 * schema. We surface what we do track: when production started, when it
 * completed, total duration, batch + customer link, and the unit-cost
 * snapshot taken at completion.
 */
export default async function ProductionHistoryPage() {
  const user = await guard();

  const orders = await prisma.productionOrder.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      items: { include: { product: { select: { name: true } } } },
      customerOrder: { select: { orderNumber: true, customerName: true } },
    },
    take: 500,
  });

  const rows = orders.map((o) => {
    const durationMs =
      o.startedAt && o.completedAt
        ? new Date(o.completedAt).getTime() - new Date(o.startedAt).getTime()
        : o.startedAt && o.status === 'IN_PRODUCTION'
          ? Date.now() - new Date(o.startedAt).getTime()
          : null;
    const totalQty = o.items.reduce((s, it) => s + it.quantity, 0);
    const unitCostKoboTotal = o.items.reduce(
      (s, it) => s + (it.unitCostKoboSnapshot ?? 0) * it.quantity,
      0,
    );
    return {
      id: o.id,
      productionNumber: o.productionNumber,
      customerOrderNumber: o.customerOrder?.orderNumber ?? null,
      customerName: o.customerOrder?.customerName ?? null,
      productNames: o.items.map((it) => it.product?.name ?? 'Product'),
      totalQty,
      status: o.status,
      plannedStartAt: o.plannedStartAt ? o.plannedStartAt.toISOString() : null,
      startedAt: o.startedAt ? o.startedAt.toISOString() : null,
      completedAt: o.completedAt ? o.completedAt.toISOString() : null,
      durationMs,
      notes: o.notes,
      batchNumber: o.batchNumber ?? null,
      unitCostKoboTotal,
    };
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
        title="Work history"
        subtitle={`${orders.length} production run${orders.length === 1 ? '' : 's'} on record`}
        action={
          <Link
            href="/production"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={14} />
            Back to board
          </Link>
        }
      />

      <WorkHistoryTable rows={rows} />
    </AppShell>
  );
}
