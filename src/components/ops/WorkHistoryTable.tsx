'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type WorkHistoryRow = {
  id: string;
  productionNumber: string;
  customerOrderNumber: string | null;
  customerName: string | null;
  productNames: string[];
  totalQty: number;
  status: string;
  plannedStartAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  notes: string | null;
  batchNumber: string | null;
  unitCostKoboTotal: number;
};

type SortKey =
  | 'productionNumber'
  | 'customerOrderNumber'
  | 'customerName'
  | 'totalQty'
  | 'durationMs'
  | 'startedAt'
  | 'completedAt';

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-NG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatKobo(kobo: number): string {
  return '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
}

export function WorkHistoryTable({ rows }: { rows: WorkHistoryRow[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageSize, setPageSize] = useState(30);
  const [sortBy, setSortBy] = useState<SortKey>('completedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (q) {
        const hay = [
          r.productionNumber,
          r.customerOrderNumber ?? '',
          r.customerName ?? '',
          r.productNames.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'productionNumber':
          return a.productionNumber.localeCompare(b.productionNumber) * dir;
        case 'customerOrderNumber':
          return (
            (a.customerOrderNumber ?? '').localeCompare(b.customerOrderNumber ?? '') *
            dir
          );
        case 'customerName':
          return (
            (a.customerName ?? '').localeCompare(b.customerName ?? '') * dir
          );
        case 'totalQty':
          return (a.totalQty - b.totalQty) * dir;
        case 'durationMs':
          return ((a.durationMs ?? 0) - (b.durationMs ?? 0)) * dir;
        case 'startedAt': {
          const av = a.startedAt ? new Date(a.startedAt).getTime() : 0;
          const bv = b.startedAt ? new Date(b.startedAt).getTime() : 0;
          return (av - bv) * dir;
        }
        case 'completedAt': {
          const av = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bv = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return (av - bv) * dir;
        }
      }
    });
    return list;
  }, [rows, search, statusFilter, sortBy, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setSortDir('desc');
    }
  }

  const visible = filtered.slice(0, pageSize);
  const totalQty = filtered.reduce((s, r) => s + r.totalQty, 0);
  const totalDurationMs = filtered.reduce(
    (s, r) => s + (r.durationMs ?? 0),
    0,
  );
  const totalCostKobo = filtered.reduce(
    (s, r) => s + r.unitCostKoboTotal,
    0,
  );

  return (
    <div className="card overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50/50 px-3 py-2">
        <div className="text-xs text-slate-600">
          Showing <span className="font-bold text-ink">{visible.length}</span>{' '}
          of <span className="font-bold text-ink">{filtered.length}</span> records
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-1">
            <span className="text-slate-600">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-border bg-white px-1.5 py-0.5"
            >
              {[15, 30, 50, 100, 200].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <a
            href="/api/production-orders/export"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={12} />
            CSV
          </a>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-white">
              <tr className="font-semibold uppercase tracking-wide text-slate-500">
                <Th onClick={() => toggleSort('productionNumber')} active={sortBy === 'productionNumber'} dir={sortDir}>
                  Production #
                </Th>
                <Th onClick={() => toggleSort('customerOrderNumber')} active={sortBy === 'customerOrderNumber'} dir={sortDir}>
                  Order
                </Th>
                <Th onClick={() => toggleSort('customerName')} active={sortBy === 'customerName'} dir={sortDir}>
                  Customer
                </Th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-center">Status</th>
                <Th onClick={() => toggleSort('totalQty')} active={sortBy === 'totalQty'} dir={sortDir} align="right">
                  Total
                </Th>
                <Th onClick={() => toggleSort('startedAt')} active={sortBy === 'startedAt'} dir={sortDir}>
                  Start
                </Th>
                <Th onClick={() => toggleSort('completedAt')} active={sortBy === 'completedAt'} dir={sortDir}>
                  Stop
                </Th>
                <Th onClick={() => toggleSort('durationMs')} active={sortBy === 'durationMs'} dir={sortDir}>
                  Time
                </Th>
                <th className="px-3 py-2 text-right">Cost</th>
                <th className="px-3 py-2">Batch</th>
              </tr>
              <tr className="border-b border-border bg-slate-50/50">
                <td className="px-3 py-2" colSpan={3}>
                  <div className="relative">
                    <Search
                      size={12}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search production, order, customer, product"
                      className="w-full rounded-md border border-border bg-white pl-6 pr-2 py-1 text-xs"
                    />
                  </div>
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                  >
                    <option value="">All status</option>
                    {[
                      'PLANNED',
                      'MATERIALS_NEEDED',
                      'IN_PRODUCTION',
                      'COMPLETED',
                      'DELAYED',
                      'CANCELLED',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2" colSpan={5} />
                <td className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 align-middle">
                    <Link
                      href={`/production/${r.id}`}
                      className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                    >
                      {r.productionNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {r.customerOrderNumber ? (
                      <span className="font-mono text-xs text-slate-600">
                        {r.customerOrderNumber}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {r.customerName ?? <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="line-clamp-1 text-slate-700">
                      {r.productNames.join(', ') || <span className="text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 align-middle text-center">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 align-middle text-right num">
                    {r.totalQty.toLocaleString('en-NG')}
                  </td>
                  <td className="px-3 py-2 align-middle text-slate-600">
                    {formatDateTime(r.startedAt)}
                  </td>
                  <td className="px-3 py-2 align-middle text-slate-600">
                    {formatDateTime(r.completedAt)}
                  </td>
                  <td className="px-3 py-2 align-middle font-mono text-slate-700">
                    {formatDuration(r.durationMs)}
                  </td>
                  <td className="px-3 py-2 align-middle text-right num text-slate-700">
                    {r.unitCostKoboTotal > 0 ? formatKobo(r.unitCostKoboTotal) : '—'}
                  </td>
                  <td className="px-3 py-2 align-middle font-mono text-slate-500">
                    {r.batchNumber ?? '—'}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No records match these filters.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-owed-50/70">
                  <td className="px-3 py-2" colSpan={5}>
                    <span className="text-xs font-bold uppercase text-slate-600">
                      Page summary
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right num text-sm font-black text-ink">
                    {totalQty.toLocaleString('en-NG')}
                  </td>
                  <td className="px-3 py-2" colSpan={2} />
                  <td className="px-3 py-2 font-mono text-sm font-black text-ink">
                    {formatDuration(totalDurationMs)}
                  </td>
                  <td className="px-3 py-2 text-right num text-sm font-black text-ink">
                    {totalCostKobo > 0 ? formatKobo(totalCostKobo) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Mobile list */}
      <ul className="divide-y divide-border md:hidden">
        {visible.map((r) => (
          <li key={r.id}>
            <Link href={`/production/${r.id}`} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-brand-700">
                  {r.productionNumber}
                </span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-sm font-semibold text-ink">
                {r.customerName ?? '—'}
              </div>
              <div className="text-xs text-slate-500">
                {r.productNames.join(', ')}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono">{formatDuration(r.durationMs)}</span>
                <span>{r.totalQty.toLocaleString('en-NG')} units</span>
              </div>
            </Link>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No records match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  align,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: 'asc' | 'desc';
  align?: 'right';
}) {
  return (
    <th className={cn('px-3 py-2', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 hover:text-ink',
          active && 'text-ink',
        )}
      >
        {children}
        {active &&
          (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  );
}
