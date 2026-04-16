import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Hero revenue card — the single biggest thing on the dashboard.
 *
 * Design intent: one look, one number, three bits of context:
 *   1. The number itself (big).
 *   2. The delta vs the previous comparable window (colored arrow).
 *   3. A 7-day sparkline so you can see the shape of the week, not just a total.
 *
 * Works for both sellers (revenue) and property managers (rent collected) —
 * label is passed in.
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
  const peak = Math.max(1, ...daily); // avoid division by zero
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Shift label array so it ends with "today" — we derive "today" from
  // the JS Date, not from the server (client-neutral since this is a
  // pure render). The daily[] is already oldest → newest.

  const deltaBadge =
    deltaPct === null ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        <Minus size={11} />
        First week of data
      </span>
    ) : deltaPct >= 0 ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
        <ArrowUpRight size={11} />+{deltaPct}% vs last week
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
        <ArrowDownRight size={11} />
        {deltaPct}% vs last week
      </span>
    );

  return (
    <section className="card overflow-hidden p-0">
      <div className="relative bg-gradient-to-br from-brand-600 to-brand-500 p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
            {label} · last 7 days
          </div>
          <div>{deltaBadge}</div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="num text-4xl font-black leading-none tracking-tight md:text-5xl">
            {formatNaira(total)}
          </span>
        </div>
        <div className="mt-1 text-xs text-white/80">
          across {transactions} {transactions === 1 ? 'transaction' : 'transactions'}
        </div>

        {/* Sparkline */}
        <div className="mt-5 flex h-16 items-end gap-1.5">
          {daily.map((v, i) => {
            const h = Math.max(4, Math.round((v / peak) * 56)); // px
            const isToday = i === daily.length - 1;
            return (
              <div
                key={i}
                className="flex flex-1 flex-col items-center justify-end"
                title={`${dayLabels[i]}: ${formatNaira(v)}`}
              >
                <div
                  className={cn(
                    'w-full rounded-sm transition',
                    isToday ? 'bg-white' : 'bg-white/40',
                  )}
                  style={{ height: `${h}px` }}
                />
                <span
                  className={cn(
                    'mt-1 text-[9px] font-semibold uppercase',
                    isToday ? 'text-white' : 'text-white/60',
                  )}
                >
                  {dayLabels[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
