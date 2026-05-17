'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpDown,
  Download,
  TrendingDown,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

type Row = {
  id: string;
  productionNumber: string;
  completedAt: string | null;
  productName: string;
  quantity: number;
  materialCostKobo: number;
  labourCostKobo: number;
  overheadCostKobo: number;
  totalCostKobo: number;
  revenueKobo: number;
  grossMarginBps: number;
  costPerUnitKobo: number;
};

type SortKey = 'date' | 'margin' | 'cost' | 'revenue';
type SortDir = 'asc' | 'desc';

function naira(kobo: number): string {
  return '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProfitabilityClient({
  initial,
  days,
}: {
  initial: Row[];
  days: number;
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...initial];
    copy.sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case 'date':
          diff =
            (a.completedAt ? new Date(a.completedAt).getTime() : 0) -
            (b.completedAt ? new Date(b.completedAt).getTime() : 0);
          break;
        case 'margin':
          diff = a.grossMarginBps - b.grossMarginBps;
          break;
        case 'cost':
          diff = a.totalCostKobo - b.totalCostKobo;
          break;
        case 'revenue':
          diff = a.revenueKobo - b.revenueKobo;
          break;
      }
      return sortDir === 'asc' ? diff : -diff;
    });
    return copy;
  }, [initial, sortKey, sortDir]);

  const summary = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    let lossCount = 0;
    let marginNumerator = 0;
    let marginDenominator = 0;
    for (const r of initial) {
      revenue += r.revenueKobo;
      cost += r.totalCostKobo;
      if (r.grossMarginBps < 0) lossCount++;
      if (r.revenueKobo > 0) {
        marginNumerator += r.revenueKobo - r.totalCostKobo;
        marginDenominator += r.revenueKobo;
      }
    }
    const avgMarginPct =
      marginDenominator === 0
        ? null
        : ((marginNumerator / marginDenominator) * 100).toFixed(1);
    return { revenue, cost, lossCount, avgMarginPct, batches: initial.length };
  }, [initial]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function changeRange(next: number) {
    const usp = new URLSearchParams();
    usp.set('range', String(next));
    router.push(`/reports/profitability?${usp.toString()}`);
  }

  function exportCsv() {
    if (initial.length === 0) return;
    const header = [
      'date',
      'production_number',
      'product',
      'quantity',
      'material_cost_kobo',
      'labour_cost_kobo',
      'overhead_cost_kobo',
      'total_cost_kobo',
      'revenue_kobo',
      'gross_margin_bps',
      'cost_per_unit_kobo',
    ];
    const lines = [header.join(',')];
    for (const r of sorted) {
      lines.push(
        [
          r.completedAt ?? '',
          r.productionNumber,
          JSON.stringify(r.productName),
          r.quantity,
          r.materialCostKobo,
          r.labourCostKobo,
          r.overheadCostKobo,
          r.totalCostKobo,
          r.revenueKobo,
          r.grossMarginBps,
          r.costPerUnitKobo,
        ].join(','),
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `cashtraka-profitability-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Empty ── */
  if (initial.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
        <p className="text-sm font-semibold text-ink">No profitability data yet</p>
        <p className="mt-1 text-xs text-slate-600">
          Complete your first production batch to see profitability data. Cost data is
          calculated automatically when a production run is marked complete.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Range + export controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-border bg-white text-xs font-semibold">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => changeRange(d)}
              className={
                'px-3 py-1.5 ' +
                (d === days
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-700 hover:bg-slate-50')
              }
            >
              Last {d} days
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:bg-brand-50"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Summary tiles */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label={`Avg margin · last ${days}d`}
          value={summary.avgMarginPct === null ? '—' : summary.avgMarginPct + '%'}
        />
        <SummaryTile label="Total revenue" value={naira(summary.revenue)} />
        <SummaryTile label="Total cost" value={naira(summary.cost)} />
        <SummaryTile
          label="Loss batches"
          value={String(summary.lossCount)}
          tone={summary.lossCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleSort('date')}
                  className="inline-flex items-center gap-1"
                >
                  Date <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="px-3 py-2">Run</th>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Material</th>
              <th className="px-3 py-2 text-right">Labour</th>
              <th className="px-3 py-2 text-right">Overhead</th>
              <th className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('cost')}
                  className="inline-flex items-center gap-1"
                >
                  Cost <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('revenue')}
                  className="inline-flex items-center gap-1"
                >
                  Revenue <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('margin')}
                  className="inline-flex items-center gap-1"
                >
                  Margin <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="px-3 py-2 text-right">Cost/unit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const marginPct = (r.grossMarginBps / 100).toFixed(1) + '%';
              const isLoss = r.grossMarginBps < 0;
              const noRev = r.revenueKobo === 0;
              return (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-slate-700">{fmtDate(r.completedAt)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-800">
                    <Link href={`/production/${r.id}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      {r.productionNumber}
                      <ExternalLink size={11} />
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-800">{r.productName}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{r.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{naira(r.materialCostKobo)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{naira(r.labourCostKobo)}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{naira(r.overheadCostKobo)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">
                    {naira(r.totalCostKobo)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-800">
                    {noRev ? '—' : naira(r.revenueKobo)}
                  </td>
                  <td
                    className={
                      'px-3 py-2 text-right font-bold ' +
                      (noRev
                        ? 'text-slate-400'
                        : isLoss
                          ? 'text-rose-700'
                          : r.grossMarginBps >= 4000
                            ? 'text-success-700'
                            : r.grossMarginBps >= 2000
                              ? 'text-amber-700'
                              : 'text-rose-700')
                    }
                  >
                    {noRev ? (
                      '—'
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {isLoss ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
                        {marginPct}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">
                    {naira(r.costPerUnitKobo)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger' | 'neutral';
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={
          'mt-1 text-xl font-black ' +
          (tone === 'danger' ? 'text-rose-700' : 'text-slate-900')
        }
      >
        {value}
      </div>
    </div>
  );
}
