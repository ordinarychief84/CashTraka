import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from './DashboardCard';

/**
 * Production Overview — donut chart with status breakdown + legend.
 * Counts every non-deleted ProductionOrder grouped by status, then
 * renders the four primary statuses (Planned / In Production /
 * Completed / Delayed) plus a Cancelled row when present. The donut is
 * drawn with a conic-gradient so no chart library dependency is needed.
 */
export async function ProductionOverviewCard({ userId }: { userId: string }) {
  const counts = await prisma.productionOrder.groupBy({
    by: ['status'],
    where: { userId, deletedAt: null },
    _count: { _all: true },
  });

  const byStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const planned = byStatus.get('PLANNED') ?? 0;
  const materialsNeeded = byStatus.get('MATERIALS_NEEDED') ?? 0;
  const inProduction = byStatus.get('IN_PRODUCTION') ?? 0;
  const completed = byStatus.get('COMPLETED') ?? 0;
  const delayed = byStatus.get('DELAYED') ?? 0;
  const cancelled = byStatus.get('CANCELLED') ?? 0;

  const total =
    planned + materialsNeeded + inProduction + completed + delayed + cancelled;

  const rows: {
    label: string;
    count: number;
    color: string;
    hex: string;
  }[] = [
    { label: 'Planned', count: planned + materialsNeeded, color: 'bg-brand-500', hex: '#00B8E8' },
    { label: 'In Production', count: inProduction, color: 'bg-brand-300', hex: '#45CBF2' },
    { label: 'Completed', count: completed, color: 'bg-success-500', hex: '#8BD91E' },
    { label: 'Delayed', count: delayed, color: 'bg-owed-500', hex: '#F59E0B' },
    { label: 'Cancelled', count: cancelled, color: 'bg-slate-300', hex: '#CBD5E1' },
  ];

  const conicStops = (() => {
    if (total === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const stops: string[] = [];
    for (const r of rows) {
      const pct = (r.count / total) * 100;
      stops.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${stops.join(', ')})`;
  })();

  return (
    <DashboardCard title="Production Overview" rightSlot={<PeriodPill />}>
      <div className="flex items-center gap-5">
        {/* Donut */}
        <div className="relative h-32 w-32 shrink-0">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: conicStops }}
          />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-xl font-black leading-none text-ink">
              {total}
            </div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Production
            </div>
          </div>
        </div>

        {/* Legend */}
        <ul className="flex-1 space-y-1.5">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            return (
              <li
                key={r.label}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex items-center gap-2 text-slate-600">
                  <span className={`h-2 w-2 rounded-full ${r.color}`} />
                  {r.label}
                </span>
                <span className="num text-slate-700">
                  <span className="font-bold text-ink">{r.count}</span>
                  <span className="ml-1 text-slate-400">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </DashboardCard>
  );
}
