import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pulse KPI card.
 *
 * Small, scan-friendly card showing one metric + context. Supports an
 * optional "goodness" dimension for the delta so a rise in debt shows red
 * while a rise in revenue shows green — the default assumes "higher is better".
 */

type Tone = 'brand' | 'danger' | 'warning' | 'neutral';

type Props = {
  label: string;
  value: string;
  sub?: string;
  deltaPct?: number | null;
  /** If 'inverse', a negative delta is good (e.g. owed, expenses). */
  deltaSemantics?: 'normal' | 'inverse';
  tone?: Tone;
  icon?: React.ReactNode;
};

const TONE: Record<Tone, { value: string; border: string; dot: string }> = {
  brand: {
    value: 'text-brand-700',
    border: 'border-brand-100',
    dot: 'bg-brand-500',
  },
  danger: {
    value: 'text-red-700',
    border: 'border-red-100',
    dot: 'bg-red-500',
  },
  warning: {
    value: 'text-amber-700',
    border: 'border-amber-100',
    dot: 'bg-amber-500',
  },
  neutral: {
    value: 'text-ink',
    border: 'border-border',
    dot: 'bg-slate-300',
  },
};

export function KpiCard({
  label,
  value,
  sub,
  deltaPct,
  deltaSemantics = 'normal',
  tone = 'neutral',
  icon,
}: Props) {
  const styling = TONE[tone];
  let deltaNode: React.ReactNode = null;

  if (deltaPct !== undefined && deltaPct !== null) {
    const isUp = deltaPct >= 0;
    const isGood = deltaSemantics === 'inverse' ? !isUp : isUp;
    const tinyIcon = isUp ? (
      <ArrowUpRight size={11} />
    ) : (
      <ArrowDownRight size={11} />
    );
    deltaNode = (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
          isGood ? 'bg-brand-50 text-brand-700' : 'bg-red-50 text-red-700',
        )}
      >
        {tinyIcon}
        {isUp ? '+' : ''}
        {deltaPct}%
      </span>
    );
  }

  return (
    <div className={cn('card p-4', styling.border)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                tone === 'brand'
                  ? 'bg-brand-50 text-brand-600'
                  : tone === 'danger'
                    ? 'bg-red-50 text-red-600'
                    : tone === 'warning'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-slate-100 text-slate-500',
              )}
            >
              {icon}
            </span>
          )}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </div>
        </div>
        {deltaNode}
      </div>
      <div className={cn('num mt-2 text-2xl font-black tracking-tight', styling.value)}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
