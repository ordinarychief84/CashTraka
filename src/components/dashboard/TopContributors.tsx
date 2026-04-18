import Link from 'next/link';
import { Users, Crown } from 'lucide-react';
import { formatNaira } from '@/lib/format';

/**
 * Top customers this month, by revenue contribution.
 *
 * Surfaces *who* is driving the business so the owner can prioritise
 * relationships. Intentionally simple — one click takes you to that
 * customer's detail page.
 */

type Row = {
  id: string;
  name: string;
  total: number;
  transactions: number;
};

export function TopContributors({
  rows,
  monthLabel,
  isPm = false,
}: {
  rows: Row[];
  monthLabel: string;
  isPm?: boolean;
}) {
  const heading = isPm ? 'Top tenants' : 'Top customers';
  const emptyMsg = isPm
    ? 'No rent payments yet this month. Your top tenants will appear here as rent comes in.'
    : 'No paid transactions yet this month. Your best customers will appear here as money comes in.';

  if (rows.length === 0) {
    return (
      <section className="card p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <Users size={16} className="text-slate-500" />
          {heading} — {monthLabel}
        </h2>
        <p className="text-xs text-slate-500">{emptyMsg}</p>
      </section>
    );
  }

  const top = rows[0];
  const totalFromTop = rows.reduce((s, r) => s + r.total, 0);

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
        <Users size={16} className="text-brand-600" />
        {heading} — {monthLabel}
      </h2>
      <ul className="space-y-2">
        {rows.map((row, i) => {
          const pct = totalFromTop > 0 ? Math.round((row.total / totalFromTop) * 100) : 0;
          return (
            <li key={row.id}>
              <Link
                href={`/customers/${row.id}`}
                className="flex items-center gap-3 rounded-lg border border-transparent p-2 transition hover:border-border hover:bg-slate-50"
              >
                <div
                  className={
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ' +
                    (i === 0
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600')
                  }
                >
                  {i === 0 ? <Crown size={14} /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">
                      {row.name}
                    </span>
                    <span className="num text-sm font-bold text-brand-700">
                      {formatNaira(row.total)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {/* Mini bar showing share */}
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.max(6, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {row.transactions}{' '}
                      {row.transactions === 1 ? 'tx' : 'txs'}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
