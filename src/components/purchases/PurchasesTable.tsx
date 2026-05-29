'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Truck,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PurchaseRow = {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  lineCount: number;
  totalKobo: number;
  amountPaidKobo: number;
  expectedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredCount: number;
  totalQtyCount: number;
  createdByName: string;
  notes: string | null;
};

type SupplierOpt = { id: string; name: string };

type SortKey =
  | 'supplierName'
  | 'poNumber'
  | 'expectedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'createdByName';

type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 30, 50];

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/** Extract YYYY-MM-DD from ISO string for date comparisons */
function isoDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

function daysLeft(expectedAt: string | null): number | null {
  if (!expectedAt) return null;
  return Math.floor((new Date(expectedAt).getTime() - Date.now()) / 86400000);
}

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (col !== sortKey)
    return <ChevronsUpDown size={10} className="ml-0.5 inline text-slate-400" />;
  return sortDir === 'asc' ? (
    <ChevronUp size={10} className="ml-0.5 inline text-slate-700" />
  ) : (
    <ChevronDown size={10} className="ml-0.5 inline text-slate-700" />
  );
}

const TH = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <th
    className={cn(
      'text-[11px] font-bold uppercase tracking-wide text-slate-600',
      'border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 whitespace-nowrap text-left',
      className,
    )}
  >
    {children}
  </th>
);

const TD = ({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) => (
  <td
    title={title}
    className={cn(
      'border-r border-slate-100 px-2.5 py-1.5 text-[12px] text-slate-700 whitespace-nowrap',
      className,
    )}
  >
    {children}
  </td>
);

const FilterInput = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder ?? 'Search…'}
    className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-300"
  />
);

const DateFilterInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => (
  <input
    type="date"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
  />
);

const FilterSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
  >
    <option value="">Choose</option>
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

