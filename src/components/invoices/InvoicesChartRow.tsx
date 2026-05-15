import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';

/**
 * 3 chart cards row below the Invoices KPI strip:
 *   - Invoices by Status   · donut (Draft, Sent, Paid, Overdue, etc.)
 *   - Invoice Trend        · 7-day inline SVG line of invoiced amounts
 *   - Invoices by Customer · donut top 5 by total invoiced
 */
export async function InvoicesChartRow({ userId }: { userId: string }) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <InvoicesByStatusCard userId={userId} />
      <InvoiceTrendCard userId={userId} />
      <InvoicesByCustomerCard userId={userId} />
    </div>
  );
}

/* ============== Invoices by Status ============== */

async function InvoicesByStatusCard({ userId }: { userId: string }) {
  const grouped = await prisma.invoice.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true },
  });

  const byStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
  const rows: { label: string; count: number; color: string; hex: string }[] = [
    { label: 'Draft', count: byStatus.get('DRAFT') ?? 0, color: 'bg-slate-400', hex: '#94A3B8' },
    { label: 'Sent', count: (byStatus.get('SENT') ?? 0) + (byStatus.get('VIEWED') ?? 0), color: 'bg-brand-500', hex: '#00B8E8' },
    {
      label: 'Partially Paid',
      count: byStatus.get('PARTIALLY_PAID') ?? 0,
      color: 'bg-owed-500',
      hex: '#F59E0B',
    },
    {
      label: 'Paid',
      count: byStatus.get('PAID') ?? 0,
      color: 'bg-success-500',
      hex: '#8BD91E',
    },
    {
      label: 'Overdue',
      count: byStatus.get('OVERDUE') ?? 0,
      color: 'bg-rose-500',
      hex: '#EF4444',
    },
    {
      label: 'Cancelled',
      count: (byStatus.get('CANCELLED') ?? 0) + (byStatus.get('CREDITED') ?? 0),
      color: 'bg-slate-300',
      hex: '#CBD5E1',
    },
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
    <DashboardCard title="Invoices by Status">
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
              Invoices
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

/* ============== Invoice Trend ============== */

async function InvoiceTrendCard({ userId }: { userId: string }) {
  const DAYS = 7;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (DAYS - 1));

  const invoices = await prisma.invoice.findMany({
    where: {
      userId,
      status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
      createdAt: { gte: weekStart },
    },
    select: { createdAt: true, totalKobo: true },
  });

  const dayMs = 24 * 60 * 60 * 1000;
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const value = invoices.reduce((s, p) => {
      const idx = Math.floor(
        (new Date(p.createdAt).getTime() - weekStart.getTime()) / dayMs,
      );
      return idx === i ? s + p.totalKobo : s;
    }, 0);
    return {
      label: d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }),
      value,
    };
  });

  const total = series.reduce((s, p) => s + p.value, 0);

  return (
    <DashboardCard title="Invoice Trend" rightSlot={<PeriodPill />}>
      <div className="mb-2">
        <div className="num text-xl font-black text-ink">{formatKobo(total)}</div>
        <div className="text-[11px] text-slate-500">Last 7 days · invoiced</div>
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
      aria-label="Daily invoice trend"
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

/* ============== Invoices by Customer ============== */

async function InvoicesByCustomerCard({ userId }: { userId: string }) {
  const grouped = await prisma.invoice.groupBy({
    by: ['customerName'],
    where: {
      userId,
      status: { in: ['DRAFT', 'SENT', 'VIEWED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] },
    },
    _sum: { totalKobo: true },
    orderBy: { _sum: { totalKobo: 'desc' } },
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
    label: g.customerName || 'Customer',
    value: g._sum.totalKobo ?? 0,
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
    <DashboardCard title="Invoices by Customer" rightSlot={<PeriodPill label="All Time" />}>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <div className="absolute inset-0 rounded-full" style={{ background: conicStops }} />
          <div className="absolute inset-[22%] rounded-full bg-white" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="num text-[11px] font-black leading-none text-ink">
              {formatKobo(totalValue)}
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Top 5
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Customers
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.length === 0 ? (
            <li className="text-xs text-slate-500">No invoiced customers yet.</li>
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
