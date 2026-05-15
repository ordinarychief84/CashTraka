import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';

/**
 * 3 chart cards row below the Customers KPI strip:
 *   - Customers by Status   · donut (Active / Inactive / Blocked / Prospect)
 *   - New Customers Trend   · 7-day SVG line of customer signups
 *   - Top Customers by Sales (This Week) · bar list top 5 by paid amount
 *
 * "Status" is derived: Active = activity within 30d, Prospect = no payments yet,
 * Blocked = behaviorTag = LATE_PAYER or DORMANT, Inactive = activity stale 30d+.
 */
export async function CustomersChartRow({ userId }: { userId: string }) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <CustomersByStatusCard userId={userId} />
      <NewCustomersTrendCard userId={userId} />
      <TopCustomersBySalesCard userId={userId} />
    </div>
  );
}

/* ============== Customers by Status ============== */

async function CustomersByStatusCard({ userId }: { userId: string }) {
  const activeThreshold = new Date();
  activeThreshold.setDate(activeThreshold.getDate() - 30);

  const customers = await prisma.customer.findMany({
    where: { userId },
    select: {
      lastActivityAt: true,
      totalPaidKobo: true,
      transactionCount: true,
      behaviorTag: true,
    },
  });

  let active = 0;
  let inactive = 0;
  let blocked = 0;
  let prospect = 0;
  for (const c of customers) {
    const tag = (c.behaviorTag ?? '').toUpperCase();
    if (tag === 'LATE_PAYER' || tag === 'BLOCKED') {
      blocked++;
    } else if (c.transactionCount === 0 && c.totalPaidKobo === 0) {
      prospect++;
    } else if (new Date(c.lastActivityAt).getTime() >= activeThreshold.getTime()) {
      active++;
    } else {
      inactive++;
    }
  }

  const rows: { label: string; count: number; color: string; hex: string }[] = [
    { label: 'Active', count: active, color: 'bg-success-500', hex: '#8BD91E' },
    { label: 'Inactive', count: inactive, color: 'bg-owed-500', hex: '#F59E0B' },
    { label: 'Blocked', count: blocked, color: 'bg-rose-500', hex: '#EF4444' },
    { label: 'Prospect', count: prospect, color: 'bg-brand-500', hex: '#00B8E8' },
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
    <DashboardCard title="Customers by Status">
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
              Customers
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

/* ============== New Customers Trend ============== */

async function NewCustomersTrendCard({ userId }: { userId: string }) {
  const DAYS = 7;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (DAYS - 1));

  const customers = await prisma.customer.findMany({
    where: { userId, createdAt: { gte: weekStart } },
    select: { createdAt: true },
  });

  const dayMs = 24 * 60 * 60 * 1000;
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const value = customers.reduce((s, c) => {
      const idx = Math.floor(
        (new Date(c.createdAt).getTime() - weekStart.getTime()) / dayMs,
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
    <DashboardCard title="New Customers Trend" rightSlot={<PeriodPill />}>
      <div className="mb-2">
        <div className="num text-xl font-black text-ink">{total}</div>
        <div className="text-[11px] text-slate-500">Last 7 days</div>
      </div>
      <TrendSpark series={series} />
    </DashboardCard>
  );
}

function TrendSpark({ series }: { series: { label: string; value: number }[] }) {
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
      aria-label="New customers per day"
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

/* ============== Top Customers by Sales (This Week) ============== */

async function TopCustomersBySalesCard({ userId }: { userId: string }) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const grouped = await prisma.payment.groupBy({
    by: ['customerNameSnapshot'],
    where: { userId, status: 'PAID', createdAt: { gte: weekStart } },
    _sum: { amountKobo: true },
    orderBy: { _sum: { amountKobo: 'desc' } },
    take: 5,
  });

  const PALETTE = ['bg-brand-500', 'bg-success-500', 'bg-owed-500', 'bg-rose-500', 'bg-slate-400'];
  const rows = grouped.map((g, i) => ({
    name: g.customerNameSnapshot || 'Customer',
    value: g._sum.amountKobo ?? 0,
    color: PALETTE[i % PALETTE.length],
  }));

  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <DashboardCard title="Top Customers by Sales (This Week)" rightSlot={<PeriodPill />}>
      {rows.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">
          No customer sales recorded this week.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="num inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-ink">
                    {r.name}
                  </span>
                  <span className="num shrink-0 text-[10px] font-bold text-ink">
                    {formatKobo(r.value)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${r.color}`}
                    style={{ width: `${(r.value / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}
