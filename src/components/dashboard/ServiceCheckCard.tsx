import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';

type Props = {
  total: number;
  positivePct: number;
  negative: number;
};

/**
 * Small dashboard card surfacing the headline Service Check numbers and a
 * link to /service-check. Mirrors the visual weight of CollectionScoreWidget.
 */
export function ServiceCheckCard({ total, positivePct, negative }: Props) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <Heart size={16} className="text-brand-600" />
          Service Check
        </h2>
        <Link
          href="/service-check"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-600">
          No feedback yet. Turn on auto-send in Settings to start collecting.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="This month" value={String(total)} tone="ink" />
          <Stat label="Positive" value={`${positivePct}%`} tone="brand" />
          <Stat
            label="Negative"
            value={String(negative)}
            tone={negative > 0 ? 'danger' : 'ink'}
          />
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'ink' | 'brand' | 'danger';
}) {
  const cls =
    tone === 'brand'
      ? 'text-brand-600'
      : tone === 'danger'
        ? 'text-red-600'
        : 'text-ink';
  return (
    <div>
      <div className={'text-2xl font-black leading-none tracking-tight ' + cls}>
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
    </div>
  );
}
