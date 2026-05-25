'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  TriangleAlert,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdjustmentRow = {
  id: string;
  itemName: string;
  itemHref: string;
  adjustNumber: string;
  date: string;
  identification: string;
  reason: string;
  comments: string | null;
  createdAt: string;
  createdByName: string;
  updatedAt: string;
  updatedByName: string;
};

type SortKey = 'itemName' | 'adjustNumber' | 'date' | 'createdAt' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 20, 30, 50];

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey)
    return <ChevronsUpDown size={10} className="ml-0.5 inline text-slate-400" />;
  return sortDir === 'asc' ? (
    <ChevronUp size={10} className="ml-0.5 inline text-slate-700" />
  ) : (
    <ChevronDown size={10} className="ml-0.5 inline text-slate-700" />
  );
}

const TH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={cn('border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap text-left', className)}>
    {children}
  </th>
);

const TD = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn('border-r border-slate-100 px-2.5 py-1.5 text-[12px] text-slate-700 whitespace-nowrap', className)}>
    {children}
  </td>
);

const SearchInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search" className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-300" />
);

const ChooseSelect = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-300">
    <option value="">Choose</option>
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

export function StocktakingTable({ rows }: { rows: AdjustmentRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [filterInventory, setFilterInventory] = useState('');
  const [qAdjNumber, setQAdjNumber] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [qIdent, setQIdent] = useState('');
  const [qReason, setQReason] = useState('');
  const [qComments, setQComments] = useState('');
  const [filterCreatedAt, setFilterCreatedAt] = useState('');
  const [filterUpdatedAt, setFilterUpdatedAt] = useState('');

  const uniqueInventories = useMemo(() => [...new Set(rows.map((r) => r.itemName))].sort(), [rows]);
  const uniqueDates = useMemo(() => [...new Set(rows.map((r) => fmt(r.date).slice(0, 10)))].sort(), [rows]);
  const uniqueCreatedDates = useMemo(() => [...new Set(rows.map((r) => fmt(r.createdAt).slice(0, 10)))].sort(), [rows]);
  const uniqueUpdatedDates = useMemo(() => [...new Set(rows.map((r) => fmt(r.updatedAt).slice(0, 10)))].sort(), [rows]);
  const uniqueCreatedBy = useMemo(() => [...new Set(rows.map((r) => r.createdByName))].sort(), [rows]);

  const filtered = useMemo(() => {
    let out = [...rows];
    if (filterInventory) out = out.filter((r) => r.itemName === filterInventory);
    if (qAdjNumber) out = out.filter((r) => r.adjustNumber.toLowerCase().includes(qAdjNumber.toLowerCase()));
    if (filterDate) out = out.filter((r) => fmt(r.date).slice(0, 10) === filterDate);
    if (qIdent) out = out.filter((r) => r.identification.toLowerCase().includes(qIdent.toLowerCase()));
    if (qReason) out = out.filter((r) => r.reason.toLowerCase().includes(qReason.toLowerCase()));
    if (qComments) out = out.filter((r) => (r.comments ?? '').toLowerCase().includes(qComments.toLowerCase()));
    if (filterCreatedAt) out = out.filter((r) => fmt(r.createdAt).slice(0, 10) === filterCreatedAt);
    if (filterUpdatedAt) out = out.filter((r) => fmt(r.updatedAt).slice(0, 10) === filterUpdatedAt);
    out.sort((a, b) => {
      const av = sortKey === 'itemName' ? a.itemName : sortKey === 'adjustNumber' ? a.adjustNumber : sortKey === 'date' ? a.date : sortKey === 'createdAt' ? a.createdAt : a.updatedAt;
      const bv = sortKey === 'itemName' ? b.itemName : sortKey === 'adjustNumber' ? b.adjustNumber : sortKey === 'date' ? b.date : sortKey === 'createdAt' ? b.createdAt : b.updatedAt;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, filterInventory, qAdjNumber, filterDate, qIdent, qReason, qComments, filterCreatedAt, filterUpdatedAt, sortKey, sortDir]);

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
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
        <span>Records per page:</span>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none">
          {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-slate-500">{xStart} – {xEnd} of {filtered.length}</span>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"><ChevronLeft size={13} /></button>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"><ChevronRight size={13} /></button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-[1400px] border-collapse text-left">
          <thead>
            <tr>
              <TH className="w-14">Expand</TH>
              <TH><button onClick={() => toggleSort('itemName')} className="flex items-center gap-0.5">Inventory <SortIcon col="itemName" sortKey={sortKey} sortDir={sortDir} /></button></TH>
              <TH><button onClick={() => toggleSort('adjustNumber')} className="flex items-center gap-0.5">Stocktaking/adjustments number <SortIcon col="adjustNumber" sortKey={sortKey} sortDir={sortDir} /></button></TH>
              <TH><button onClick={() => toggleSort('date')} className="flex items-center gap-0.5">Date <SortIcon col="date" sortKey={sortKey} sortDir={sortDir} /></button></TH>
              <TH>Identification</TH>
              <TH>Reason</TH>
              <TH>Comments</TH>
              <TH><button onClick={() => toggleSort('createdAt')} className="flex items-center gap-0.5">Date of creation <SortIcon col="createdAt" sortKey={sortKey} sortDir={sortDir} /></button></TH>
              <TH>Created by</TH>
              <TH><button onClick={() => toggleSort('updatedAt')} className="flex items-center gap-0.5">Updated at <SortIcon col="updatedAt" sortKey={sortKey} sortDir={sortDir} /></button></TH>
              <TH>Updated by</TH>
              <th className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">Actions</th>
            </tr>
            <tr className="bg-white">
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              <td className="border-b border-r border-slate-100 px-2 py-1"><ChooseSelect value={filterInventory} onChange={(v) => { setFilterInventory(v); setPage(1); }} options={uniqueInventories} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><SearchInput value={qAdjNumber} onChange={(v) => { setQAdjNumber(v); setPage(1); }} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><ChooseSelect value={filterDate} onChange={(v) => { setFilterDate(v); setPage(1); }} options={uniqueDates} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><SearchInput value={qIdent} onChange={(v) => { setQIdent(v); setPage(1); }} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><SearchInput value={qReason} onChange={(v) => { setQReason(v); setPage(1); }} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><SearchInput value={qComments} onChange={(v) => { setQComments(v); setPage(1); }} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><ChooseSelect value={filterCreatedAt} onChange={(v) => { setFilterCreatedAt(v); setPage(1); }} options={uniqueCreatedDates} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><div className="flex items-center gap-1"><ChooseSelect value="" onChange={() => {}} options={uniqueCreatedBy} /><Info size={10} className="shrink-0 text-orange-400" /></div></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><ChooseSelect value={filterUpdatedAt} onChange={(v) => { setFilterUpdatedAt(v); setPage(1); }} options={uniqueUpdatedDates} /></td>
              <td className="border-b border-r border-slate-100 px-2 py-1"><div className="flex items-center gap-1"><ChooseSelect value="" onChange={() => {}} options={uniqueCreatedBy} /><Info size={10} className="shrink-0 text-orange-400" /></div></td>
              <td className="border-b border-slate-100 px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <TriangleAlert size={14} className="shrink-0 text-slate-400" />
                    <span className="text-[12px] font-medium">No data found</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.flatMap((row) => {
                const isExp = expanded.has(row.id);
                const main = (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <TD className="text-center">
                      <div onClick={() => toggleExpand(row.id)} className="mx-auto flex h-5 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300">
                        <ChevronDown size={10} className={cn('text-slate-500 transition-transform', isExp && 'rotate-180')} />
                      </div>
                    </TD>
                    <TD><Link href={row.itemHref} className="font-medium text-blue-600 hover:underline">{row.itemName}</Link></TD>
                    <TD>{row.adjustNumber}</TD>
                    <TD>{fmt(row.date)}</TD>
                    <TD>{row.identification}</TD>
                    <TD>{row.reason}</TD>
                    <TD>{row.comments ?? '—'}</TD>
                    <TD>{fmt(row.createdAt)}</TD>
                    <TD>{row.createdByName}</TD>
                    <TD>{fmt(row.updatedAt)}</TD>
                    <TD>{row.updatedByName}</TD>
                    <td className="px-2.5 py-1.5 text-[12px]">
                      <div className="flex items-center gap-1">
                        <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-orange-50"><Pencil size={13} className="text-orange-400" /></button>
                        <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-rose-50"><Trash2 size={13} className="text-rose-400" /></button>
                      </div>
                    </td>
                  </tr>
                );
                const exp = isExp ? (
                  <tr key={`${row.id}-exp`} className="bg-slate-50/80">
                    <td colSpan={12} className="border-b border-slate-100 px-6 py-3 text-[12px] text-slate-600">
                      <span className="font-semibold text-slate-500">Notes:</span> {row.comments ?? '—'}
                    </td>
                  </tr>
                ) : null;
                return [main, ...(exp ? [exp] : [])];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
