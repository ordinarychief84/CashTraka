import { prisma } from '@/lib/prisma';
import { DashboardCard } from './DashboardCard';

/**
 * Production Overview — compact horizontal stacked bar + tight legend.
 *
 * The previous design used a 128 px conic-gradient donut that dominated
 * the card. Sellers don't get extra information from a donut over a
 * progress bar — both encode part-to-whole — so we switched to a stacked
 * bar that reads at a glance and frees up vertical space.
 */
export async function ProductionOverviewCard({ userId }: { userId: string }) {
  const counts = await prisma.productionOrder.groupBy({
    by: ['status'],
    where: { userId, deletedAt: null },
    _count: { _all: true },
  });

  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const planned = (byStatus.get('PLANNED') ?? 0) + (byStatus.get('MATERIALS_NEEDED') ?? 0);
  const inProduction = byStatus.get('IN_PRODUCTION') ?? 0;
  const completed = byStatus.get('COMPLETED') ?? 0;
  const delayed = byStatus.get('DELAYED') ?? 0;
  const cancelled = byStatus.get('CANCELLED') ?? 0;

  const total = planned + inProduction + completed + delayed + cancelled;

  const rows = [
    { label: 'Planned',       count: planned,      color: 'bg-brand-200',   dot: 'bg-brand-300' },
    { label: 'In production', count: inProduction, color: 'bg-brand-500',   dot: 'bg-brand-500' },
    { label: 'Completed',     count: completed,    color: 'bg-success-500', dot: 'bg-success-500' },
    { label: 'Delayed',       count: delayed,      color: 'bg-owed-500',    dot: 'bg-owed-500' },
    { label: 'Cancelled',     count: cancelled,    color: 'bg-slate-300',   dot: 'bg-slate-300' },
  ];

  return (
    <DashboardCard title="Production overview" viewAllHref="/production">
      {/* Total + active count */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="num text-2xl font-black leading-none text-ink">{total}</span>
        <span className="text-[11px] font-medium text-slate-500">
          {total === 1 ? 'production order' : 'production orders'}
        </span>
      </div>

      {/* Stacked progress bar */}
      <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {total > 0 ? (
          rows
            .filter((r) => r.count > 0)
            .map((r) => (
              <div
                key={r.label}
                className={r.color}
                style={{ width: `${(r.count / total) * 100}%` }}
                title={`${r.label}: ${r.count}`}
              />
            ))
        ) : null}
      </div>

      {/* Legend */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <li key={r.label} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
                {r.label}
              </span>
              <span className="num text-slate-500">
                <span className="font-semibold text-ink">{r.count}</span>
                {total > 0 && <span className="ml-1 text-slate-400">{pct}%</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {total === 0 && (
        <p className="mt-3 text-[12px] text-slate-400">No production orders yet.</p>
      )}
    </DashboardCard>
  );
}
