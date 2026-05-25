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
  Pencil,
  Trash2,
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
  notes: string | null;
  createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING:     'PENDING',
  IN_PROGRESS: 'IN PROGRESS',
  ON_HOLD:     'ON HOLD',
  DONE:        'DONE',
  CANCELLED:   'CANCELLED',
};

const STATUS_CLS: Record<string, string> = {
  PENDING:     'bg-rose-600 text-white',
  IN_PROGRESS: 'bg-emerald-600 text-white',
  ON_HOLD:     'bg-amber-500 text-white',
  DONE:        'bg-slate-500 text-white',
  CANCELLED:   'bg-slate-300 text-slate-700',
};

const PRIORITY_CLS: Record<string, string> = {
  LOW:    'bg-slate-100 text-slate-600',
  NORMAL: 'bg-blue-100 text-blue-700',
  HIGH:   'bg-amber-100 text-amber-700',
  URGENT: 'bg-rose-100 text-rose-700',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  MIXING:       'Mixing',
  CUTTING:      'Cutting',
  SEWING:       'Sewing',
  ASSEMBLY:     'Assembly',
  WELDING:      'Welding',
  BAKING:       'Baking',
  PACKAGING:    'Packaging',
  LABELLING:    'Labelling',
  QC_INSPECTION:'Quality control',
  LOADING:      'Loading',
  CLEANING:     'Cleaning',
  OTHER:        'Other',
};

function fmtDt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - now.getTime()) / 86_400_000);
}

