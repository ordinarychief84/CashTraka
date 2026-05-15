import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';

/**
 * 3 chart cards row below the Reports KPI strip:
 *   - Revenue vs Cost     · dual-line SVG (7d)
 *   - Profit Trend        · single-line SVG (7d, lime)
 *   - Expenses by Category · donut (last 30d business expenses)
 */
export async function ReportsChartRow({ userId }: { userId: string }) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <RevenueVsCostCard userId={userId} />
      <ProfitTrendCard userId={userId} />
      <ExpensesByCategoryCard userId={userId} />
    </div>
  );
}

/* ============== Revenue vs Cost ============== */

async function RevenueVsCostCard({ userId }: { userId: string }) {
  const DAYS = 7;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (DAYS - 1));

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
      select: { createdAt: true, amountKobo: true },
    }),
    prisma.expense.findMany({
      where: { userId, kind: 'business', incurredOn: { gte: weekStart } },
      select: { incurredOn: true, amountKobo: true },
    }),
  ]);

  const dayMs = 24 * 60 * 60 * 1000;
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const revenue = payments.reduce((s, p) => {
      const idx = Math.floor((new Date(p.createdAt).getTime() - weekStart.getTime()) / dayMs);
      return idx === i ? s + p.amountKobo : s;
    }, 0);
    const cost = expenses.reduce((s, e) => {
      const idx = Math.floor((new Date(e.incurredOn).getTime() - weekStart.getTime()) / dayMs);
      return idx === i ? s + e.amountKobo : s;
    }, 0);
    return {
      label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
      revenue,
      cost,
    };
  });

  return (
    <DashboardCard title="Revenue vs Cost" rightSlot={<PeriodPill />}>
      <DualLineSpark series={series} />
      <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Cost
        </span>
      </div>
    </DashboardCard>
  );
}

function DualLineSpark({
  series,
}: {
  series: { label: string; revenue: number; cost: number }[];
}) {
  const W = 360;
  const H = 110;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 18;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = H - PAD_T - PAD_B;

  const max = Math.max(1, ...series.flatMap((p) => [p.revenue, p.cost]));
  const x = (i: number) => PAD_L + (i / Math.max(1, series.length - 1)) * PLOT_W;
  const y = (v: number) => PAD_T + (1 - v / max) * PLOT_H;

  const revPath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.revenue)}`).join(' ');
  const costPath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.cost)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label="Revenue versus cost over 7 days"
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
      <path d={revPath} stroke="#00B8E8" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <path d={costPath} stroke="#EF4444" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.revenue)} r={2.5} fill="#00B8E8" />
          <circle cx={x(i)} cy={y(p.cost)} r={2.5} fill="#EF4444" />
        </g>
      ))}
      {series.map((p, i) => (
        <text key={i + 'lbl'} x={x(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94A3B8">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

/* ============== Profit Trend ============== */

async function ProfitTrendCard({ userId }: { userId: string }) {
  const DAYS = 7;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (DAYS - 1));

  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
      select: { createdAt: true, amountKobo: true },
    }),
    prisma.expense.findMany({
      where: { userId, kind: 'business', incurredOn: { gte: weekStart } },
      select: { incurredOn: true, amountKobo: true },
    }),
  ]);

  const dayMs = 24 * 60 * 60 * 1000;
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const revenue = payments.reduce((s, p) => {
      const idx = Math.floor((new Date(p.createdAt).getTime() - weekStart.getTime()) / dayMs);
      return idx === i ? s + p.amountKobo : s;
    }, 0);
    const cost = expenses.reduce((s, e) => {
      const idx = Math.floor((new Date(e.incurredOn).getTime() - weekStart.getTime()) / dayMs);
      return idx === i ? s + e.amountKobo : s;
    }, 0);
    return {
      label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
      value: revenue - cost,
    };
  });

  const total = series.reduce((s, p) => s + p.value, 0);

  return (
    <DashboardCard title="Profit Trend" rightSlot={<PeriodPill />}>
      <div className="mb-2">
        <div className="num text-xl font-black text-ink">{formatKobo(total)}</div>
        <div className="text-[11px] text-slate-500">Last 7 days · net</div>
      </div>
      <ProfitSpark series={series} />
    </DashboardCard>
  );
}

function ProfitSpark({ series }: { series: { label: string; value: number }[] }) {
  const W = 360;
  const H = 90;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 18;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = H - PAD_T - PAD_B;

  const values = series.map((p) => p.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);

  const x = (i: number) => PAD_L + (i / Math.max(1, series.length - 1)) * PLOT_W;
  const y = (v: number) => PAD_T + ((max - v) / span) * PLOT_H;
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label="Profit trend over 7 days"
    >
      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={y(0)}
        y2={y(0)}
        stroke="#E2E8F0"
        strokeWidth={1}
      />
      <path d={path} stroke="#8BD91E" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} fill="#8BD91E" />
      ))}
      {series.map((p, i) => (
        <text key={i + 'lbl'} x={x(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#94A3B8">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

/* ============== Expenses by Category ============== */

async function ExpensesByCategoryCard({ userId }: { userId: string }) {
  const monthStart = new Date();
  monthStart.setHours(0, 0, 0, 0);
  monthStart.setDate(monthStart.getDate() - 29);

  const grouped = await prisma.expense.groupBy({
    by: ['category'],
    where: { userId, kind: 'business', incurredOn: { gte: monthStart } },
    _sum: { amountKobo: true },
    orderBy: { _sum: { amountKobo: 'desc' } },
    take: 5,
  });

  const PALETTE = [
    { tw: 'bg-brand-500', hex: '#00B8E8' },
    { tw: 'bg-success-500', hex: '#8BD91E' },
    { tw: 'bg-owed-500', hex: '#F59E0B' },
    { tw: 'bg-rose-500', hex: '#EF4444' },
    { tw: 'bg-slate-400', hex: '#94A3B8' },
  ];

  const rows = grouped.map((g, i) => ({
    label: g.category || 'Other',
    value: g._sum.amountKobo ?? 0,
    color: PALETTE[i % PALETTE.length].tw,
    hex: PALETTE[i % PALETTE.length].hex,
  }));

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const conicStops = (() => {
    if (totalValue === 0) return 'conic-gradient(#E5E7EB 0% 100%)';
    let acc = 0;
    const parts: string[] = [];
    for (const r of rows) {
      if (r.value === 0) continue;
      const pct = (r.value / totalValue) * 100;
      parts.push(`${r.hex} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`);
      acc += pct;
    }
    return `conic-gradient(${parts.join(', ')})`;
  })();

  return (
    <DashboardCard title="Expenses by Category" rightSlot={<PeriodPill label="30 Days" />}>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-[11px] font-black leading-none text-ink">
              {formatKobo(totalValue)}
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Expenses
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.length === 0 ? (
            <li className="text-xs text-slate-500">No expenses logged.</li>
          ) : (
            rows.map((r) => {
              const pct = totalValue > 0 ? Math.round((r.value / totalValue) * 100) : 0;
              return (
                <li key={r.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${r.color}`} />
                    <span className="truncate">{r.label}</span>
                  </span>
                  <span className="num text-slate-700">
                    <span className="font-bold text-ink">{formatKobo(r.value)}</span>
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
