import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact secondary KPI card for the admin dashboard.
 * Dual-use with light / danger / warning / success tones.
 */

type Props = {
  label: string;
  value: string;
  sub?: string;
  deltaPct?: number | null;
  /** down = good (e.g. past-due, churn) */
  inverse?: boolean;
  tone?: 'brand' | 'danger' | 'warning' | 'neutral';
  icon?: React.ReactNode;
};

const TONE_VALUE: Record<NonNullable<Props['tone']>, string> = {
  brand: 'text-brand-700',
  danger: 'text-red-700',
  warning: 'text-amber-700',
  neutral: 'text-ink',
};
const TONE_ICON: Record<NonNullable<Props['tone']>, string> = {
  brand: 'bg-brand-50 text-brand-600',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-700',
  neutral: 'bg-slate-100 text-slate-500',
};

export function AdminKpi({
  label,
  value,
  sub,
  deltaPct,
  inverse = false,
  tone = 'neutral',
  icon,
}: Props) {
  let delta: React.ReactNode = null;
  if (deltaPct !== undefined && deltaPct !== null) {
    const isUp = deltaPct >= 0;
    const good = inverse ? !isUp : isUp;
    delta = (
      <span
        className={
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ' +
          (good ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700')
        }
      >
        {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
        {isUp ? '+' : ''}
        {deltaPct}%
      </span>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                TONE_ICON[tone],
              )}
            >
              {icon}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </span>
        </div>
        {delta}
      </div>
      <div className={cn('num mt-2 text-2xl font-black tracking-tight', TONE_VALUE[tone])}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
