import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';

/**
 * 3 chart cards row below the Team KPI strip:
 *   - Team Members by Role   · donut split by role
 *   - Team Activity Overview · 7-day line of task completions (proxy for daily activity)
 *   - Tasks by Status         · donut (Completed / In Progress / Pending / Overdue)
 */
export async function TeamChartRow({ userId }: { userId: string }) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <MembersByRoleCard userId={userId} />
      <TeamActivityCard userId={userId} />
      <TasksByStatusCard userId={userId} />
    </div>
  );
}

/* ============== Team Members by Role ============== */

async function MembersByRoleCard({ userId }: { userId: string }) {
  const grouped = await prisma.staffMember.groupBy({
    by: ['role'],
    where: { userId, status: 'active' },
    _count: { _all: true },
  });

  const PALETTE = [
    { tw: 'bg-brand-500', hex: '#00B8E8' },
    { tw: 'bg-success-500', hex: '#8BD91E' },
    { tw: 'bg-owed-500', hex: '#F59E0B' },
    { tw: 'bg-rose-500', hex: '#EF4444' },
    { tw: 'bg-slate-400', hex: '#94A3B8' },
  ];

  const rows = grouped
    .map((g, i) => ({
      label: g.role && g.role.length > 0 ? g.role : 'Unassigned',
      count: g._count._all,
      color: PALETTE[i % PALETTE.length].tw,
      hex: PALETTE[i % PALETTE.length].hex,
    }))
    .sort((a, b) => b.count - a.count);

  const sum = rows.reduce((s, r) => s + r.count, 0);
  const conicStops = (() => {
    if (sum === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      if (r.count === 0) continue;
      const pct = (r.count / sum) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  return (
    <DashboardCard title="Team Members by Role" rightSlot={<PeriodPill label="This Month" />}>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-lg font-black leading-none text-ink">{sum}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Members
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.length === 0 ? (
            <li className="text-xs text-slate-500">No team members yet.</li>
          ) : (
            rows.slice(0, 5).map((r) => {
              const pct = sum > 0 ? Math.round((r.count / sum) * 100) : 0;
              return (
                <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${r.color}`} />
                    <span className="truncate">{r.label}</span>
                  </span>
                  <span className="num text-slate-700">
                    <span className="font-bold text-ink">{r.count}</span>
                    <span className="ml-1 text-slate-400">({pct}%)</span>
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </DashboardCard>
  );
}

/* ============== Team Activity Overview ============== */

async function TeamActivityCard({ userId }: { userId: string }) {
  const DAYS = 7;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (DAYS - 1));

  const tasks = await prisma.task.findMany({
    where: { userId, completedAt: { gte: weekStart } },
    select: { completedAt: true },
  });

  const dayMs = 24 * 60 * 60 * 1000;
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const value = tasks.reduce((s, t) => {
      if (!t.completedAt) return s;
      const idx = Math.floor(
        (new Date(t.completedAt).getTime() - weekStart.getTime()) / dayMs,
      );
      return idx === i ? s + 1 : s;
    }, 0);
    return {
      label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
      value,
    };
  });

  const total = series.reduce((s, p) => s + p.value, 0);

  return (
    <DashboardCard title="Team Activity Overview" rightSlot={<PeriodPill />}>
      <div className="mb-2">
        <div className="num text-xl font-black text-ink">{total}</div>
        <div className="text-[11px] text-slate-500">Tasks completed · 7d</div>
      </div>
      <ActivitySpark series={series} />
    </DashboardCard>
  );
}

function ActivitySpark({ series }: { series: { label: string; value: number }[] }) {
  const W = 360;
  const H = 100;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 18;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = H - PAD_T - PAD_B;

  const max = Math.max(1, ...series.map((p) => p.value));
  const x = (i: number) =>
    PAD_L + (i / Math.max(1, series.length - 1)) * PLOT_W;
  const y = (v: number) => PAD_T + (1 - v / max) * PLOT_H;
  const path = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label="Team activity per day"
    >
      {[0, 0.5, 1].map((g, i) => {
        const yy = y(max * g);
        return (
          <line
            key={i}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={yy}
            y2={yy}
            stroke="#F1F5F9"
            strokeWidth={1}
            strokeDasharray={g === 0 ? '0' : '3 3'}
          />
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

/* ============== Tasks by Status ============== */

async function TasksByStatusCard({ userId }: { userId: string }) {
  const now = new Date();
  const [done, inProgress, pendingActive, overdue] = await Promise.all([
    prisma.task.count({ where: { userId, status: 'done' } }),
    prisma.task.count({ where: { userId, status: 'in_progress' } }),
    prisma.task.count({
      where: {
        userId,
        status: 'todo',
        OR: [{ dueDate: null }, { dueDate: { gte: now } }],
      },
    }),
    prisma.task.count({
      where: {
        userId,
        status: { in: ['todo', 'in_progress'] },
        dueDate: { lt: now },
      },
    }),
  ]);

  const rows: { label: string; count: number; color: string; hex: string }[] = [
    { label: 'Completed', count: done, color: 'bg-success-500', hex: '#8BD91E' },
    { label: 'In Progress', count: inProgress, color: 'bg-brand-500', hex: '#00B8E8' },
    { label: 'Pending', count: pendingActive, color: 'bg-owed-500', hex: '#F59E0B' },
    { label: 'Overdue', count: overdue, color: 'bg-rose-500', hex: '#EF4444' },
  ];

  const sum = rows.reduce((s, r) => s + r.count, 0);
  const conicStops = (() => {
    if (sum === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      if (r.count === 0) continue;
      const pct = (r.count / sum) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  return (
    <DashboardCard title="Tasks by Status" rightSlot={<PeriodPill />}>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-lg font-black leading-none text-ink">{sum}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Tasks
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.map((r) => {
            const pct = sum > 0 ? Math.round((r.count / sum) * 100) : 0;
            return (
              <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
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
