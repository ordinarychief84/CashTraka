import { formatNaira } from '@/lib/format';
import { ArrowUpRight } from 'lucide-react';

type Props = {
  /** 7 daily totals oldest → newest (index 6 = today) */
  values: number[];
  title?: string;
  deltaPct?: number;
};

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Weekly revenue chart modelled after the "Hours Activity" panel in the
 * reference design: thin bars, today highlighted in lime, a callout floats
 * above the tallest bar with an emoji + date + amount.
 */
export function WeeklyBarChart({ values, title = 'Revenue this week', deltaPct }: Props) {
  const max = Math.max(...values, 1);
  const todayIdx = values.length - 1;

  // Use the tallest day for the callout. Prefer today when tied.
  let peakIdx = todayIdx;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > values[peakIdx]) peakIdx = i;
  }

  const todayLabel = (() => {
    const d = new Date();
    const dowMondayStart = (d.getDay() + 6) % 7; // 0 = Mon in some systems; keep Sunday start matching DOW[]
    return d;
  })();

  // Dow labels mapping: since values[0] = 6 days ago, values[6] = today
  const dowForIndex = (i: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - (todayIdx - i));
    return DOW[d.getDay()];
  };

  const peakDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - (todayIdx - peakIdx));
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
  })();

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          {typeof deltaPct === 'number' && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">
              <ArrowUpRight size={12} />
              {deltaPct >= 0 ? '+' : ''}
              {deltaPct}% vs last week
            </div>
          )}
        </div>
        <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          Weekly
        </span>
      </div>

      <div className="relative mt-6 h-48">
        {/* Callout for the peak day */}
        {values[peakIdx] > 0 && (
          <PeakCallout
            leftPct={((peakIdx + 0.5) / values.length) * 100}
            amount={values[peakIdx]}
            date={peakDate}
          />
        )}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-2">
          {values.map((v, i) => {
            const h = (v / max) * 100;
            const isToday = i === todayIdx;
            const isPeak = i === peakIdx && v > 0;
            return (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div
                  className={
                    isPeak
                      ? 'w-full rounded-full bg-success-400'
                      : isToday
                      ? 'w-full rounded-full bg-brand-500'
                      : 'w-full rounded-full bg-slate-200'
                  }
                  style={{ height: `${Math.max(h, 4)}%` }}
                />
                <div
                  className={
                    isToday
                      ? 'text-[10px] font-bold text-ink'
                      : 'text-[10px] font-medium text-slate-500'
                  }
                >
                  {dowForIndex(i)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PeakCallout({
  leftPct,
  amount,
  date,
}: {
  leftPct: number;
  amount: number;
  date: string;
}) {
  return (
    <div
      className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2"
      style={{ left: `${leftPct}%` }}
    >
      <div className="rounded-xl bg-ink px-3 py-2 text-white shadow-lg">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span>🔥</span>
          <span className="num font-bold">{formatNaira(amount)}</span>
        </div>
        <div className="text-[9px] font-medium text-white/70">{date}</div>
      </div>
      <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 bg-ink" />
    </div>
  );
}
