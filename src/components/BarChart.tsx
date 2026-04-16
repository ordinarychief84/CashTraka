import { cn } from '@/lib/utils';

type Props = {
  labels: string[];
  values: number[];
  formatValue?: (v: number) => string;
  className?: string;
  barClassName?: string;
};

/** Horizontal bar chart — each row is a label + bar + value. No library. */
export function BarChart({
  labels,
  values,
  formatValue = (v) => String(v),
  className,
  barClassName = 'bg-brand-500',
}: Props) {
  const max = Math.max(...values, 1);
  return (
    <ul className={cn('space-y-2', className)}>
      {labels.map((label, i) => {
        const v = values[i] ?? 0;
        const pct = (v / max) * 100;
        return (
          <li key={label} className="text-xs">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-medium text-ink">{label}</span>
              <span className="num shrink-0 text-slate-600">{formatValue(v)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full', barClassName)}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical bar chart — used for monthly revenue. */
export function ColumnChart({
  labels,
  values,
  formatValue,
  height = 160,
}: {
  labels: string[];
  values: number[];
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {values.map((v, i) => {
          const pct = (v / max) * 100;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t-md bg-brand-500/90 transition-all hover:bg-brand-600"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={formatValue ? formatValue(v) : String(v)}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[10px] font-medium text-slate-500">
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
