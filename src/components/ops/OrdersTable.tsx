'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Search,
} from 'lucide-react';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusFilterSelect } from '@/components/ui/StatusFilterSelect';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  totalKobo: number;
  dueAt: string | null;
  createdAt: string;
  notes: string | null;
  itemCount: number;
  productSummary: string;
  productionStatus: string | null;
};

type SortKey = 'orderNumber' | 'customerName' | 'dueAt' | 'totalKobo' | 'status';

const STATUSES = [
  'NEW',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY',
  'DELIVERED',
  'CANCELLED',
] as const;

const STATUS_LABEL: Record<string, string> = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  IN_PRODUCTION: 'IN PRODUCTION',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('dueAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (!showCancelled && (r.status === 'CANCELLED' || r.status === 'DELIVERED'))
        return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (q && !r.customerName.toLowerCase().includes(q) && !r.orderNumber.toLowerCase().includes(q))
        return false;
      return true;
    });
    return [...out].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'orderNumber':
          return a.orderNumber.localeCompare(b.orderNumber) * dir;
        case 'customerName':
          return a.customerName.localeCompare(b.customerName) * dir;
        case 'dueAt': {
          const av = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bv = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return (av - bv) * dir;
        }
        case 'totalKobo':
          return (a.totalKobo - b.totalKobo) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
      }
    });
  }, [rows, search, statusFilter, showCancelled, sortBy, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setSortDir('asc');
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  }

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-slate-50/50 px-3 py-2">
          <div className="text-xs text-slate-600">
            Records: <span className="font-bold text-ink">{filtered.length}</span>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 text-xs">
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={(e) => setShowCancelled(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-500"
              />
              <span className="text-slate-600">Show cancelled / delivered</span>
            </label>
            <a
              href="/api/orders/export"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
            >
              CSV
            </a>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <StatusFilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All' },
              ...STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABEL[s] ?? s,
              })),
            ]}
            size="sm"
          />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-white">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 accent-brand-500"
                      aria-label="Select all"
                    />
                  </th>
                  <Th
                    onClick={() => toggleSort('status')}
                    active={sortBy === 'status'}
                    dir={sortDir}
                  >
                    Status
                  </Th>
                  <Th
                    onClick={() => toggleSort('orderNumber')}
                    active={sortBy === 'orderNumber'}
                    dir={sortDir}
                  >
                    ID
                  </Th>
                  <Th
                    onClick={() => toggleSort('customerName')}
                    active={sortBy === 'customerName'}
                    dir={sortDir}
                  >
                    Customer
                  </Th>
                  <th className="px-3 py-2">Product</th>
                  <Th
                    onClick={() => toggleSort('dueAt')}
                    active={sortBy === 'dueAt'}
                    dir={sortDir}
                  >
                    Days left
                  </Th>
                  <th className="px-3 py-2">Due date</th>
                  <th className="px-3 py-2">Notes</th>
                  <Th
                    onClick={() => toggleSort('totalKobo')}
                    active={sortBy === 'totalKobo'}
                    dir={sortDir}
                    align="right"
                  >
                    Total
                  </Th>
                </tr>
                <tr className="border-b border-border bg-slate-50/50">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2">
                    <div className="relative">
                      <Search
                        size={12}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Customer or order #"
                        className="w-full rounded-md border border-border bg-white pl-6 pr-2 py-1 text-xs"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => {
                  const d = daysLeft(o.dueAt);
                  const overdue = d != null && d < 0;
                  const dueSoon = d != null && d >= 0 && d <= 3;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleSelect(o.id)}
                          className="h-3.5 w-3.5 accent-brand-500"
                          aria-label={`Select ${o.orderNumber}`}
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Link
                          href={`/orders/${o.id}`}
                          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="font-semibold text-ink">{o.customerName}</div>
                        {o.customerPhone ? (
                          <div className="text-xs text-slate-500">{o.customerPhone}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="text-sm text-slate-700">{o.productSummary || '—'}</div>
                        <div className="text-xs text-slate-500">
                          {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {d == null ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <span
                            className={cn(
                              'text-sm font-bold',
                              overdue
                                ? 'text-rose-600'
                                : dueSoon
                                  ? 'text-amber-600'
                                  : 'text-emerald-700',
                            )}
                          >
                            {overdue ? `${d}d` : `${d}d`}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-600">
                        <div className="inline-flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(o.dueAt)}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-500">
                        <span className="line-clamp-1">{o.notes ?? ''}</span>
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <span className="num text-sm font-bold text-ink">
                          {formatKobo(o.totalKobo)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No orders match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-amber-50/60">
                    <td className="px-3 py-2" colSpan={8}>
                      <span className="text-xs font-semibold uppercase text-slate-600">
                        Page summary
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="num text-sm font-black text-ink">
                        {formatKobo(filtered.reduce((s, o) => s + o.totalKobo, 0))}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <ul className="divide-y divide-border md:hidden">
          {filtered.map((o) => {
            const d = daysLeft(o.dueAt);
            const overdue = d != null && d < 0;
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="flex flex-col gap-1 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={o.status} />
                    <span className="font-mono text-xs font-semibold text-brand-700">
                      {o.orderNumber}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-ink">{o.customerName}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'} ·{' '}
                      {formatDate(o.dueAt)}
                      {d != null && (
                        <span
                          className={cn(
                            'ml-1 font-bold',
                            overdue ? 'text-rose-600' : 'text-slate-700',
                          )}
                        >
                          ({d}d)
                        </span>
                      )}
                    </span>
                    <span className="num font-bold text-ink">
                      {formatKobo(o.totalKobo)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No orders match these filters.
            </li>
          )}
        </ul>
      </div>
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
