'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TaskRow = {
  id: string;
  taskNumber: string;
  title: string;
  status: string;
  priority: string;
  taskType: string;
  targetQty: number | null;
  completedQty: number | null;
  progress: number;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  productionOrderId: string | null;
  productionOrderNumber: string | null;
  productionOrderTitle: string | null;
  workerNames: string[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'STOP',
  IN_PROGRESS: 'START',
  ON_HOLD: 'PAUSE',
  DONE: 'DONE',
  CANCELLED: 'CANCEL',
};

const STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-rose-600 text-white',
  IN_PROGRESS: 'bg-emerald-600 text-white',
  ON_HOLD: 'bg-amber-500 text-white',
  DONE: 'bg-slate-500 text-white',
  CANCELLED: 'bg-slate-400 text-white',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  MIXING: 'Mixing',
  CUTTING: 'Cutting',
  SEWING: 'Sewing',
  ASSEMBLY: 'Assembly',
  WELDING: 'Welding',
  BAKING: 'Baking',
  PACKAGING: 'Packaging',
  LABELLING: 'Labelling',
  QC_INSPECTION: 'Quality control',
  LOADING: 'Loading',
  CLEANING: 'Cleaning',
  OTHER: 'Other',
};

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
}

function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtQty(v: number | null): string {
  if (v === null) return '0,00';
  return v.toFixed(2).replace('.', ',');
}

const PAGE_SIZES = [10, 20, 30, 50];

type SortKey = 'taskNumber' | 'title' | 'status' | 'plannedStartAt' | 'plannedEndAt';
type SortDir = 'asc' | 'desc';

// ── Sub-components ─────────────────────────────────────────────────────────────

const TH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={cn('border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap text-left', className)}>
    {children}
  </th>
);

const TD = ({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) => (
  <td title={title} className={cn('border-r border-slate-100 px-2.5 py-1.5 text-[11px] text-slate-700 whitespace-nowrap', className)}>
    {children}
  </td>
);

function SortBtn({ col, sortKey, sortDir, onClick, children }: {
  col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onClick: () => void; children: React.ReactNode;
}) {
  const Icon = col !== sortKey ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button onClick={onClick} className="flex items-center gap-0.5">
      {children}
      <Icon size={9} className={col !== sortKey ? 'text-slate-400' : 'text-slate-700'} />
    </button>
  );
}

// ── Main Table Component ───────────────────────────────────────────────────────

