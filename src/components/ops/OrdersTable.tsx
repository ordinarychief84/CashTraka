'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';
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
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  IN_PRODUCTION: 'In Production',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
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

/* ── Small action button ──────────────────────────────────────────── */
function ActionBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded border border-border bg-white text-slate-500 hover:border-brand-400 hover:text-brand-600"
    >
      {children}
    </button>
  );
}

/* ── Sortable column header ─────────────────────────────────────── */
function SortTh({
  children,
  sortKey,
  currentSort,
  dir,
  onSort,
  align = 'left',
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSort: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={cn(
        'px-3 py-2',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-0.5 whitespace-nowrap hover:text-ink',
          active ? 'text-ink' : 'text-slate-500',
        )}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp size={11} />
          ) : (
            <ChevronDown size={11} />
          )
        ) : (
          <ChevronDown size={11} className="text-slate-300" />
        )}
      </button>
    </th>
  );
}

/* ── Main table component ─────────────────────────────────────────── */
export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('dueAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  /* ── Filter + sort ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (!showClosed && (r.status === 'CANCELLED' || r.status === 'DELIVERED')) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (showOverdueOnly) {
        const d = daysLeft(r.dueAt);
        if (d === null || d >= 0) return false;
      }
      if (
        q &&
        !r.customerName.toLowerCase().includes(q) &&
        !r.orderNumber.toLowerCase().includes(q) &&
        !r.productSummary.toLowerCase().includes(q)
      )
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
  }, [rows, search, statusFilter, showClosed, showOverdueOnly, sortBy, sortDir]);

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
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  const pageTotal = filtered.reduce((s, o) => s + o.totalKobo, 0);
  const overdueCount = rows.filter((r) => {
    const d = daysLeft(r.dueAt);
    return (
      d !== null &&
      d < 0 &&
      r.status !== 'DELIVERED' &&
      r.status !== 'CANCELLED'
    );
  }).length;

  return (
    <div className="card overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-slate-50/50 px-4 py-2.5 text-xs">
        {/* Record count */}
        <div className="text-slate-600">
          Records:{' '}
          <span className="font-bold text-ink">{filtered.length}</span>
          {rows.length !== filtered.length && (
            <span className="text-slate-400"> / {rows.length}</span>
          )}
        </div>

        {/* Overdue count badge */}
        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setShowOverdueOnly((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition',
              showOverdueOnly
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
            )}
          >
            <AlertTriangle size={10} />
            {overdueCount} overdue
          </button>
        )}

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-ink outline-none focus:border-brand-400"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Show closed toggle */}
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand-500"
          />
          Show delivered / cancelled
        </label>

        {/* Export */}
        <a
          href="/api/orders/export"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </a>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {/* Column headers */}
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 accent-brand-500"
                    aria-label="Select all"
                  />
                </th>
                <SortTh
                  sortKey="status"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="w-28"
                >
                  Status
                </SortTh>
                <SortTh
                  sortKey="orderNumber"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="w-28"
                >
                  Order ID
                </SortTh>
                <SortTh
                  sortKey="customerName"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                >
                  Client
                </SortTh>
                <th className="px-3 py-2">Products</th>
                <SortTh
                  sortKey="dueAt"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="w-20"
                  align="center"
                >
                  Days left
                </SortTh>
                <th className="w-28 px-3 py-2">Due date</th>
                <th className="w-28 px-3 py-2">Prod. status</th>
                <th className="px-3 py-2">Notes</th>
                <SortTh
                  sortKey="totalKobo"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  align="right"
                  className="w-28"
                >
                  Total
                </SortTh>
                <th className="w-20 px-3 py-2" />
              </tr>

              {/* Inline filter row */}
              <tr className="border-b border-border bg-slate-50/70">
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5">
                  <div className="relative">
                    <Search
                      size={11}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Client or order #"
                      className="w-full rounded-md border border-border bg-white py-1 pl-5 pr-2 text-xs outline-none focus:border-brand-400"
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
                <td className="px-3 py-1.5" />
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((o) => {
                const d = daysLeft(o.dueAt);
                const overdue = d !== null && d < 0;
                const dueSoon = d !== null && d >= 0 && d <= 3;

                return (
                  <tr key={o.id} className="group hover:bg-slate-50/60">
                    {/* Checkbox */}
                    <td className="px-3 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        className="h-3.5 w-3.5 accent-brand-500"
                      />
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 align-middle">
                      <StatusBadge status={o.status} />
                    </td>

                    {/* Order ID */}
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>

                    {/* Client */}
                    <td className="px-3 py-2.5 align-middle">
                      <div className="font-semibold text-ink">{o.customerName}</div>
                      {o.customerPhone && (
                        <div className="text-xs text-slate-500">{o.customerPhone}</div>
                      )}
                    </td>

                    {/* Products */}
                    <td className="px-3 py-2.5 align-middle">
                      <div className="max-w-[160px] truncate text-sm text-slate-700">
                        {o.productSummary || '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </td>

                    {/* Days left */}
                    <td className="px-3 py-2.5 text-center align-middle">
                      {d === null ? (
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
                          {overdue ? `${d}d` : `+${d}d`}
                        </span>
                      )}
                    </td>

                    {/* Due date */}
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      <div className="inline-flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        {formatDate(o.dueAt)}
                      </div>
                    </td>

                    {/* Production status */}
                    <td className="px-3 py-2.5 align-middle">
                      {o.productionStatus ? (
                        <StatusBadge status={o.productionStatus} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="max-w-[120px] px-3 py-2.5 align-middle">
                      <span className="line-clamp-1 text-xs text-slate-500">{o.notes ?? ''}</span>
                    </td>

                    {/* Total */}
                    <td className="px-3 py-2.5 text-right align-middle">
                      <span className="num text-sm font-bold text-ink">
                        {formatKobo(o.totalKobo)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <ActionBtn title="View" onClick={() => router.push(`/orders/${o.id}`)}>
                          <Eye size={12} />
                        </ActionBtn>
                        <ActionBtn
                          title="Edit"
                          onClick={() => router.push(`/orders/${o.id}/edit`)}
                        >
                          <Pencil size={12} />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-500">
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Page summary footer */}
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-amber-200 bg-amber-50/70">
                  <td colSpan={9} className="px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Page summary — {filtered.length} orders
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="num text-sm font-black text-ink">
                      {formatKobo(pageTotal)}
                    </span>
                  </td>
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <ul className="divide-y divide-border md:hidden">
        {filtered.map((o) => {
          const d = daysLeft(o.dueAt);
          const overdue = d !== null && d < 0;
          return (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={o.status} />
                  <span className="font-mono text-xs font-semibold text-brand-700">
                    {o.orderNumber}
                  </span>
                </div>
                <div className="text-sm font-semibold text-ink">{o.customerName}</div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'} · {formatDate(o.dueAt)}
                    {d !== null && (
                      <span
                        className={cn('ml-1 font-bold', overdue ? 'text-rose-600' : 'text-slate-700')}
                      >
                        ({d}d)
                      </span>
                    )}
                  </span>
                  <span className="num font-bold text-ink">{formatKobo(o.totalKobo)}</span>
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
  );
}
