import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pulse KPI card.
 *
 * Clean vertical rhythm: icon + label at the top, big number in the middle,
 * sub-text at the bottom. Delta chip sits inline with the label so the card
 * reads like a newspaper stat block rather than a form.
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

const TONE: Record<
  Tone,
  { value: string; iconBg: string; iconText: string; accent: string }
> = {
  brand: {
    value: 'text-ink',
    iconBg: 'bg-brand-50',
    iconText: 'text-brand-600',
    accent: 'bg-brand-500',
  },
  danger: {
    value: 'text-ink',
    iconBg: 'bg-red-50',
    iconText: 'text-red-600',
    accent: 'bg-red-500',
  },
  warning: {
    value: 'text-ink',
    iconBg: 'bg-owed-50',
    iconText: 'text-owed-600',
    accent: 'bg-owed-500',
  },
  neutral: {
    value: 'text-ink',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-600',
    accent: 'bg-slate-400',
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
    const tinyIcon = isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />;
    deltaNode = (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
          isGood ? 'bg-success-100 text-success-700' : 'bg-red-50 text-red-700',
        )}
      >
        {tinyIcon}
        {isUp ? '+' : ''}
        {deltaPct}%
      </span>
    );
  }

  return (
    <div className="card relative flex h-full flex-col overflow-hidden p-4">
      {/* Thin accent strip along the left edge */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 w-0.5', styling.accent)}
      />

      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {icon && (
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                styling.iconBg,
                styling.iconText,
              )}
            >
              {icon}
            </span>
          )}
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </div>
        </div>
        {deltaNode}
      </div>

      {/* Value */}
      <div className={cn('num mt-3 text-2xl font-black leading-none tracking-tight', styling.value)}>
        {value}
      </div>

      {/* Sub */}
      {sub && <div className="mt-1.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
