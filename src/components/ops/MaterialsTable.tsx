'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Boxes, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type MaterialRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  stock: number;
  reorderLevel: number;
  unitCostKobo: number;
  status: string;
  supplierName: string | null;
  lastPurchaseAt: string | null;
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'DISCONTINUED', label: 'Discontinued' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Materials list table. Matches the comp's columns: thumbnail +
 * name+subtitle, category, SKU, unit, current stock, reorder level,
 * status, last purchase, supplier, row actions. Client-side filtering
 * by name + category + status.
 */
export function MaterialsTable({ rows }: { rows: MaterialRow[] }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r.category) set.add(r.category);
    }
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (ql) {
        const hay = [r.name, r.sku ?? '', r.supplierName ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      if (category && r.category !== category) return false;
      if (status) {
        if (status === 'LOW_STOCK') {
          if (!(r.stock > 0 && r.stock <= r.reorderLevel)) return false;
        } else if (status === 'OUT_OF_STOCK') {
          if (r.stock !== 0) return false;
        } else {
          if (r.status !== status) return false;
        }
      }
      return true;
    });
  }, [rows, q, category, status]);

  return (
    <div className="card overflow-hidden">
      {/* Filter bar */}
      <div className="grid gap-2 border-b border-border bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by material name, SKU or supplier..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Material</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">Current Stock</th>
                <th className="px-3 py-2.5 text-right">Reorder Level</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Last Purchase</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const isLow = r.stock > 0 && r.stock <= r.reorderLevel;
                const isOut = r.stock === 0;
                const renderStatus = isOut
                  ? 'OUT_OF_STOCK'
                  : isLow
                    ? 'LOW_STOCK'
                    : r.status || 'ACTIVE';
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={`/materials/${r.id}`}
                        className="flex items-center gap-2.5 hover:opacity-90"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                          <Boxes size={14} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink">
                            {r.name}
                          </div>
                          {r.category && (
                            <div className="text-[10px] text-slate-500">
                              {r.category}
                            </div>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {r.category ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle font-mono text-xs text-slate-600">
                      {r.sku ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {r.unit}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right">
                      <span
                        className={cn(
                          'num text-sm font-semibold',
                          isOut
                            ? 'text-rose-700'
                            : isLow
                              ? 'text-owed-700'
                              : 'text-ink',
                        )}
                      >
                        {r.stock} {r.unit}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs text-slate-600">
                      {r.reorderLevel} {r.unit}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <StatusBadge status={renderStatus} />
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {formatDate(r.lastPurchaseAt)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {r.supplierName ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right">
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Row actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No materials match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {filtered.map((r) => {
          const isLow = r.stock > 0 && r.stock <= r.reorderLevel;
          const isOut = r.stock === 0;
          const renderStatus = isOut
            ? 'OUT_OF_STOCK'
            : isLow
              ? 'LOW_STOCK'
              : r.status || 'ACTIVE';
          return (
            <li key={r.id}>
              <Link
                href={`/materials/${r.id}`}
                className="flex items-start gap-3 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                  <Boxes size={16} className="text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r.name}
                    </div>
                    <StatusBadge status={renderStatus} />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {r.category ?? '—'}
                    {r.supplierName ? ` · ${r.supplierName}` : ''}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {r.sku ? `SKU ${r.sku}` : 'No SKU'}
                    </span>
                    <span
                      className={cn(
                        'num font-semibold',
                        isOut
                          ? 'text-rose-700'
                          : isLow
                            ? 'text-owed-700'
                            : 'text-ink',
                      )}
                    >
                      {r.stock} {r.unit}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No materials match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
