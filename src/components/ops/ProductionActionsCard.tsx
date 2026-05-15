import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';

const DAYS = 7;

/**
 * Production Actions · five performance metrics for the week plus a
 * tiny line chart showing daily efficiency. Mirrors the approved comp.
 *
 *   - Total Planned Output      sum(quantity) across active runs
 *   - Actual Output             sum(quantityAccepted) on completed runs (7d)
 *   - Production Efficiency     actual / planned
 *   - Rejection / Waste         sum(quantityDamaged) (7d) + %
 *   - On-time Completion        completed-on-or-before-plannedEndAt / completed
 *   - Daily efficiency series   per-day actual/planned ratio for the spark
 */
export async function ProductionActionsCard({ userId }: { userId: string }) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  const [activeRuns, completedRuns] = await Promise.all([
    prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: {
          in: ['PLANNED', 'MATERIALS_NEEDED', 'READY_TO_PRODUCE', 'IN_PRODUCTION'],
        },
      },
      include: { items: { select: { quantity: true } } },
    }),
    prisma.productionOrder.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'COMPLETED',
        completedAt: { gte: sunday },
      },
      include: { items: { select: { quantity: true } } },
    }),
  ]);

  const plannedActiveOutput = activeRuns.reduce(
    (s, r) => s + r.items.reduce((ss, it) => ss + it.quantity, 0),
    0,
  );
  const plannedCompletedOutput = completedRuns.reduce(
    (s, r) => s + r.items.reduce((ss, it) => ss + it.quantity, 0),
    0,
  );
  const totalPlanned = plannedActiveOutput + plannedCompletedOutput;
  const actualOutput = completedRuns.reduce(
    (s, r) => s + (r.quantityAccepted ?? 0),
    0,
  );
  const totalProduced = completedRuns.reduce(
    (s, r) => s + (r.quantityProduced ?? 0),
    0,
  );
  const damaged = completedRuns.reduce(
    (s, r) => s + (r.quantityDamaged ?? 0),
    0,
  );

  const efficiency =
    totalPlanned > 0 ? Math.round((actualOutput / totalPlanned) * 100) : null;
  const rejectionPct =
    totalProduced > 0
      ? Math.round((damaged / totalProduced) * 100 * 10) / 10
      : null;
  const onTime = completedRuns.filter((r) => {
    if (!r.plannedEndAt || !r.completedAt) return false;
    return new Date(r.completedAt) <= new Date(r.plannedEndAt);
  }).length;
  const onTimePct =
    completedRuns.length > 0
      ? Math.round((onTime / completedRuns.length) * 100)
      : null;

  // Daily efficiency for the spark.
  const dayMs = 24 * 60 * 60 * 1000;
  const series: { label: string; value: number }[] = Array.from(
    { length: DAYS },
    (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const runsForDay = completedRuns.filter(
        (r) =>
          r.completedAt &&
          Math.floor((new Date(r.completedAt).getTime() - sunday.getTime()) / dayMs) === i,
      );
      const planned = runsForDay.reduce(
        (s, r) => s + r.items.reduce((ss, it) => ss + it.quantity, 0),
        0,
      );
      const actual = runsForDay.reduce(
        (s, r) => s + (r.quantityAccepted ?? 0),
        0,
      );
      const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0;
      return {
        label: d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
        value: pct,
      };
    },
  );

  return (
    <DashboardCard title="Production Actions" rightSlot={<PeriodPill />}>
      <dl className="divide-y divide-border text-sm">
        <Row label="Total Planned Output" value={`${totalPlanned.toLocaleString('en-NG')} pcs`} />
        <Row label="Actual Output" value={`${actualOutput.toLocaleString('en-NG')} pcs`} />
        <Row
          label="Production Efficiency"
          value={efficiency == null ? '—' : `${efficiency}%`}
        />
        <Row
          label="Rejection / Waste"
          value={
            rejectionPct == null
              ? `${damaged} pcs`
              : `${damaged} pcs (${rejectionPct}%)`
          }
        />
        <Row
          label="On-time Completion"
          value={onTimePct == null ? '—' : `${onTimePct}%`}
        />
      </dl>

      <div className="mt-4 border-t border-border pt-3">
        <EfficiencySpark series={series} />
      </div>
    </DashboardCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-2.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="num text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}

function EfficiencySpark({
  series,
}: {
  series: { label: string; value: number }[];
}) {
  const W = 360;
  const H = 100;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 18;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = H - PAD_T - PAD_B;

  const x = (i: number) =>
    PAD_L + (i / Math.max(1, series.length - 1)) * PLOT_W;
  const y = (v: number) => PAD_T + (1 - v / 100) * PLOT_H;

  const path = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label="Daily production efficiency"
    >
      {[0, 50, 100].map((g) => {
        const yy = y(g);
        return (
          <g key={g}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yy}
              y2={yy}
              stroke="#F1F5F9"
              strokeWidth={1}
              strokeDasharray={g === 0 ? '0' : '3 3'}
            />
            <text
              x={PAD_L - 6}
              y={yy + 3}
              textAnchor="end"
              fontSize={9}
              fill="#94A3B8"
            >
              {g}%
            </text>
          </g>
        );
      })}
      <path
        d={path}
        stroke="#00B8E8"
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {series.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} fill="#00B8E8" />
      ))}
      {series.map((p, i) => (
        <text
          key={i + 'lbl'}
          x={x(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize={8}
          fill="#94A3B8"
        >
          {p.label}
        </text>
      ))}
    </svg>
  );
}
