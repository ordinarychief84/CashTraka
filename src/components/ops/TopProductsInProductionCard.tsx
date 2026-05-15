import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';

const STATUS_PROGRESS: Record<string, number> = {
  PLANNED: 0,
  MATERIALS_NEEDED: 0,
  READY_TO_PRODUCE: 10,
  IN_PRODUCTION: 50,
  COMPLETED: 100,
  DELAYED: 30,
  CANCELLED: 0,
};

/**
 * Top Products in Production · ranked rows showing product name +
 * planned quantity + progress bar. Progress is derived from
 * `quantityAccepted / quantityPlanned` when QC data is recorded;
 * otherwise it falls back to a status-based estimate so the bar still
 * communicates something useful while runs are in flight.
 */
export async function TopProductsInProductionCard({ userId }: { userId: string }) {
  const runs = await prisma.productionOrder.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION', 'COMPLETED', 'DELAYED'] },
    },
    orderBy: [{ status: 'asc' }, { plannedEndAt: 'asc' }],
    take: 20,
    include: {
      items: {
        include: { product: { select: { name: true } } },
        take: 1,
      },
    },
  });

  // Reduce to one row per product line — keep the first item's display.
  const rows = runs
    .map((r) => {
      const it = r.items[0];
      const planned = it?.quantity ?? 0;
      const accepted = r.quantityAccepted ?? 0;
      const progress = planned > 0
        ? Math.min(100, Math.round((accepted / planned) * 100))
        : STATUS_PROGRESS[r.status] ?? 0;
      return {
        id: r.id,
        name: it?.product?.name ?? r.title ?? 'Production',
        planned,
        progress: r.status === 'COMPLETED' ? 100 : progress,
        status: r.status,
      };
    })
    .filter((r) => r.planned > 0)
    .slice(0, 5);

  return (
    <DashboardCard title="Top Products in Production" rightSlot={<PeriodPill />}>
      {rows.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">
          No active production right now.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => {
            // Bar tone: brand for in-progress runs, success for completed,
            // owed for materials needed / delayed.
            const tone =
              r.status === 'COMPLETED'
                ? 'bg-success-500'
                : r.status === 'DELAYED' || r.status === 'MATERIALS_NEEDED'
                  ? 'bg-owed-500'
                  : 'bg-brand-500';
            return (
              <li key={r.id} className="flex items-center gap-3">
                <span className="num inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-ink">
                      {r.name}
                    </span>
                    <span className="num shrink-0 text-[10px] text-slate-500">
                      {r.planned} pcs · {r.progress}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${tone}`}
                      style={{ width: `${r.progress}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DashboardCard>
  );
}
