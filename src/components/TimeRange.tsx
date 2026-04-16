import Link from 'next/link';
import { cn } from '@/lib/utils';
import { type RangeKey, RANGE_LABELS } from '@/lib/range';

const KEYS: RangeKey[] = ['today', 'week', 'month', 'all'];

type Props = {
  /** The currently selected range */
  value: RangeKey;
  /** Base pathname these pills should link to (e.g. "/dashboard") */
  basePath: string;
};

/**
 * Segmented control that drives a `?range=…` query param.
 * Server-component friendly — just renders `<Link>`s.
 */
export function TimeRange({ value, basePath }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-white p-1 text-xs font-semibold">
      {KEYS.map((k) => {
        const active = k === value;
        return (
          <Link
            key={k}
            href={`${basePath}?range=${k}`}
            scroll={false}
            className={cn(
              'rounded-md px-3 py-1.5 transition',
              active
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
            )}
          >
            {RANGE_LABELS[k]}
          </Link>
        );
      })}
    </div>
  );
}