export function PurchasesTable({
  rows,
  suppliers = [],
}: {
  rows: PurchaseRow[];
  suppliers?: SupplierOpt[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState('');
  const [qPo, setQPo] = useState('');
  const [qNotes, setQNotes] = useState('');
  const [filterExpected, setFilterExpected] = useState('');
  const [filterConfirmed, setFilterConfirmed] = useState('');
  const [filterCreatedAt, setFilterCreatedAt] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [filterUpdatedAt, setFilterUpdatedAt] = useState('');
  const [showReady, setShowReady] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Supplier options — prefer the passed list; fall back to unique from rows
  const supplierOpts: { value: string; label: string }[] = useMemo(() => {
    if (suppliers.length > 0) {
      return suppliers.map((s) => ({ value: s.name, label: s.name }));
    }
    return [...new Set(rows.map((r) => r.supplierName))]
      .sort()
      .map((n) => ({ value: n, label: n }));
  }, [suppliers, rows]);

  const uniqueCreatedBy = useMemo(
    () => [...new Set(rows.map((r) => r.createdByName))].sort(),
    [rows],
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let out = [...rows];
    if (filterSupplier) out = out.filter((r) => r.supplierName === filterSupplier);
    if (qPo)
      out = out.filter((r) => r.poNumber.toLowerCase().includes(qPo.toLowerCase()));
    if (qNotes)
      out = out.filter((r) =>
        (r.notes ?? '').toLowerCase().includes(qNotes.toLowerCase()),
      );
    if (filterExpected)
      out = out.filter((r) => isoDate(r.expectedAt) === filterExpected);
    if (filterCreatedAt)
      out = out.filter((r) => isoDate(r.createdAt) === filterCreatedAt);
    if (filterCreatedBy)
      out = out.filter((r) => r.createdByName === filterCreatedBy);
    if (filterUpdatedAt)
      out = out.filter((r) => isoDate(r.updatedAt) === filterUpdatedAt);
    if (showReady) out = out.filter((r) => r.status === 'RECEIVED');
    if (showOverdue)
      out = out.filter((r) => {
        const dl = daysLeft(r.expectedAt);
        return dl !== null && dl < 0;
      });

    out.sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      if (sortKey === 'supplierName') { av = a.supplierName; bv = b.supplierName; }
      else if (sortKey === 'poNumber') { av = a.poNumber; bv = b.poNumber; }
      else if (sortKey === 'expectedAt') { av = a.expectedAt ?? ''; bv = b.expectedAt ?? ''; }
      else if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
      else if (sortKey === 'updatedAt') { av = a.updatedAt; bv = b.updatedAt; }
      else if (sortKey === 'createdByName') { av = a.createdByName; bv = b.createdByName; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return out;
  }, [
    rows,
    filterSupplier,
    qPo,
    qNotes,
    filterExpected,
    filterConfirmed,
    filterCreatedAt,
    filterCreatedBy,
    filterUpdatedAt,
    showReady,
    showOverdue,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const xStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const xEnd = Math.min(safePage * pageSize, filtered.length);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowReady((v) => !v); setPage(1); }}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold transition',
              showReady
                ? 'bg-success-600 text-white'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300',
            )}
          >
            Show ready
          </button>
          <button
            onClick={() => { setShowOverdue((v) => !v); setPage(1); }}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold transition',
              showOverdue
                ? 'bg-rose-600 text-white'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300',
            )}
          >
            Show only overdue
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span>Records per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-slate-500">
            {xStart}–{xEnd} of {filtered.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1280px] border-collapse text-left">
          <thead>
            <tr>
              <TH className="w-12">{""}</TH>
              <TH>
                <button onClick={() => toggleSort('supplierName')} className="flex items-center gap-0.5">
                  Supplier <SortIcon col="supplierName" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>Supplier order no.</TH>
              <TH>Delivered / Ordered</TH>
              <TH>Days left</TH>
              <TH>
                <button onClick={() => toggleSort('expectedAt')} className="flex items-center gap-0.5">
                  Expected arrival <SortIcon col="expectedAt" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>Confirmed order date</TH>
              <TH>
                <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-0.5">
                  Date of creation <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>
                <button onClick={() => toggleSort('createdByName')} className="flex items-center gap-0.5">
                  Created by <SortIcon col="createdByName" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>
                <button onClick={() => toggleSort('updatedAt')} className="flex items-center gap-0.5">
                  Updated at <SortIcon col="updatedAt" sortKey={sortKey} sortDir={sortDir} />
                </button>
              </TH>
              <TH>Comments / Notes</TH>
              <TH className="border-r-0">Actions</TH>
            </tr>

            {/* Per-column filter row */}
            <tr className="bg-white">
              {/* Expand */}
              <td className="border-b border-r border-slate-100 px-2.5 py-1" />
              {/* Supplier */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <FilterSelect
                  value={filterSupplier}
                  onChange={(v) => { setFilterSupplier(v); setPage(1); }}
                  options={supplierOpts}
                />
              </td>
              {/* Supplier order no. */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <FilterInput value={qPo} onChange={(v) => { setQPo(v); setPage(1); }} placeholder="Search…" />
              </td>
              {/* Delivered/Ordered — no filter */}
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              {/* Days left — no filter */}
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              {/* Expected arrival — date picker */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <DateFilterInput
                  value={filterExpected}
                  onChange={(v) => { setFilterExpected(v); setPage(1); }}
                />
              </td>
              {/* Confirmed order date — date picker */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <DateFilterInput
                  value={filterConfirmed}
                  onChange={(v) => { setFilterConfirmed(v); setPage(1); }}
                />
              </td>
              {/* Date of creation — date picker */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <DateFilterInput
                  value={filterCreatedAt}
                  onChange={(v) => { setFilterCreatedAt(v); setPage(1); }}
                />
              </td>
              {/* Created by */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <FilterSelect
                  value={filterCreatedBy}
                  onChange={(v) => { setFilterCreatedBy(v); setPage(1); }}
                  options={uniqueCreatedBy.map((n) => ({ value: n, label: n }))}
                />
              </td>
              {/* Updated at — date picker */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <DateFilterInput
                  value={filterUpdatedAt}
                  onChange={(v) => { setFilterUpdatedAt(v); setPage(1); }}
                />
              </td>
              {/* Notes */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <FilterInput
                  value={qNotes}
                  onChange={(v) => { setQNotes(v); setPage(1); }}
                  placeholder="Search…"
                />
              </td>
              {/* Actions */}
              <td className="border-b border-slate-100 px-2 py-1" />
            </tr>
          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <TriangleAlert size={28} className="text-slate-300" />
                    <span className="text-sm font-medium">No data found</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.flatMap((row) => {
                const dl = daysLeft(row.expectedAt);
                const isOverdue = dl !== null && dl < 0;
                const isExp = expanded.has(row.id);

                const mainRow = (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Expand toggle */}
                    <TD className="text-center">
                      <div
                        onClick={() => toggleExpand(row.id)}
                        className="mx-auto flex h-5 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300"
                      >
                        <ChevronDown
                          size={10}
                          className={cn(
                            'text-slate-500 transition-transform',
                            isExp && 'rotate-180',
                          )}
                        />
                      </div>
                    </TD>

                    {/* Supplier — linked to PO detail */}
                    <TD>
                      <Link
                        href={`/purchase-orders/${row.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {row.supplierName}
                      </Link>
                      <span className="ml-1.5 text-[10px] text-slate-400">
                        {row.poNumber}
                      </span>
                    </TD>

                    {/* Supplier order no. */}
                    <TD>—</TD>

                    {/* Delivered / Ordered */}
                    <TD>{row.deliveredCount}/{row.totalQtyCount}</TD>

                    {/* Days left */}
                    <TD className={isOverdue ? 'font-semibold text-rose-600' : ''}>
                      {dl === null ? '—' : `${dl}d`}
                    </TD>

                    {/* Expected arrival */}
                    <TD>{fmt(row.expectedAt)}</TD>

                    {/* Confirmed order date */}
                    <TD>—</TD>

                    {/* Date of creation */}
                    <TD>{fmt(row.createdAt)}</TD>

                    {/* Created by */}
                    <TD>{row.createdByName}</TD>

                    {/* Updated at */}
                    <TD>{fmt(row.updatedAt)}</TD>

                    {/* Notes */}
                    <TD
                      className="max-w-[160px] truncate"
                      title={row.notes ?? undefined}
                    >
                      {row.notes
                        ? row.notes.length > 30
                          ? row.notes.slice(0, 30) + '…'
                          : row.notes
                        : '—'}
                    </TD>

                    {/* Actions */}
                    <TD className="border-r-0">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <Link
                          href={`/purchase-orders/${row.id}`}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-orange-50"
                          title="Edit"
                        >
                          <Pencil size={13} className="text-orange-400 hover:text-orange-600" />
                        </Link>
                        {/* Add inventory (receive) */}
                        <Link
                          href={`/purchase-orders/${row.id}?action=receive`}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-orange-50"
                          title="Add inventory"
                        >
                          <Truck size={13} className="text-orange-400 hover:text-orange-600" />
                        </Link>
                        {/* Delete */}
                        <button
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-rose-50"
                          title="Delete (not implemented)"
                        >
                          <Trash2 size={13} className="text-rose-400 hover:text-rose-600" />
                        </button>
                      </div>
                    </TD>
                  </tr>
                );

                const expandRow = isExp ? (
                  <tr key={`${row.id}-exp`} className="bg-slate-50/80">
                    <td
                      colSpan={12}
                      className="border-b border-slate-100 px-6 py-3 text-[12px] text-slate-600"
                    >
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="font-semibold text-slate-500">Status:</span>{' '}
                          {row.status}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500">Lines:</span>{' '}
                          {row.lineCount}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500">Received at:</span>{' '}
                          {fmt(row.receivedAt)}
                        </div>
                        <div className="col-span-3">
                          <span className="font-semibold text-slate-500">Full notes:</span>{' '}
                          {row.notes ?? '—'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null;

                return [mainRow, ...(expandRow ? [expandRow] : [])];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
