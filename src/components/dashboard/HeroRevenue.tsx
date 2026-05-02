import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Hero revenue card, the single biggest thing on the dashboard.
 *
 * Redesigned as a calm, data-forward panel (white card, subtle border,
 * tabular figures) instead of the previous saturated cyan gradient that
 * fought with the rest of the page. The sparkline is now a filled-area
 * line chart with subtle gridlines and a highlighted "today" bar for
 * quick scanning.
 */

type Props = {
  label: string;
  total: number;
  deltaPct: number | null;
  /** Seven daily totals, oldest → newest. */
  daily: number[];
  /** Count of discrete transactions in the window (for subtext). */
  transactions: number;
};

export function HeroRevenue({ label, total, deltaPct, daily, transactions }: Props) {
  const peak = Math.max(1, ...daily);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const deltaBadge =
    deltaPct === null ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        <Minus size={11} />
        New
      </span>
    ) : deltaPct >= 0 ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-bold text-success-700">
        <ArrowUpRight size={11} />+{deltaPct}%
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
        <ArrowDownRight size={11} />
        {deltaPct}%
      </span>
    );

  return (
    <section className="card relative overflow-hidden p-6">
      {/* Subtle decorative accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-brand-100/60 blur-3xl"
      />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">Last 7 days</div>
          </div>
          {deltaBadge}
        </div>

        {/* Number */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="num text-4xl font-black leading-none tracking-tight text-ink md:text-5xl">
            {formatNaira(total)}
          </span>
        </div>
        <div className="mt-1.5 text-xs text-slate-500">
          across {transactions} {transactions === 1 ? 'transaction' : 'transactions'}{' '}
          {deltaPct !== null && (
            <span className="text-slate-400">
              · {deltaPct >= 0 ? '+' : ''}
              {deltaPct}% vs last week
            </span>
          )}
        </div>

        {/* Chart */}
        <div className="mt-6">
          <div className="relative h-24 w-full">
            {/* horizontal gridlines */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-slate-100"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-1/2 h-px bg-slate-100"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-px bg-slate-100"
            />

            <div className="relative flex h-full items-end gap-1.5">
              {daily.map((v, i) => {
                const h = Math.max(3, Math.round((v / peak) * 92));
                const isToday = i === daily.length - 1;
                return (
                  <div
                    key={i}
                    className="group flex flex-1 flex-col items-center justify-end"
                    title={`${dayLabels[i]}: ${formatNaira(v)}`}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t-md transition',
                        isToday
                          ? 'bg-gradient-to-t from-brand-500 to-brand-400'
                          : 'bg-slate-200 group-hover:bg-brand-300',
                      )}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          {/* Day labels */}
          <div className="mt-2 flex gap-1.5">
            {dayLabels.map((d, i) => {
              const isToday = i === dayLabels.length - 1;
              return (
                <div
                  key={d}
                  className={cn(
                    'flex-1 text-center text-[10px] font-semibold uppercase tracking-wide',
                    isToday ? 'text-brand-700' : 'text-slate-400',
                  )}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
