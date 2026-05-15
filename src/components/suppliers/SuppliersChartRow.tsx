import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from '@/components/dashboard/DashboardCard';
import { formatKobo } from '@/lib/format';

/**
 * 3 chart cards row below the Suppliers KPI strip:
 *   - Suppliers by Status     · donut Active / Inactive / Blacklisted
 *   - Purchases Trend         · 7-day inline SVG line of spend
 *   - Top Suppliers by Spend  · donut 30d
 */
export async function SuppliersChartRow({ userId }: { userId: string }) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-3">
      <SuppliersByStatusCard userId={userId} />
      <PurchasesTrendCard userId={userId} />
      <TopSuppliersBySpendCard userId={userId} />
    </div>
  );
}

/* ============== Suppliers by Status ============== */

async function SuppliersByStatusCard({ userId }: { userId: string }) {
  const grouped = await prisma.supplier.groupBy({
    by: ['status'],
    where: { userId, deletedAt: null },
    _count: { _all: true },
  });

  const byStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
  const rows: { label: string; count: number; color: string; hex: string }[] = [
    {
      label: 'Active',
      count: byStatus.get('ACTIVE') ?? 0,
      color: 'bg-success-500',
      hex: '#8BD91E',
    },
    {
      label: 'Inactive',
      count: byStatus.get('INACTIVE') ?? 0,
      color: 'bg-slate-400',
      hex: '#94A3B8',
    },
    {
      label: 'Blacklisted',
      count: byStatus.get('BLACKLISTED') ?? 0,
      color: 'bg-rose-500',
      hex: '#EF4444',
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
    <DashboardCard title="Suppliers by Status">
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
              Suppliers
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

/* ============== Purchases Trend ============== */

async function PurchasesTrendCard({ userId }: { userId: string }) {
  const DAYS = 7;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (DAYS - 1));

  const pos = await prisma.purchaseOrder.findMany({
    where: {
      userId,
      deletedAt: null,
      status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] },
      receivedAt: { gte: weekStart },
    },
    select: { receivedAt: true, totalKobo: true },
  });

  const dayMs = 24 * 60 * 60 * 1000;
  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const value = pos.reduce((s, p) => {
      if (!p.receivedAt) return s;
      const idx = Math.floor(
        (new Date(p.receivedAt).getTime() - weekStart.getTime()) / dayMs,
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
    <DashboardCard title="Purchases Trend" rightSlot={<PeriodPill />}>
      <div className="mb-2">
        <div className="num text-xl font-black text-ink">{formatKobo(total)}</div>
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
      aria-label="Daily supplier purchases trend"
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
        stroke="#8BD91E"
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {series.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} fill="#8BD91E" />
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

/* ============== Top Suppliers by Spend ============== */

async function TopSuppliersBySpendCard({ userId }: { userId: string }) {
  const now = new Date();
  const monthStart = new Date(now);
  monthStart.setHours(0, 0, 0, 0);
  monthStart.setDate(monthStart.getDate() - 29);

  const grouped = await prisma.purchaseOrder.groupBy({
    by: ['supplierId'],
    where: {
      userId,
      deletedAt: null,
      status: { in: ['RECEIVED', 'PARTIALLY_RECEIVED'] },
      receivedAt: { gte: monthStart },
    },
    _sum: { totalKobo: true },
    orderBy: { _sum: { totalKobo: 'desc' } },
    take: 5,
  });

  const supplierIds = grouped.map((g) => g.supplierId);
  const suppliers = supplierIds.length
    ? await prisma.supplier.findMany({
        where: { id: { in: supplierIds } },
        select: { id: true, name: true },
      })
    : [];
  const byId = new Map(suppliers.map((s) => [s.id, s.name]));

  const PALETTE = [
    { tw: 'bg-brand-500', hex: '#00B8E8' },
    { tw: 'bg-success-500', hex: '#8BD91E' },
    { tw: 'bg-owed-500', hex: '#F59E0B' },
    { tw: 'bg-rose-500', hex: '#EF4444' },
    { tw: 'bg-slate-400', hex: '#94A3B8' },
  ];

  const rows = grouped.map((g, i) => ({
    label: byId.get(g.supplierId) ?? 'Supplier',
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
    <DashboardCard title="Top Suppliers by Spend" rightSlot={<PeriodPill label="30 Days" />}>
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
              Spend
            </div>
          </div>
        </div>
        <ul className="flex-1 space-y-1.5">
          {rows.length === 0 ? (
            <li className="text-xs text-slate-500">No supplier spend yet.</li>
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