export function ManufacturingTasksTable({ rows }: { rows: TaskRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('plannedEndAt');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [showInactive, setShowInactive] = useState(false);
  const [hideReady, setHideReady] = useState(false);
  const [allChecked, setAllChecked] = useState(false);

  // Column filters
  const [filterStatus, setFilterStatus] = useState('');
  const [qTaskNum, setQTaskNum] = useState('');
  const [qIdProdio, setQIdProdio] = useState('');
  const [qExtOrder, setQExtOrder] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterWorker, setFilterWorker] = useState('');

  const uniqueStatuses = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);
  const uniqueProducts = useMemo(() => [...new Set(rows.map((r) => r.title))].sort(), [rows]);
  const uniqueOperations = useMemo(() => [...new Set(rows.map((r) => r.taskType))].sort(), [rows]);
  const uniqueWorkers = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.workerNames.forEach((w) => s.add(w)));
    return [...s].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let out = [...rows];
    if (!showInactive) out = out.filter((r) => r.status !== 'CANCELLED');
    if (hideReady) out = out.filter((r) => r.status !== 'DONE');
    if (filterStatus) out = out.filter((r) => r.status === filterStatus);
    if (qTaskNum) out = out.filter((r) => r.taskNumber.toLowerCase().includes(qTaskNum.toLowerCase()));
    if (qIdProdio) out = out.filter((r) => r.id.toLowerCase().includes(qIdProdio.toLowerCase()));
    if (qExtOrder) out = out.filter((r) => (r.productionOrderNumber ?? '').toLowerCase().includes(qExtOrder.toLowerCase()));
    if (filterProduct) out = out.filter((r) => r.title === filterProduct);
    if (filterOperation) out = out.filter((r) => r.taskType === filterOperation);
    if (filterWorker) out = out.filter((r) => r.workerNames.includes(filterWorker));

    out.sort((a, b) => {
      const av = sortKey === 'taskNumber' ? a.taskNumber
        : sortKey === 'title' ? a.title
        : sortKey === 'status' ? a.status
        : sortKey === 'plannedStartAt' ? (a.plannedStartAt ?? '')
        : (a.plannedEndAt ?? '');
      const bv = sortKey === 'taskNumber' ? b.taskNumber
        : sortKey === 'title' ? b.title
        : sortKey === 'status' ? b.status
        : sortKey === 'plannedStartAt' ? (b.plannedStartAt ?? '')
        : (b.plannedEndAt ?? '');
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, showInactive, hideReady, filterStatus, qTaskNum, qIdProdio, qExtOrder, filterProduct, filterOperation, filterWorker, sortKey, sortDir]);

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

  function Choose({ value, onChange, options, placeholder = 'Choose' }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
  }) {
    return (
      <select value={value} onChange={(e) => { onChange(e.target.value); setPage(1); }}
        className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-300">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <input value={value} onChange={(e) => { onChange(e.target.value); setPage(1); }}
        placeholder="Search"
        className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-300" />
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          {/* Left: toggles */}
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <span className="relative inline-flex h-4 w-8 items-center rounded-full border border-slate-300 bg-white transition">
                <input type="checkbox" className="sr-only" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                <span className={cn('absolute h-3 w-3 rounded-full transition-all', showInactive ? 'translate-x-4 bg-orange-500' : 'translate-x-0.5 bg-slate-300')} />
              </span>
              Show Inactive
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <span className="relative inline-flex h-4 w-8 items-center rounded-full border border-slate-300 bg-white transition">
                <input type="checkbox" className="sr-only" checked={hideReady} onChange={(e) => setHideReady(e.target.checked)} />
                <span className={cn('absolute h-3 w-3 rounded-full transition-all', hideReady ? 'translate-x-4 bg-orange-500' : 'translate-x-0.5 bg-slate-300')} />
              </span>
              Hide ready
            </label>
          </div>
          {/* Right: page size + pagination */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span>Records per page:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-slate-500">{xStart} – {xEnd} of {filtered.length}</span>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
              className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"><ChevronLeft size={13} /></button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30"><ChevronRight size={13} /></button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-[2400px] border-collapse text-left">
            <thead>
              {/* Header row */}
              <tr>
                <TH className="w-8">
                  <input type="checkbox" checked={allChecked} onChange={(e) => setAllChecked(e.target.checked)} className="accent-orange-500" />
                </TH>
                <TH>Status</TH>
                <TH>
                  <SortBtn col="taskNumber" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('taskNumber')}>
                    Task number
                  </SortBtn>
                </TH>
                <TH>Image</TH>
                <TH>ID Prodio</TH>
                <TH>External order ID</TH>
                <TH className="max-w-[140px]">The predecessor of the operation</TH>
                <TH>Client</TH>
                <TH>
                  <SortBtn col="title" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('title')}>
                    Product
                  </SortBtn>
                </TH>
                <TH>Product group</TH>
                <TH>Machine/Operation</TH>
                <TH>Shop floor view</TH>
                <TH>
                  <SortBtn col="plannedStartAt" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('plannedStartAt')}>
                    Planned start
                  </SortBtn>
                </TH>
                <TH>
                  <SortBtn col="plannedEndAt" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('plannedEndAt')}>
                    Planned stop
                  </SortBtn>
                </TH>
                <TH>Days left</TH>
                <TH>Products (done/all)</TH>
                <TH>Workers</TH>
                <TH>Work time</TH>
                <TH>Estimated time</TH>
                <TH className="max-w-[130px]">Work time/Estimated time</TH>
                <TH>Pause</TH>
                <th className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
              {/* Filter row */}
              <tr className="bg-white">
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <Choose value={filterStatus} onChange={setFilterStatus}
                    options={uniqueStatuses.map((s) => STATUS_LABEL[s] ?? s)} />
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <SearchBox value={qTaskNum} onChange={setQTaskNum} />
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <SearchBox value={qIdProdio} onChange={setQIdProdio} />
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <SearchBox value={qExtOrder} onChange={setQExtOrder} />
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <select className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] focus:outline-none"><option>Choose</option></select>
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <select className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] focus:outline-none"><option>Choose</option></select>
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <Choose value={filterProduct} onChange={setFilterProduct} options={uniqueProducts} />
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <select className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] focus:outline-none"><option>Choose</option></select>
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <Choose value={filterOperation} onChange={setFilterOperation}
                    options={uniqueOperations.map((t) => TASK_TYPE_LABELS[t] ?? t)} />
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <select className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] focus:outline-none"><option>Choose</option></select>
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1">
                  <Choose value={filterWorker} onChange={setFilterWorker} options={uniqueWorkers} />
                </td>
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-r border-slate-100 px-2 py-1" />
                <td className="border-b border-slate-100 px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={22} className="px-4 py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <TriangleAlert size={14} className="shrink-0 text-slate-400" />
                      <span className="text-[12px] font-medium">No data found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const days = daysLeft(row.plannedEndAt);
                  const done = row.completedQty ?? 0;
                  const all = row.targetQty ?? 0;
                  const pct = all > 0 ? Math.min(100, (done / all) * 100) : 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Checkbox */}
                      <TD className="text-center w-8">
                        <input type="checkbox" className="accent-orange-500" />
                      </TD>
                      {/* Status badge */}
                      <TD>
                        <span className={cn('rounded px-2 py-0.5 text-[10px] font-bold tracking-wide', STATUS_CLS[row.status] ?? 'bg-slate-200 text-slate-600')}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </TD>
                      {/* Task number */}
                      <TD>
                        <Link href={`/manufacturing-tasks/${row.id}`}
                          className="font-medium text-blue-600 hover:underline text-[11px]">
                          {row.taskNumber}
                        </Link>
                      </TD>
                      {/* Image placeholder */}
                      <TD>
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-slate-400">
                            <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </TD>
                      {/* ID Prodio */}
                      <TD>
                        <Link href={`/manufacturing-tasks/${row.id}`}
                          className="text-blue-600 hover:underline text-[11px]">
                          {row.id.slice(-8).toUpperCase()}
                        </Link>
                      </TD>
                      {/* External order ID */}
                      <TD>
                        {row.productionOrderId ? (
                          <Link href={`/production/${row.productionOrderId}`}
                            className="text-blue-600 hover:underline text-[11px]">
                            {row.productionOrderNumber ?? row.productionOrderId.slice(-8).toUpperCase()}
                          </Link>
                        ) : '—'}
                      </TD>
                      {/* Predecessor */}
                      <TD>—</TD>
                      {/* Client */}
                      <TD>—</TD>
                      {/* Product */}
                      <TD className="max-w-[160px] truncate" title={row.title}>{row.title}</TD>
                      {/* Product group */}
                      <TD>Standard</TD>
                      {/* Machine/Operation */}
                      <TD>{TASK_TYPE_LABELS[row.taskType] ?? row.taskType}</TD>
                      {/* Shop floor view */}
                      <TD>Default shop floor view</TD>
                      {/* Planned start */}
                      <TD className="text-[10px]">{fmtDt(row.plannedStartAt)}</TD>
                      {/* Planned stop */}
                      <TD className="text-[10px]">{fmtDt(row.plannedEndAt)}</TD>
                      {/* Days left */}
                      <TD>
                        {days === null ? '—' : (
                          <span className={cn('font-semibold text-[11px]', days < 0 ? 'text-rose-600' : days <= 2 ? 'text-amber-600' : 'text-slate-700')}>
                            {days}
                          </span>
                        )}
                      </TD>
                      {/* Products done/all */}
                      <TD className="min-w-[140px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200">
                              <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-orange-400')}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {fmtQty(row.completedQty)}/{fmtQty(row.targetQty)}
                            </span>
                          </div>
                        </div>
                      </TD>
                      {/* Workers */}
                      <TD className="max-w-[120px] truncate" title={row.workerNames.join(', ')}>
                        {row.workerNames.length > 0 ? row.workerNames.join(', ') : '—'}
                      </TD>
                      {/* Work time */}
                      <TD className="text-[10px] font-mono">00:00:00</TD>
                      {/* Estimated time */}
                      <TD className="text-[10px] font-mono">
                        {row.plannedStartAt && row.plannedEndAt
                          ? (() => {
                              const diff = new Date(row.plannedEndAt).getTime() - new Date(row.plannedStartAt).getTime();
                              const h = Math.floor(diff / 3600000);
                              const m = Math.floor((diff % 3600000) / 60000);
                              return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
                            })()
                          : '00:00:00'}
                      </TD>
                      {/* Work/Estimated */}
                      <TD className="text-[10px] font-mono">00:00:00/
                        {row.plannedStartAt && row.plannedEndAt
                          ? (() => {
                              const diff = new Date(row.plannedEndAt).getTime() - new Date(row.plannedStartAt).getTime();
                              const h = Math.floor(diff / 3600000);
                              const m = Math.floor((diff % 3600000) / 60000);
                              return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
                            })()
                          : '00:00:00'}
                      </TD>
                      {/* Pause */}
                      <TD className="text-[10px] font-mono">00:00:00</TD>
                      {/* Actions */}
                      <td className="px-2.5 py-1.5 text-[11px]">
                        <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100">
                          <MoreHorizontal size={14} className="text-orange-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
}
