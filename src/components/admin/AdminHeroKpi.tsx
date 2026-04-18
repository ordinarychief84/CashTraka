import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Admin hero-level KPI card. Bigger and bolder than KpiCard, used for
 * the marquee metrics at the top of the admin dashboard (MRR, GMV).
 */

type Props = {
  label: string;
  value: string;
  deltaPct?: number | null;
  sub?: string;
  tone?: 'brand' | 'violet' | 'amber' | 'slate';
  /** When true, a down arrow is good (e.g. past-due count). */
  inverse?: boolean;
};

const TONE: Record<NonNullable<Props['tone']>, string> = {
  brand: 'from-brand-600 to-brand-500',
  violet: 'from-indigo-600 to-violet-500',
  amber: 'from-amber-500 to-amber-400',
  slate: 'from-slate-800 to-slate-700',
};

export function AdminHeroKpi({
  label,
  value,
  deltaPct,
  sub,
  tone = 'brand',
  inverse = false,
}: Props) {
  let delta: React.ReactNode = null;
  if (deltaPct === null) {
    delta = (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
        <Minus size={11} />
        No prior data
      </span>
    );
  } else if (deltaPct !== undefined) {
    const isUp = deltaPct >= 0;
    const isGood = inverse ? !isUp : isUp;
    delta = (
      <span
        className={
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ' +
          (isGood
            ? 'bg-white/20 text-white'
            : 'bg-red-500/90 text-white')
        }
      >
        {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
        {isUp ? '+' : ''}
        {deltaPct}%
      </span>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm',
        TONE[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
          {label}
        </div>
        {delta}
      </div>
      <div className="num mt-2 text-3xl font-black leading-none tracking-tight md:text-4xl">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-white/80">{sub}</div>}
    </div>
  );
}
