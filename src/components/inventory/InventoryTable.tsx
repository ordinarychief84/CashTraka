'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Boxes, Package, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKobo } from '@/lib/format';

export type InventoryItemType =
  | 'FINISHED_GOOD'
  | 'RAW_MATERIAL'
  | 'PACKAGING'
  | 'CONSUMABLE';

export type InventoryRow = {
  id: string;
  detailHref: string;
  itemType: InventoryItemType;
  itemTypeLabel: string;
  name: string;
  sku: string | null;
  unit: string;
  stock: number;
  reserved: number;
  reorderLevel: number;
  unitCostKobo: number;
  category: string | null;
};

const TABS: { value: 'ALL' | InventoryItemType; label: string }[] = [
  { value: 'ALL', label: 'All Items' },
  { value: 'RAW_MATERIAL', label: 'Raw Materials' },
  { value: 'FINISHED_GOOD', label: 'Finished Goods' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'CONSUMABLE', label: 'Consumables' },
];

/**
 * Unified inventory list. Tabs filter by item type. Single source of
 * truth for stock-on-hand, reserved, available, value, and status —
 * mirrors the approved comp exactly. Client-side filtering only.
 */
export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  const [tab, setTab] = useState<'ALL' | InventoryItemType>('ALL');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: rows.length,
      RAW_MATERIAL: 0,
      FINISHED_GOOD: 0,
      PACKAGING: 0,
      CONSUMABLE: 0,
    };
    for (const r of rows) c[r.itemType] = (c[r.itemType] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'ALL' && r.itemType !== tab) return false;
      if (ql) {
        const hay = [r.name, r.sku ?? '', r.category ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      if (status) {
        const isOut = r.stock <= 0;
        const isLow = !isOut && r.stock <= r.reorderLevel;
        const s =
          status === 'IN_STOCK'
            ? !isOut && !isLow
            : status === 'LOW_STOCK'
              ? isLow
              : status === 'OUT_OF_STOCK'
                ? isOut
                : true;
        if (!s) return false;
      }
      return true;
    });
  }, [rows, tab, q, status]);

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border bg-white px-3 pt-3">
        {TABS.map((t) => {
          const isActive = tab === t.value;
          const count = counts[t.value] ?? 0;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition',
                isActive
                  ? 'border-b-2 border-brand-500 text-brand-700'
                  : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'num inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]',
                  isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="grid gap-2 border-b border-border bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search inventory by name, SKU or category..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Item</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">SKU</th>
                <th className="px-3 py-2.5">Unit</th>
                <th className="px-3 py-2.5 text-right">Stock On Hand</th>
                <th className="px-3 py-2.5 text-right">Reserved</th>
                <th className="px-3 py-2.5 text-right">Available</th>
                <th className="px-3 py-2.5 text-right">Value</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const available = Math.max(0, r.stock - r.reserved);
                const isOut = r.stock <= 0;
                const isLow = !isOut && r.stock <= r.reorderLevel;
                const renderStatus = isOut
                  ? 'OUT_OF_STOCK'
                  : isLow
                    ? 'LOW_STOCK'
                    : 'ACTIVE';
                const value = r.stock * r.unitCostKobo;
                const isProduct = r.itemType === 'FINISHED_GOOD';
                return (
                  <tr key={`${r.itemType}-${r.id}`} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={r.detailHref}
                        className="flex items-center gap-2.5 hover:opacity-90"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                          {isProduct ? (
                            <Package size={14} className="text-slate-400" />
                          ) : (
                            <Boxes size={14} className="text-slate-400" />
                          )}
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
                      {r.itemTypeLabel}
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
                        {r.stock.toLocaleString('en-NG')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs text-slate-600">
                      {r.reserved.toLocaleString('en-NG')}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs font-semibold text-ink">
                      {available.toLocaleString('en-NG')}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs font-semibold text-ink">
                      {formatKobo(value)}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <StatusBadge status={renderStatus} />
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
                    No inventory items match these filters.
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
          const available = Math.max(0, r.stock - r.reserved);
          const isOut = r.stock <= 0;
          const isLow = !isOut && r.stock <= r.reorderLevel;
          const renderStatus = isOut
            ? 'OUT_OF_STOCK'
            : isLow
              ? 'LOW_STOCK'
              : 'ACTIVE';
          const isProduct = r.itemType === 'FINISHED_GOOD';
          return (
            <li key={`${r.itemType}-${r.id}`}>
              <Link href={r.detailHref} className="flex items-start gap-3 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                  {isProduct ? (
                    <Package size={16} className="text-slate-400" />
                  ) : (
                    <Boxes size={16} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-semibold text-ink">
                      {r.name}
                    </div>
                    <StatusBadge status={renderStatus} />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {r.itemTypeLabel}
                    {r.category ? ` · ${r.category}` : ''}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Available {available} {r.unit}
                    </span>
                    <span
                      className={cn(
                        'num font-semibold',
                        isOut ? 'text-rose-700' : isLow ? 'text-owed-700' : 'text-ink',
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
            No inventory items match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