function fmtQty(v: number | null): string {
  if (v === null) return '—';
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

function estimatedHours(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const PAGE_SIZES = [10, 20, 30, 50];

type SortKey = 'taskNumber' | 'title' | 'status' | 'priority' | 'plannedStartAt' | 'plannedEndAt' | 'createdAt';
type SortDir  = 'asc' | 'desc';

// ── Small presentational atoms ─────────────────────────────────────────────────

const TH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={cn(
    'border-b border-r border-slate-200 bg-slate-50 px-2.5 py-2',
    'text-[10px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap text-left',
    className,
  )}>
    {children}
  </th>
);

const TD = ({
  children, className, title,
}: {
  children: React.ReactNode; className?: string; title?: string;
}) => (
  <td title={title} className={cn(
    'border-r border-slate-100 px-2.5 py-1.5 text-[11px] text-slate-700 whitespace-nowrap',
    className,
  )}>
    {children}
  </td>
);

function SortBtn({
  col, sortKey, sortDir, onClick, children,
}: {
  col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onClick: () => void; children: React.ReactNode;
}) {
  const Icon = col !== sortKey
    ? ChevronsUpDown
    : sortDir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button onClick={onClick} className="flex items-center gap-0.5 hover:text-slate-800">
      {children}
      <Icon size={9} className={col !== sortKey ? 'text-slate-400' : 'text-slate-700'} />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ManufacturingTasksTable({ rows }: { rows: TaskRow[] }) {
  // Sort / pagination
  const [sortKey, setSortKey]   = useState<SortKey>('plannedEndAt');
  const [sortDir, setSortDir]   = useState<SortDir>('asc');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Toolbar toggles
  const [showInactive, setShowInactive] = useState(false);
  const [hideReady,    setHideReady]    = useState(false);

  // Column filters
  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterPriority,  setFilterPriority]  = useState('');
  const [filterOperation, setFilterOperation] = useState('');
  const [filterWorker,    setFilterWorker]    = useState('');
  const [qTaskNum,        setQTaskNum]        = useState('');
  const [qExtOrder,       setQExtOrder]       = useState('');
  const [qTitle,          setQTitle]          = useState('');
  const [qNotes,          setQNotes]          = useState('');

  // Derived filter lists
  const uniqueStatuses   = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);
  const uniquePriorities = useMemo(() => ['LOW', 'NORMAL', 'HIGH', 'URGENT'].filter((p) => rows.some((r) => r.priority === p)), [rows]);
  const uniqueOps        = useMemo(() => [...new Set(rows.map((r) => r.taskType))].sort(), [rows]);
  const uniqueWorkers    = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.workerNames.forEach((w) => s.add(w)));
    return [...s].sort();
  }, [rows]);

  // Filter + sort
  const filtered = useMemo(() => {
    let out = [...rows];
    if (!showInactive) out = out.filter((r) => r.status !== 'CANCELLED');
    if (hideReady)     out = out.filter((r) => r.status !== 'DONE');
    if (filterStatus)    out = out.filter((r) => r.status === filterStatus);
    if (filterPriority)  out = out.filter((r) => r.priority === filterPriority);
    if (filterOperation) out = out.filter((r) => r.taskType === filterOperation);
    if (filterWorker)    out = out.filter((r) => r.workerNames.includes(filterWorker));
    if (qTaskNum)   out = out.filter((r) => r.taskNumber.toLowerCase().includes(qTaskNum.toLowerCase()));
    if (qExtOrder)  out = out.filter((r) => (r.productionOrderNumber ?? '').toLowerCase().includes(qExtOrder.toLowerCase()));
    if (qTitle)     out = out.filter((r) => r.title.toLowerCase().includes(qTitle.toLowerCase()));
    if (qNotes)     out = out.filter((r) => (r.notes ?? '').toLowerCase().includes(qNotes.toLowerCase()));

    out.sort((a, b) => {
      const pick = (r: TaskRow) =>
        sortKey === 'taskNumber'    ? r.taskNumber
        : sortKey === 'title'       ? r.title
        : sortKey === 'status'      ? r.status
        : sortKey === 'priority'    ? r.priority
        : sortKey === 'plannedStartAt' ? (r.plannedStartAt ?? '')
        : sortKey === 'plannedEndAt'   ? (r.plannedEndAt ?? '')
        : r.createdAt;
      const av = pick(a), bv = pick(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return out;
  }, [rows, showInactive, hideReady, filterStatus, filterPriority, filterOperation, filterWorker,
      qTaskNum, qExtOrder, qTitle, qNotes, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const xStart     = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const xEnd       = Math.min(safePage * pageSize, filtered.length);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
    setPage(1);
  }

  // Inline filter helpers
  function Choose({ value, onChange, options }: {
    value: string; onChange: (v: string) => void; options: string[];
  }) {
    return (
      <select
        value={value}
        onChange={(e) => { onChange(e.target.value); setPage(1); }}
        className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-300"
      >
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setPage(1); }}
        placeholder="Search"
        className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-300"
      />
    );
  }

  function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
      <label className="flex cursor-pointer items-center gap-1.5 select-none text-[11px] text-slate-600">
        <span className="relative inline-flex h-4 w-7 items-center rounded-full border border-slate-300 bg-white transition">
          <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
          <span className={cn('absolute h-3 w-3 rounded-full transition-transform', checked ? 'translate-x-3.5 bg-orange-500' : 'translate-x-0.5 bg-slate-300')} />
        </span>
        {label}
      </label>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">

      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-4">
          <Toggle checked={showInactive} onChange={setShowInactive} label="Show inactive" />
          <Toggle checked={hideReady}    onChange={setHideReady}    label="Hide completed" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-slate-500 tabular-nums">{xStart}–{xEnd} of {filtered.length}</span>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
            className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30">
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
            className="rounded p-0.5 hover:bg-slate-200 disabled:opacity-30">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="min-w-[1400px] border-collapse text-left">
          <thead>

            {/* Column headers */}
            <tr>
              <TH className="w-8">
                <input type="checkbox" className="accent-orange-500" />
              </TH>
              <TH>Status</TH>
              <TH>
                <SortBtn col="taskNumber" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('taskNumber')}>
                  Task number
                </SortBtn>
              </TH>
              <TH>Production order</TH>
              <TH>
                <SortBtn col="title" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('title')}>
                  Task / Product
                </SortBtn>
              </TH>
              <TH>Operation</TH>
              <TH>
                <SortBtn col="priority" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('priority')}>
                  Priority
                </SortBtn>
              </TH>
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
              <TH>Est. time</TH>
              <TH>Days left</TH>
              <TH>Qty done / target</TH>
              <TH>Workers</TH>
              <TH>Notes</TH>
              <TH>
                <SortBtn col="createdAt" sortKey={sortKey} sortDir={sortDir} onClick={() => toggleSort('createdAt')}>
                  Created
                </SortBtn>
              </TH>
              <th className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                Actions
              </th>
            </tr>

            {/* Filter row */}
            <tr className="bg-white">
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              {/* Status */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <Choose
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={uniqueStatuses.map((s) => s)}
                />
              </td>
              {/* Task number */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchBox value={qTaskNum} onChange={setQTaskNum} />
              </td>
              {/* Production order */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchBox value={qExtOrder} onChange={setQExtOrder} />
              </td>
              {/* Task / Product */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchBox value={qTitle} onChange={setQTitle} />
              </td>
              {/* Operation */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <Choose
                  value={filterOperation}
                  onChange={setFilterOperation}
                  options={uniqueOps.map((t) => TASK_TYPE_LABELS[t] ?? t)}
                />
              </td>
              {/* Priority */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <Choose value={filterPriority} onChange={setFilterPriority} options={uniquePriorities} />
              </td>
              {/* Planned start */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <input type="date" className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300" />
              </td>
              {/* Planned stop */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <input type="date" className="w-full rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-300" />
              </td>
              {/* Est time — no filter */}
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              {/* Days left — no filter */}
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              {/* Qty — no filter */}
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              {/* Workers */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <Choose value={filterWorker} onChange={setFilterWorker} options={uniqueWorkers} />
              </td>
              {/* Notes */}
              <td className="border-b border-r border-slate-100 px-2 py-1">
                <SearchBox value={qNotes} onChange={setQNotes} />
              </td>
              {/* Created — no filter */}
              <td className="border-b border-r border-slate-100 px-2 py-1" />
              {/* Actions */}
              <td className="border-b border-slate-100 px-2 py-1" />
            </tr>

          </thead>

          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-4 py-5">
                  <div className="flex items-center gap-2 text-slate-500">
                    <TriangleAlert size={14} className="shrink-0 text-slate-400" />
                    <span className="text-[12px] font-medium">No data found</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const days   = daysLeft(row.plannedEndAt);
                const done   = row.completedQty ?? 0;
                const target = row.targetQty ?? 0;
                const pct    = target > 0 ? Math.min(100, (done / target) * 100) : 0;

                return (
                  <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">

                    {/* Checkbox */}
                    <TD className="w-8 text-center">
                      <input type="checkbox" className="accent-orange-500" />
                    </TD>

                    {/* Status */}
                    <TD>
                      <span className={cn(
                        'inline-block rounded px-2 py-0.5 text-[9px] font-bold tracking-wide whitespace-nowrap',
                        STATUS_CLS[row.status] ?? 'bg-slate-200 text-slate-600',
                      )}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </TD>

                    {/* Task number */}
                    <TD>
                      <Link
                        href={`/manufacturing-tasks/${row.id}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        {row.taskNumber}
                      </Link>
                    </TD>

                    {/* Production order */}
                    <TD>
                      {row.productionOrderId ? (
                        <Link
                          href={`/production/${row.productionOrderId}`}
                          className="text-blue-600 hover:underline"
                        >
                          {row.productionOrderNumber ?? '—'}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>

                    {/* Task / Product title */}
                    <TD className="max-w-[200px] truncate" title={row.title}>
                      <Link href={`/manufacturing-tasks/${row.id}`} className="hover:underline">
                        {row.title}
                      </Link>
                    </TD>

                    {/* Operation */}
                    <TD>{TASK_TYPE_LABELS[row.taskType] ?? row.taskType}</TD>

                    {/* Priority */}
                    <TD>
                      <span className={cn(
                        'inline-block rounded px-2 py-0.5 text-[9px] font-bold tracking-wide',
                        PRIORITY_CLS[row.priority] ?? 'bg-slate-100 text-slate-600',
                      )}>
                        {row.priority}
                      </span>
                    </TD>

                    {/* Planned start */}
                    <TD className="text-[10px] font-mono tabular-nums">
                      {fmtDt(row.plannedStartAt)}
                    </TD>

                    {/* Planned stop */}
                    <TD className="text-[10px] font-mono tabular-nums">
                      {fmtDt(row.plannedEndAt)}
                    </TD>

                    {/* Estimated time (derived) */}
                    <TD className="text-[10px] text-slate-500">
                      {estimatedHours(row.plannedStartAt, row.plannedEndAt)}
                    </TD>

                    {/* Days left */}
                    <TD>
                      {days === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={cn(
                          'font-semibold tabular-nums',
                          days < 0   ? 'text-rose-600'
                          : days <= 2 ? 'text-amber-600'
                          : 'text-slate-700',
                        )}>
                          {days < 0 ? days : `+${days}`}
                        </span>
                      )}
                    </TD>

                    {/* Qty done / target + progress bar */}
                    <TD className="min-w-[140px]">
                      <div className="flex flex-col gap-1">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-orange-400')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-slate-500">
                          {fmtQty(row.completedQty)} / {fmtQty(row.targetQty)}
                        </span>
                      </div>
                    </TD>

                    {/* Workers */}
                    <TD className="max-w-[140px] truncate" title={row.workerNames.join(', ')}>
                      {row.workerNames.length > 0
                        ? row.workerNames.join(', ')
                        : <span className="text-slate-400">—</span>}
                    </TD>

                    {/* Notes */}
                    <TD className="max-w-[180px] truncate" title={row.notes ?? undefined}>
                      {row.notes
                        ? <span className="text-slate-500">{row.notes}</span>
                        : <span className="text-slate-300">—</span>}
                    </TD>

                    {/* Created */}
                    <TD className="text-[10px] tabular-nums text-slate-500">
                      {fmtDt(row.createdAt)}
                    </TD>

                    {/* Actions */}
                    <td className="px-2.5 py-1.5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/manufacturing-tasks/${row.id}/edit`}
                          className="flex h-6 w-6 items-center justify-center rounded hover:bg-orange-50"
                        >
                          <Pencil size={12} className="text-orange-400" />
                        </Link>
                        <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-rose-50">
                          <Trash2 size={12} className="text-rose-400" />
                        </button>
                      </div>
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
