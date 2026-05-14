'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check, Package, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { ProductRowActions } from '@/components/ProductRowActions';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  note: string | null;
  description: string | null;
  price: number;
  cost: number | null;
  stock: number;
  trackStock: boolean;
  lowStockAt: number;
  archived: boolean;
  isPublished: boolean;
  catalogStatus: string;
  nafdacNumber: string | null;
  shelfLifeDays: number | null;
  images: string[];
  group: string | null;
};

type SortKey = 'id' | 'name' | 'group' | 'sku' | 'price' | 'stock';

const GROUP_OPTIONS = ['All groups', 'Standard', 'Premium', 'Custom', 'Default'];

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const [q, setQ] = useState('');
  const [skuQ, setSkuQ] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('All groups');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const skuQl = skuQ.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!showArchived && r.archived) return false;
      if (ql && !r.name.toLowerCase().includes(ql)) return false;
      if (skuQl && !(r.sku ?? '').toLowerCase().includes(skuQl)) return false;
      if (
        groupFilter !== 'All groups' &&
        (r.group ?? 'Default') !== groupFilter
      ) {
        return false;
      }
      return true;
    });
    const sorted = [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'id':
          return a.id.localeCompare(b.id) * dir;
        case 'group':
          return (a.group ?? '').localeCompare(b.group ?? '') * dir;
        case 'sku':
          return (a.sku ?? '').localeCompare(b.sku ?? '') * dir;
        case 'price':
          return (a.price - b.price) * dir;
        case 'stock':
          return (a.stock - b.stock) * dir;
        case 'name':
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
    return sorted;
  }, [rows, q, skuQ, groupFilter, showArchived, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  const total = rows.filter((r) => showArchived || !r.archived).length;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50/50 px-3 py-2 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-ink">{filtered.length}</span> of{' '}
            <span className="font-bold text-ink">{total}</span> items
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <span className="text-slate-600">Show archived</span>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="sr-only peer"
            />
            <span className="relative inline-block h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-brand-500">
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
            </span>
          </label>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col style={{ width: '92px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '130px' }} />
                <col />
                <col style={{ width: '130px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '80px' }} />
              </colgroup>
              <thead className="border-b border-border bg-white">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Th onClick={() => toggleSort('id')} active={sortBy === 'id'} dir={sortDir}>
                    ID
                  </Th>
                  <th className="px-3 py-2">Image</th>
                  <Th
                    onClick={() => toggleSort('group')}
                    active={sortBy === 'group'}
                    dir={sortDir}
                  >
                    Group
                  </Th>
                  <Th onClick={() => toggleSort('name')} active={sortBy === 'name'} dir={sortDir}>
                    Name
                  </Th>
                  <Th onClick={() => toggleSort('sku')} active={sortBy === 'sku'} dir={sortDir}>
                    SKU
                  </Th>
                  <Th
                    onClick={() => toggleSort('price')}
                    active={sortBy === 'price'}
                    dir={sortDir}
                    align="right"
                  >
                    Price
                  </Th>
                  <Th
                    onClick={() => toggleSort('stock')}
                    active={sortBy === 'stock'}
                    dir={sortDir}
                    align="right"
                  >
                    Stock
                  </Th>
                  <th className="px-3 py-2 text-center">Active</th>
                  <th className="px-3 py-2" />
                </tr>
                {/* Inline filter row */}
                <tr className="border-b border-border bg-slate-50/50">
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2">
                    <select
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                    >
                      {GROUP_OPTIONS.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <div className="relative">
                      <Search
                        size={12}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search name"
                        className="w-full rounded-md border border-border bg-white pl-6 pr-2 py-1 text-xs"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={skuQ}
                      onChange={(e) => setSkuQ(e.target.value)}
                      placeholder="SKU"
                      className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                  <td className="px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const isLow = p.trackStock && p.stock <= p.lowStockAt;
                  const img = p.images?.[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 align-middle">
                        <Link
                          href={`/products/${p.id}`}
                          className="font-mono text-xs text-brand-700 hover:underline"
                        >
                          {p.id.slice(-7).toUpperCase()}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-slate-50">
                          {img ? (
                            <Image
                              src={img}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 object-cover"
                              unoptimized
                            />
                          ) : (
                            <Package size={16} className="text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-slate-600">
                        {p.group ?? 'Default'}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <Link
                          href={`/products/${p.id}`}
                          className="font-semibold text-ink hover:text-brand-700"
                        >
                          {p.name}
                        </Link>
                        {p.note ? (
                          <div className="truncate text-xs text-slate-500">{p.note}</div>
                        ) : null}
                        {p.nafdacNumber ? (
                          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            NAFDAC {p.nafdacNumber}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-middle font-mono text-xs text-slate-600">
                        {p.sku ?? '—'}
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <div className="num text-sm font-semibold text-ink">
                          {formatNaira(p.price)}
                        </div>
                        {p.cost != null ? (
                          <div className="num text-[10px] text-slate-500">
                            cost {formatNaira(p.cost)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        {p.trackStock ? (
                          <span
                            className={cn(
                              'num inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                              isLow
                                ? 'bg-rose-50 text-rose-700'
                                : p.stock === 0
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-50 text-emerald-700',
                            )}
                          >
                            {p.stock}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">untracked</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle text-center">
                        {p.archived ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <Check size={16} className="mx-auto text-emerald-600" />
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle text-right">
                        <ProductRowActions id={p.id} trackStock={p.trackStock} />
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
                      No products match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards */}
        <ul className="divide-y divide-border md:hidden">
          {filtered.map((p) => {
            const isLow = p.trackStock && p.stock <= p.lowStockAt;
            const img = p.images?.[0];
            return (
              <li key={p.id}>
                <Link href={`/products/${p.id}`} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-slate-50">
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 object-cover"
                        unoptimized
                      />
                    ) : (
                      <Package size={18} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.group ?? 'Default'}
                      {p.sku ? ` · ${p.sku}` : ''}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="num rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                        {formatNaira(p.price)}
                      </span>
                      {p.trackStock && (
                        <span
                          className={cn(
                            'num rounded-full px-2 py-0.5',
                            isLow
                              ? 'bg-rose-50 text-rose-700'
                              : p.stock === 0
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-emerald-50 text-emerald-700',
                          )}
                        >
                          {p.stock} in stock
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No products match these filters.
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
