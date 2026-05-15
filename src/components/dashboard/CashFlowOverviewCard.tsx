import { prisma } from '@/lib/prisma';
import { DashboardCard, PeriodPill } from './DashboardCard';

const DAYS = 7;

type DayBucket = {
  label: string;
  income: number;
  expense: number;
};

/**
 * Cash Flow Overview — dual-line chart (Income vs Expenses) for the
 * last 7 days. Drawn as inline SVG so we don't pull in a chart library.
 * Y axis is capped at the highest single-day value across both series
 * with rounded gridlines.
 */
export async function CashFlowOverviewCard({ userId }: { userId: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (DAYS - 1));

  const [paidPayments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { userId, status: 'PAID', createdAt: { gte: start } },
      select: { amountKobo: true, createdAt: true },
    }),
    prisma.expense
      .findMany({
        where: { userId, incurredOn: { gte: start } },
        select: { amountKobo: true, incurredOn: true },
      })
      .catch(() => [] as { amountKobo: number; incurredOn: Date }[]),
  ]);

  // Bucket by date.
  const buckets: DayBucket[] = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      label: d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }),
      income: 0,
      expense: 0,
    };
  });
  for (const p of paidPayments) {
    const d = new Date(p.createdAt);
    d.setHours(0, 0, 0, 0);
    const idx = Math.floor(
      (d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (idx >= 0 && idx < DAYS) buckets[idx].income += p.amountKobo;
  }
  for (const e of expenses) {
    const d = new Date(e.incurredOn);
    d.setHours(0, 0, 0, 0);
    const idx = Math.floor(
      (d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (idx >= 0 && idx < DAYS) buckets[idx].expense += e.amountKobo;
  }

  return (
    <DashboardCard
      title="Cash Flow Overview"
      rightSlot={
        <div className="flex items-center gap-3">
          <Legend color="bg-success-500" label="Income" />
          <Legend color="bg-rose-500" label="Expenses" />
          <PeriodPill />
        </div>
      }
    >
      <CashFlowChart buckets={buckets} />
    </DashboardCard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function CashFlowChart({ buckets }: { buckets: DayBucket[] }) {
  const max = Math.max(
    1,
    ...buckets.flatMap((b) => [b.income, b.expense]),
  );
  // Round max up to a clean kobo ceiling for grid labels.
  const yCeil = niceCeil(max);
  const ySteps = 3; // 4 lines total (0, 1/3, 2/3, ceil)

  const W = 800;
  const H = 200;
  const PAD_L = 60;
  const PAD_R = 20;
  const PAD_T = 16;
  const PAD_B = 30;
  const PLOT_W = W - PAD_L - PAD_R;
  const PLOT_H = H - PAD_T - PAD_B;

  const x = (i: number) =>
    PAD_L + (i / Math.max(1, buckets.length - 1)) * PLOT_W;
  const y = (v: number) => PAD_T + (1 - v / yCeil) * PLOT_H;

  const incomePath = buckets
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(b.income)}`)
    .join(' ');
  const expensePath = buckets
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(b.expense)}`)
    .join(' ');

  const incomeArea = `${incomePath} L ${x(buckets.length - 1)} ${PAD_T + PLOT_H} L ${x(0)} ${PAD_T + PLOT_H} Z`;

  return (
    <div className="-mx-2 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full min-w-[600px]"
        role="img"
        aria-label="Cash flow chart for the last 7 days"
      >
        {/* Y gridlines + labels */}
        {Array.from({ length: ySteps + 1 }, (_, i) => {
          const value = (yCeil / ySteps) * (ySteps - i);
          const yy = PAD_T + (i / ySteps) * PLOT_H;
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={yy}
                y2={yy}
                stroke="#F1F5F9"
                strokeWidth={1}
                strokeDasharray={i === ySteps ? '0' : '3 3'}
              />
              <text
                x={PAD_L - 8}
                y={yy + 3}
                textAnchor="end"
                fontSize={10}
                fill="#94A3B8"
                fontFamily="Inter, sans-serif"
              >
                ₦{Math.round(value / 100).toLocaleString('en-NG')}
              </text>
            </g>
          );
        })}

        {/* Income area fill */}
        <path d={incomeArea} fill="#8BD91E" opacity={0.12} />

        {/* Income line */}
        <path
          d={incomePath}
          stroke="#72B515"
          strokeWidth={2.2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Expense line */}
        <path
          d={expensePath}
          stroke="#EF4444"
          strokeWidth={2.2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {buckets.map((b, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(b.income)} r={3} fill="#72B515" />
            <circle cx={x(i)} cy={y(b.expense)} r={3} fill="#EF4444" />
          </g>
        ))}

        {/* X-axis labels */}
        {buckets.map((b, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="#94A3B8"
            fontFamily="Inter, sans-serif"
          >
            {b.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Round up to a "nice" power-of-10-ish ceiling so gridlines look clean. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const order = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / order;
  let nice: number;
  if (f <= 1) nice = 1;
  else if (f <= 2) nice = 2;
  else if (f <= 5) nice = 5;
  else nice = 10;
  return nice * order;
}
