'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  SlidersHorizontal,
  Upload,
  Settings2,
  ChevronLeft,
  ChevronRight,
  FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  ordered: number;
  reorderLevel: number;
  unitCostKobo: number;
  category: string | null;
  supplierName: string | null;
};

type SortKey = 'name' | 'stock' | 'reserved' | 'ordered' | 'unitCostKobo' | 'value';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 30, 50];

/** Red circle = out, orange triangle = low, green tick = ok */
function StockIndicator({ stock, reorderLevel }: { stock: number; reorderLevel: number }) {
  if (stock <= 0) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" />
        <span className="num text-rose-700 font-semibold">{stock.toLocaleString()}</span>
      </span>
    );
  }
  if (stock <= reorderLevel) {
    return (
      <span className="flex items-center gap-1.5">
        {/* Orange triangle */}
        <svg width="11" height="10" viewBox="0 0 11 10" className="shrink-0">
          <path d="M5.5 1 L10 9 H1 Z" fill="#f97316" />
        </svg>
        <span className="num text-orange-600 font-semibold">{stock.toLocaleString()}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 text-success-500">
        <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" fill="none" />
        <polyline points="3,6 5,8.5 9,4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="num text-success-700 font-semibold">{stock.toLocaleString()}</span>
    </span>
  );
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="ml-0.5 text-slate-400" />;
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="ml-0.5 text-brand-500" />
    : <ChevronDown size={11} className="ml-0.5 text-brand-500" />;
}

