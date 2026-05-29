'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check,
  X,
  ImageOff,
  Flame,
  Copy,
  Pencil,
  Trash2,
  Info,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKobo } from '@/lib/format';

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
  // new optional fields:
  safetyStock?: number | null;
  minimumPurchaseQuantity?: number | null;
  storageLocation?: string | null;
  notes?: string | null;
  materialType?: string | null;
  createdAt?: string | null;
};

type SortKey = 'name' | 'stock' | 'reorderLevel' | 'unitCostKobo' | 'createdAt';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="ml-0.5 inline text-slate-400" />;
  if (sortDir === 'asc') return <ChevronUp size={11} className="ml-0.5 inline text-slate-700" />;
  return <ChevronDown size={11} className="ml-0.5 inline text-slate-700" />;
}

function truncate(str: string | null | undefined, n: number): string {
  if (!str) return '—';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function fmtCreatedAt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const INPUT_CLS =
  'w-full rounded border border-slate-200 bg-white text-[11px] px-2 py-0.5 focus:outline-none focus:border-slate-400 placeholder-slate-400';
const SELECT_CLS =
  'rounded border border-slate-200 bg-white text-[11px] px-1.5 py-0.5 focus:outline-none focus:border-slate-400 w-full';
const TH_CLS =
  'text-[11px] font-bold uppercase tracking-wide text-slate-600 border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 whitespace-nowrap';
const TD_CLS = 'px-2.5 py-1.5 border-r border-slate-100 text-[12px] text-slate-700 align-middle whitespace-nowrap';

export function MaterialsTable({ rows }: { rows: MaterialRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCreatedAt, setFilterCreatedAt] = useState('');
  const [qName, setQName] = useState('');
  const [qSku, setQSku] = useState('');
  const [qNotes, setQNotes] = useState('');
  const [qLocation, setQLocation] = useState('');
  const [qMinDelivery, setQMinDelivery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Derived option lists
  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.category) s.add(r.category);
    return Array.from(s).sort();
  }, [rows]);

  const suppliers = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.supplierName) s.add(r.supplierName);
    return Array.from(s).sort();
  }, [rows]);

  const units = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(r.unit);
    return Array.from(s).sort();
  }, [rows]);

  const hasFilters =
    !!filterCategory || !!filterSupplier || !!filterUnit || !!filterStatus ||
    !!filterCreatedAt || !!qName || !!qSku || !!qNotes || !!qLocation || !!qMinDelivery;

  function clearFilters() {
    setFilterCategory('');
    setFilterSupplier('');
    setFilterUnit('');
    setFilterStatus('');
    setFilterCreatedAt('');
    setQName('');
    setQSku('');
    setQNotes('');
    setQLocation('');
    setQMinDelivery('');
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  }

  const filtered = useMemo(() => {
    let out = rows.filter((r) => {
      if (!showInactive && r.status === 'DISCONTINUED') return false;
      if (qName && !r.name.toLowerCase().includes(qName.toLowerCase())) return false;
      if (qSku && !(r.sku ?? '').toLowerCase().includes(qSku.toLowerCase())) return false;
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterSupplier && r.supplierName !== filterSupplier) return false;
      if (filterUnit && r.unit !== filterUnit) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (qNotes && !(r.notes ?? '').toLowerCase().includes(qNotes.toLowerCase())) return false;
      if (qLocation && !(r.storageLocation ?? '').toLowerCase().includes(qLocation.toLowerCase())) return false;
      if (qMinDelivery) {
        const val = String(r.minimumPurchaseQuantity ?? '');
        if (!val.includes(qMinDelivery)) return false;
      }
      if (filterCreatedAt && (r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '') !== filterCreatedAt) return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      let av: string | number = 0;
      let bv: string | number = 0;
      if (sortKey === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (sortKey === 'stock') { av = a.stock; bv = b.stock; }
      else if (sortKey === 'reorderLevel') { av = a.reorderLevel; bv = b.reorderLevel; }
      else if (sortKey === 'unitCostKobo') { av = a.unitCostKobo; bv = b.unitCostKobo; }
      else if (sortKey === 'createdAt') {
        av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, qName, qSku, filterCategory, filterSupplier, filterUnit, filterStatus, qNotes,
    qLocation, qMinDelivery, filterCreatedAt, showInactive, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safeePage * pageSize, safeePage * pageSize + pageSize);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalStock = filtered.reduce((acc, r) => acc + r.stock, 0);
  const totalValue = filtered.reduce((acc, r) => acc + r.stock * r.unitCostKobo, 0);

  const fromIdx = filtered.length === 0 ? 0 : safeePage * pageSize + 1;
  const toIdx = Math.min(safeePage * pageSize + pageSize, filtered.length);

  // Export CSV
  function exportCsv() {
    const header = ['Name', 'SKU', 'Category', 'Unit', 'Stock', 'Reorder Level', 'Unit Cost (₦)', 'Status', 'Supplier', 'Location', 'Notes', 'Created At'];
    const csvRows = filtered.map((r) => [
      r.name,
      r.sku ?? '',
      r.category ?? '',
      r.unit,
      r.stock,
      r.reorderLevel,
      (r.unitCostKobo / 100).toFixed(2),
      r.status,
      r.supplierName ?? '',
      r.storageLocation ?? '',
      r.notes ?? '',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-NG') : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raw-materials.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        {/* Left */}
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-semibold text-slate-600">Export:</span>
          <button
            onClick={exportCsv}
            className="font-semibold text-brand-600 hover:underline"
          >
            CSV
          </button>
          <button
            className="font-semibold text-brand-600 hover:underline"
            disabled
          >
            XLSX
          </button>
          <span className="text-slate-300">|</span>
          <button className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-800">
            <FileDown size={13} />
            <span>Scan the code</span>
          </button>
          {hasFilters && (
            <>
              <span className="text-slate-300">|</span>
              <button
                onClick={clearFilters}
                className="font-semibold text-rose-500 hover:underline"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
        {/* Right */}
        <div className="flex items-center gap-2 text-[12px]">
          {/* Show inactive toggle */}
          <label className="flex cursor-pointer items-center gap-1.5">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={showInactive}
                onChange={(e) => { setShowInactive(e.target.checked); setPage(0); }}
              />
              <div className={cn(
                'h-4 w-7 rounded-full transition-colors',
                showInactive ? 'bg-orange-500' : 'bg-slate-200'
              )} />
              <div className={cn(
                'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform',
                showInactive ? 'translate-x-3.5' : 'translate-x-0.5'
              )} />
            </div>
            <span className="text-slate-600">Show inactive</span>
          </label>
          <span className="text-slate-300">|</span>
          <span className="text-slate-600">Records per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="rounded border border-slate-200 bg-white text-[11px] px-1.5 py-0.5 focus:outline-none"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="tabular-nums text-slate-600">
            {fromIdx}–{toIdx} of {filtered.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safeePage === 0}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safeePage >= totalPages - 1}
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1600px] w-full border-collapse text-left">
          <thead>
            {/* Header row */}
            <tr>
              {/* Checkbox */}
              <th className={cn(TH_CLS, 'w-8 text-center')}>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  className="h-3 w-3 rounded border-slate-300 accent-orange-500"
                />
              </th>
              {/* Image */}
              <th className={cn(TH_CLS, 'w-12')}>IMG</th>
              {/* Active */}
              <th className={cn(TH_CLS, 'w-12')}>Active</th>
              {/* Name */}
              <th
                className={cn(TH_CLS, 'cursor-pointer select-none')}
                onClick={() => handleSort('name')}
              >
                Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
              </th>
              {/* Category */}
              <th className={TH_CLS}>Group of raw materials</th>
              {/* Unit */}
              <th className={TH_CLS}>Unit</th>
              {/* Price */}
              <th
                className={cn(TH_CLS, 'cursor-pointer select-none')}
                onClick={() => handleSort('unitCostKobo')}
              >
                Price <SortIcon col="unitCostKobo" sortKey={sortKey} sortDir={sortDir} />
              </th>
              {/* Currency */}
              <th className={TH_CLS}>Currency</th>
              {/* Tax rate */}
              <th className={TH_CLS}>Tax rate</th>
              {/* Location */}
              <th className={TH_CLS}>Location</th>
              {/* Index/SKU */}
              <th className={TH_CLS}>Index</th>
              {/* Additional name */}
              <th className={TH_CLS}>Additional name</th>
              {/* Description */}
              <th className={TH_CLS}>Description</th>
              {/* EAN */}
              <th className={TH_CLS}>EAN</th>
              {/* Comments */}
              <th className={TH_CLS}>Comments</th>
              {/* Supplier */}
              <th className={TH_CLS}>Default supplier</th>
              {/* Default inventory */}
              <th className={TH_CLS}>Default inventory</th>
              {/* Min delivery qty */}
              <th className={TH_CLS}>Min delivery qty</th>
              {/* Optimal stock */}
              <th
                className={cn(TH_CLS, 'cursor-pointer select-none')}
                onClick={() => handleSort('reorderLevel')}
              >
                Optimal stock level <SortIcon col="reorderLevel" sortKey={sortKey} sortDir={sortDir} />
              </th>
              {/* Low stock level */}
              <th
                className={cn(TH_CLS, 'cursor-pointer select-none')}
                onClick={() => handleSort('reorderLevel')}
              >
                Low stock level <SortIcon col="reorderLevel" sortKey={sortKey} sortDir={sortDir} />
              </th>
              {/* Date of creation */}
              <th
                className={cn(TH_CLS, 'cursor-pointer select-none')}
                onClick={() => handleSort('createdAt')}
              >
                Date of creation <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} />
              </th>
              {/* Actions */}
              <th className={cn(TH_CLS, 'border-r-0')}>Actions</th>
            </tr>

            {/* Filter row */}
            <tr className="bg-white">
              {/* Checkbox filter cell */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Image filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Active filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}
                  className={SELECT_CLS}
                >
                  <option value="">Choose</option>
                  <option value="ACTIVE">Active</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                  <option value="DISCONTINUED">Discontinued</option>
                </select>
              </td>
              {/* Name filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <div className="relative flex items-center">
                  <Search size={9} className="pointer-events-none absolute left-1.5 text-slate-400" />
                  <input
                    value={qName}
                    onChange={(e) => { setQName(e.target.value); setPage(0); }}
                    placeholder="Search"
                    className={cn(INPUT_CLS, 'pl-5')}
                  />
                </div>
              </td>
              {/* Category filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <div className="flex items-center gap-0.5">
                  <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); setPage(0); }}
                    className={cn(SELECT_CLS, 'flex-1')}
                  >
                    <option value="">Choose</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Info size={10} className="shrink-0 cursor-pointer text-orange-400 ml-0.5" />
                </div>
              </td>
              {/* Unit filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <select
                  value={filterUnit}
                  onChange={(e) => { setFilterUnit(e.target.value); setPage(0); }}
                  className={SELECT_CLS}
                >
                  <option value="">Choose</option>
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </td>
              {/* Price filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <input placeholder="Search" className={INPUT_CLS} disabled />
              </td>
              {/* Currency */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Tax rate */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Location filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <div className="relative flex items-center">
                  <Search size={9} className="pointer-events-none absolute left-1.5 text-slate-400" />
                  <input
                    value={qLocation}
                    onChange={(e) => { setQLocation(e.target.value); setPage(0); }}
                    placeholder="Search"
                    className={cn(INPUT_CLS, 'pl-5')}
                  />
                </div>
              </td>
              {/* SKU filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <div className="relative flex items-center">
                  <Search size={9} className="pointer-events-none absolute left-1.5 text-slate-400" />
                  <input
                    value={qSku}
                    onChange={(e) => { setQSku(e.target.value); setPage(0); }}
                    placeholder="Search"
                    className={cn(INPUT_CLS, 'pl-5')}
                  />
                </div>
              </td>
              {/* Additional name */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Description/notes filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <div className="relative flex items-center">
                  <Search size={9} className="pointer-events-none absolute left-1.5 text-slate-400" />
                  <input
                    value={qNotes}
                    onChange={(e) => { setQNotes(e.target.value); setPage(0); }}
                    placeholder="Search"
                    className={cn(INPUT_CLS, 'pl-5')}
                  />
                </div>
              </td>
              {/* EAN */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Comments */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Supplier filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <div className="flex items-center gap-0.5">
                  <select
                    value={filterSupplier}
                    onChange={(e) => { setFilterSupplier(e.target.value); setPage(0); }}
                    className={cn(SELECT_CLS, 'flex-1')}
                  >
                    <option value="">Choose</option>
                    {suppliers.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <Info size={10} className="shrink-0 cursor-pointer text-orange-400 ml-0.5" />
                </div>
              </td>
              {/* Default inventory */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Min delivery qty filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <input
                  value={qMinDelivery}
                  onChange={(e) => { setQMinDelivery(e.target.value); setPage(0); }}
                  placeholder="Search"
                  className={INPUT_CLS}
                />
              </td>
              {/* Optimal stock */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Low stock */}
              <td className="border-b border-r border-slate-200 px-2 py-1" />
              {/* Date of creation filter */}
              <td className="border-b border-r border-slate-200 px-2 py-1">
                <input
                  type="date"
                  value={filterCreatedAt}
                  onChange={(e) => { setFilterCreatedAt(e.target.value); setPage(0); }}
                  className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
              </td>
              {/* Actions */}
              <td className="border-b border-slate-200 px-2 py-1" />
            </tr>
          </thead>

          <tbody>
            {pageRows.map((r) => {
              const isActive = ['ACTIVE', 'LOW_STOCK'].includes(r.status);
              const isSelected = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    'hover:bg-slate-50/60 transition-colors',
                    isSelected && 'bg-orange-50/40'
                  )}
                >
                  {/* Checkbox */}
                  <td className={cn(TD_CLS, 'text-center w-8')}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(r.id)}
                      className="h-3 w-3 rounded border-slate-300 accent-orange-500"
                    />
                  </td>

                  {/* Image */}
                  <td className={cn(TD_CLS, 'w-12')}>
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100">
                      <ImageOff size={13} className="text-slate-400" />
                    </div>
                  </td>

                  {/* Active */}
                  <td className={cn(TD_CLS, 'w-12')}>
                    {isActive
                      ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-500">
                          <Check size={12} className="text-white" strokeWidth={3} />
                        </span>
                      )
                      : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200">
                          <X size={12} className="text-slate-500" strokeWidth={2.5} />
                        </span>
                      )}
                  </td>

                  {/* Name */}
                  <td className={cn(TD_CLS, 'min-w-[160px]')}>
                    <Link
                      href={`/materials/${r.id}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>

                  {/* Category */}
                  <td className={TD_CLS}>{r.category ?? '—'}</td>

                  {/* Unit */}
                  <td className={TD_CLS}>{r.unit}</td>

                  {/* Price */}
                  <td className={cn(TD_CLS, 'tabular-nums')}>
                    {formatKobo(r.unitCostKobo)}
                  </td>

                  {/* Currency */}
                  <td className={TD_CLS}>NGN</td>

                  {/* Tax rate */}
                  <td className={TD_CLS}>—</td>

                  {/* Location */}
                  <td className={TD_CLS}>{r.storageLocation ?? '—'}</td>

                  {/* Index / SKU */}
                  <td className={cn(TD_CLS, 'font-mono text-[11px]')}>{r.sku ?? '—'}</td>

                  {/* Additional name */}
                  <td className={TD_CLS}>—</td>

                  {/* Description (notes truncated 30) */}
                  <td className={cn(TD_CLS, 'max-w-[160px]')}>
                    <span title={r.notes ?? undefined}>{truncate(r.notes, 30)}</span>
                  </td>

                  {/* EAN */}
                  <td className={TD_CLS}>—</td>

                  {/* Comments (notes truncated 20) */}
                  <td className={cn(TD_CLS, 'max-w-[120px]')}>
                    <span title={r.notes ?? undefined}>{truncate(r.notes, 20)}</span>
                  </td>

                  {/* Default supplier */}
                  <td className={TD_CLS}>{r.supplierName ?? '—'}</td>

                  {/* Default inventory */}
                  <td className={TD_CLS}>—</td>

                  {/* Min delivery qty */}
                  <td className={cn(TD_CLS, 'tabular-nums')}>
                    {r.minimumPurchaseQuantity != null ? r.minimumPurchaseQuantity : '—'}
                  </td>

                  {/* Optimal stock level (reorderLevel) */}
                  <td className={cn(TD_CLS, 'tabular-nums')}>{r.reorderLevel}</td>

                  {/* Low stock level (safetyStock ?? reorderLevel) */}
                  <td className={cn(TD_CLS, 'tabular-nums')}>
                    {r.safetyStock != null ? r.safetyStock : r.reorderLevel}
                  </td>

                  {/* Date of creation */}
                  <td className={TD_CLS}>{fmtCreatedAt(r.createdAt)}</td>

                  {/* Actions */}
                  <td className={cn(TD_CLS, 'border-r-0')}>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Highlight"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-orange-500 hover:bg-orange-50"
                      >
                        <Flame size={13} />
                      </button>
                      <Link
                        href="/materials/new"
                        aria-label="Duplicate"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-orange-500 hover:bg-orange-50"
                      >
                        <Copy size={13} />
                      </Link>
                      <Link
                        href={`/materials/${r.id}/edit`}
                        aria-label="Edit"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-orange-500 hover:bg-orange-50"
                      >
                        <Pencil size={13} />
                      </Link>
                      <button
                        type="button"
                        aria-label="Delete"
                        className="inline-flex h-6 w-6 cursor-default items-center justify-center rounded text-rose-400 hover:bg-rose-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={22}
                  className="px-4 py-10 text-center text-sm text-slate-400"
                >
                  No materials match these filters.
                </td>
              </tr>
            )}
          </tbody>

          {/* Summary / footer row */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-orange-500 text-white">
                <td colSpan={6} className="px-2.5 py-1.5 text-[11px] font-bold">
                  {filtered.length} material{filtered.length !== 1 ? 's' : ''}
                </td>
                <td className="px-2.5 py-1.5 text-[11px] font-bold tabular-nums">
                  {formatKobo(totalValue)}
                </td>
                <td colSpan={9} className="px-2.5 py-1.5 text-[11px] font-bold">
                  Total stock: {totalStock.toLocaleString()}
                </td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
