import { PLAN_LABELS, type PlanName } from '@/lib/plan-limits';

/**
 * Plan distribution bar — shows how many users are on each tier, with a
 * proportional stacked bar up top and a labelled breakdown below.
 *
 * Works with any `{ [plan]: count }` object; unknown plans are grouped
 * under "Other".
 */

type Props = {
  title?: string;
  counts: Record<string, number>;
};

const KNOWN_PLANS: { key: PlanName; color: string }[] = [
  { key: 'free', color: 'bg-slate-400' },
  { key: 'business', color: 'bg-brand-500' },
  { key: 'business_plus', color: 'bg-emerald-600' },
  { key: 'landlord', color: 'bg-indigo-500' },
  { key: 'estate_manager', color: 'bg-violet-600' },
];

export function PlanDistribution({ title = 'Plan distribution', counts }: Props) {
  const segments = KNOWN_PLANS.map((p) => ({
    key: p.key,
    label: PLAN_LABELS[p.key],
    color: p.color,
    count: counts[p.key] ?? 0,
  }));
  const total = segments.reduce((s, v) => s + v.count, 0);

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        <span className="text-[11px] font-semibold text-slate-500">
          {total} {total === 1 ? 'user' : 'users'}
        </span>
      </div>
      {/* Stacked proportion bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {total > 0 &&
          segments.map((s) =>
            s.count > 0 ? (
              <div
                key={s.key}
                className={s.color}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            ) : null,
          )}
      </div>
      {/* Legend */}
      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
          return (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5"
            >
              <dt className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className={'h-2.5 w-2.5 rounded-sm ' + s.color} />
                {s.label}
              </dt>
              <dd className="text-xs font-bold text-ink">
                {s.count}
                <span className="ml-1 font-normal text-slate-500">· {pct}%</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