function Th({
  children,
  sortable,
  col,
  sortKey,
  sortDir,
  onSort,
  right,
  className,
}: {
  children: React.ReactNode;
  sortable?: SortKey;
  col?: SortKey;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSort?: (k: SortKey) => void;
  right?: boolean;
  className?: string;
}) {
  const inner = (
    <span className={cn('inline-flex items-center gap-0.5 whitespace-nowrap', right && 'justify-end w-full')}>
      {children}
      {sortable && col && sortKey && sortDir && (
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      )}
    </span>
  );
  return (
    <th
      className={cn(
        'border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600',
        sortable && 'cursor-pointer select-none hover:bg-slate-100',
        className,
      )}
      onClick={sortable && onSort ? () => onSort(sortable) : undefined}
    >
      {inner}
    </th>
  );
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  // ── view tab ──
  const [tab, setTab] = useState<'ALL' | InventoryItemType>('ALL');

  // ── filters ──
  const [qName, setQName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSku, setFilterSku] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // ── sort ──
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── pagination ──
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);

  // ── selection ──
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
    setPage(0);
  }

  // unique option sets for dropdowns
  const allUnits = useMemo(() => [...new Set(rows.map((r) => r.unit))].sort(), [rows]);
  const allTypes = useMemo(() => [...new Set(rows.map((r) => r.itemTypeLabel))].sort(), [rows]);
  const allSuppliers = useMemo(
    () => [...new Set(rows.map((r) => r.supplierName).filter(Boolean))].sort() as string[],
    [rows],
  );
  const allCategories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort() as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (tab !== 'ALL') r = r.filter((x) => x.itemType === tab);
    if (!showInactive) r = r.filter((x) => x.stock > 0 || x.reorderLevel >= 0); // all shown, inactive would be archived
    if (qName) r = r.filter((x) => x.name.toLowerCase().includes(qName.toLowerCase()));
    if (filterStatus) {
      r = r.filter((x) => {
        if (filterStatus === 'OUT') return x.stock <= 0;
        if (filterStatus === 'LOW') return x.stock > 0 && x.stock <= x.reorderLevel;
        if (filterStatus === 'OK') return x.stock > x.reorderLevel;
        return true;
      });
    }
    if (filterType) r = r.filter((x) => x.itemTypeLabel === filterType);
    if (filterUnit) r = r.filter((x) => x.unit === filterUnit);
    if (filterSupplier) r = r.filter((x) => x.supplierName === filterSupplier);
    if (filterCategory) r = r.filter((x) => x.category === filterCategory);
    if (filterSku) r = r.filter((x) => (x.sku ?? '').toLowerCase().includes(filterSku.toLowerCase()));

    // sort
    return [...r].sort((a, b) => {
      let va: string | number = 0;
      let vb: string | number = 0;
      if (sortKey === 'name') { va = a.name; vb = b.name; }
      else if (sortKey === 'stock') { va = a.stock; vb = b.stock; }
      else if (sortKey === 'reserved') { va = a.reserved; vb = b.reserved; }
      else if (sortKey === 'ordered') { va = a.ordered; vb = b.ordered; }
      else if (sortKey === 'unitCostKobo') { va = a.unitCostKobo; vb = b.unitCostKobo; }
      else if (sortKey === 'value') { va = a.stock * a.unitCostKobo; vb = b.stock * b.unitCostKobo; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? va - (vb as number) : (vb as number) - va;
    });
  }, [rows, tab, showInactive, qName, filterStatus, filterType, filterUnit, filterSupplier, filterCategory, filterSku, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // totals for footer
  const totalStock = filtered.reduce((s, r) => s + r.stock, 0);
  const totalReserved = filtered.reduce((s, r) => s + r.reserved, 0);
  const totalOrdered = filtered.reduce((s, r) => s + r.ordered, 0);
  const totalValue = filtered.reduce((s, r) => s + r.stock * r.unitCostKobo, 0);

  const tabCounts: Record<string, number> = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const r of rows) c[r.itemType] = (c[r.itemType] ?? 0) + 1;
    return c;
  }, [rows]);

  const allSelected = paginated.length > 0 && paginated.every((r) => selected.has(r.id));
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) paginated.forEach((r) => next.delete(r.id));
      else paginated.forEach((r) => next.add(r.id));
      return next;
    });
  }

  // filter-reset
  function clearFilters() {
    setQName(''); setFilterStatus(''); setFilterType(''); setFilterUnit('');
    setFilterSupplier(''); setFilterCategory(''); setFilterSku('');
    setPage(0);
  }
  const hasFilters = qName || filterStatus || filterType || filterUnit || filterSupplier || filterCategory || filterSku;

  const TABS: { value: 'ALL' | InventoryItemType; label: string }[] = [
    { value: 'ALL', label: 'All Items' },
    { value: 'RAW_MATERIAL', label: 'Raw Materials' },
    { value: 'FINISHED_GOOD', label: 'Products' },
    { value: 'PACKAGING', label: 'Packaging' },
    { value: 'CONSUMABLE', label: 'Consumables' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        {/* Breadcrumb / tabs */}
        <div className="flex items-center gap-1 text-sm font-semibold text-slate-500">
          <span className="text-slate-800">Stock levels:</span>
          {TABS.filter((t) => t.value !== 'ALL').map((t, i) => (
            <span key={t.value} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300">/</span>}
              <button
                type="button"
                onClick={() => { setTab(t.value); setPage(0); }}
                className={cn(
                  'px-1 transition',
                  tab === t.value ? 'text-brand-600 underline underline-offset-2' : 'hover:text-brand-500',
                )}
              >
                {t.label}
              </button>
            </span>
          ))}
        </div>
        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/materials/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Upload size={12} />
            IMPORTER
            <span className="rounded bg-brand-500 px-1 py-0.5 text-[9px] font-bold text-white leading-none">NEW</span>
          </Link>
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Settings2 size={12} />
            ADJUST
          </Link>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        {/* Left: export */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-medium">Export:</span>
          <button type="button" className="font-semibold text-brand-600 hover:underline">CSV</button>
          <button type="button" className="font-semibold text-brand-600 hover:underline">XLSX</button>
          <span className="mx-1 text-slate-300">|</span>
          <button type="button" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700">
            <FileDown size={13} />
            Scan code
          </button>
          {hasFilters && (
            <>
              <span className="text-slate-300">|</span>
              <button type="button" onClick={clearFilters} className="text-rose-600 hover:underline">Clear filters</button>
            </>
          )}
        </div>
        {/* Right: show inactive + page size + pagination */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <label className="flex cursor-pointer items-center gap-1.5 select-none">
            <span className="relative inline-block h-4 w-7 rounded-full transition bg-slate-200 has-[:checked]:bg-brand-500">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span className="absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow transition peer-checked:translate-x-3" />
            </span>
            Show inactive
          </label>
          <span className="text-slate-300">|</span>
          <label className="flex items-center gap-1">
            Records per page
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="ml-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs focus:outline-none"
            >
              {PAGE_SIZES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <span className="text-slate-500 tabular-nums">
            {filtered.length === 0 ? '0' : `${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, filtered.length)}`}
            {' '}of {filtered.length}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-xs">
          {/* ── Column headers ── */}
          <thead>
            <tr>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-brand-500"
                />
              </th>
              <Th sortable="name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="min-w-[180px]">Name</Th>
              <Th sortable="reserved" col="reserved" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right>Demand</Th>
              <Th sortable="stock" col="stock" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>In stock</Th>
              <Th sortable="ordered" col="ordered" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right>Ordered</Th>
              <Th sortable="unitCostKobo" col="unitCostKobo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right>Unit cost</Th>
              <Th sortable="value" col="value" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right>Stock value</Th>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Default supplier</th>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Unit</th>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Group</th>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Index / SKU</th>
              <th className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 text-right">Actions</th>
            </tr>

            {/* ── Per-column filter row ── */}
            <tr className="bg-white">
              {/* checkbox spacer */}
              <td className="border-b border-r border-slate-100 px-2.5 py-1" />
              {/* Name search */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1">
                <input
                  value={qName}
                  onChange={(e) => { setQName(e.target.value); setPage(0); }}
                  placeholder="Search…"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                />
              </td>
              {/* Demand - status filter */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1">
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Choose</option>
                  <option value="OK">In stock</option>
                  <option value="LOW">Low stock</option>
                  <option value="OUT">Out of stock</option>
                </select>
              </td>
              {/* In stock - status filter (same) */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1">
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Choose</option>
                  <option value="OK">In stock</option>
                  <option value="LOW">Low stock</option>
                  <option value="OUT">Out of stock</option>
                </select>
              </td>
              {/* Ordered spacer */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1" />
              {/* Unit cost spacer */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1" />
              {/* Stock value spacer */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1" />
              {/* Default supplier */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1">
                <select
                  value={filterSupplier}
                  onChange={(e) => { setFilterSupplier(e.target.value); setPage(0); }}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Choose</option>
                  {allSuppliers.map((s) => <option key={s}>{s}</option>)}
                </select>
              </td>
              {/* Unit */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1">
                <select
                  value={filterUnit}
                  onChange={(e) => { setFilterUnit(e.target.value); setPage(0); }}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Choose</option>
                  {allUnits.map((u) => <option key={u}>{u}</option>)}
                </select>
              </td>
              {/* Group / type */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1">
                <select
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Choose</option>
                  {allCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </td>
              {/* SKU search */}
              <td className="border-b border-r border-slate-100 px-1.5 py-1">
                <input
                  value={filterSku}
                  onChange={(e) => { setFilterSku(e.target.value); setPage(0); }}
                  placeholder="Search…"
                  className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:border-brand-400 focus:outline-none"
                />
              </td>
              {/* Actions spacer */}
              <td className="border-b border-slate-100 px-1.5 py-1" />
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-slate-100">
            {paginated.map((r) => {
              const value = r.stock * r.unitCostKobo;
              const isSelected = selected.has(r.id);
              return (
                <tr
                  key={`${r.itemType}-${r.id}`}
                  className={cn('transition-colors', isSelected ? 'bg-brand-50/40' : 'hover:bg-slate-50/60')}
                >
                  {/* checkbox */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (isSelected) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        })
                      }
                      className="h-3.5 w-3.5 accent-brand-500"
                    />
                  </td>
                  {/* Name */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle">
                    <Link
                      href={r.detailHref}
                      className="font-semibold text-brand-600 hover:underline underline-offset-2 leading-tight"
                    >
                      {r.name}
                    </Link>
                    {r.category && (
                      <div className="mt-0.5 text-[10px] text-slate-400">{r.category}</div>
                    )}
                  </td>
                  {/* Demand / reserved */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle text-right num text-slate-600">
                    {r.reserved.toLocaleString()}
                  </td>
                  {/* In stock — status indicator */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle">
                    <StockIndicator stock={r.stock} reorderLevel={r.reorderLevel} />
                  </td>
                  {/* Ordered */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle text-right num text-slate-600">
                    {r.ordered > 0 ? r.ordered.toLocaleString() : <span className="text-slate-300">—</span>}
                  </td>
                  {/* Unit cost */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle text-right">
                    {r.unitCostKobo > 0 ? (
                      <span className="num font-semibold text-brand-600">
                        {formatKobo(r.unitCostKobo)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {/* Stock value */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle text-right">
                    {value > 0 ? (
                      <span className="num font-semibold text-brand-600">
                        {formatKobo(value)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {/* Supplier */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle text-slate-600">
                    {r.supplierName ?? <span className="text-slate-300">—</span>}
                  </td>
                  {/* Unit */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle text-slate-600">
                    {r.unit}
                  </td>
                  {/* Group */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle text-slate-600">
                    {r.category ?? <span className="text-slate-300">—</span>}
                  </td>
                  {/* SKU */}
                  <td className="border-r border-slate-100 px-2.5 py-2 align-middle font-mono text-slate-600">
                    {r.sku ?? <span className="text-slate-300">—</span>}
                  </td>
                  {/* Actions */}
                  <td className="px-2.5 py-2 align-middle">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={r.detailHref}
                        className="flex h-6 w-6 items-center justify-center rounded text-orange-400 hover:bg-orange-50 hover:text-orange-600 transition"
                        title="Edit"
                      >
                        <Pencil size={12} />
                      </Link>
                      <Link
                        href={`${r.detailHref}/adjust`}
                        className="flex h-6 w-6 items-center justify-center rounded text-orange-400 hover:bg-orange-50 hover:text-orange-600 transition"
                        title="Adjust stock"
                      >
                        <SlidersHorizontal size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-sm text-slate-400">
                  No items match the current filters.
                </td>
              </tr>
            )}
          </tbody>

          {/* ── Totals footer ── */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-orange-500 text-white text-[11px] font-bold">
                <td className="px-2.5 py-2" />
                <td className="px-2.5 py-2">
                  {filtered.length} item{filtered.length !== 1 ? 's' : ''}
                </td>
                <td className="px-2.5 py-2 text-right num">{totalReserved.toLocaleString()}</td>
                <td className="px-2.5 py-2 num">{totalStock.toLocaleString()}</td>
                <td className="px-2.5 py-2 text-right num">{totalOrdered.toLocaleString()}</td>
                <td className="px-2.5 py-2 text-right num">—</td>
                <td className="px-2.5 py-2 text-right num">{formatKobo(totalValue)}</td>
                <td colSpan={5} className="px-2.5 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
