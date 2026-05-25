'use client';

import { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  Settings,
  CalendarClock,
  TriangleAlert,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskRow } from './ManufacturingTasksTable';

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

function fmtQty(v: number | null): string {
  if (v === null) return '0,00';
  return v.toFixed(2).replace('.', ',');
}

export function AddToScheduleModal({
  rows,
  onClose,
}: {
  rows: TaskRow[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.taskNumber.toLowerCase().includes(q) ||
        (r.productionOrderNumber ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const selectedRows = rows.filter((r) => selected.has(r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Add orders to schedule</h2>
            <button className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-slate-400 hover:bg-slate-100">
              <span className="text-[10px] font-bold">?</span>
            </button>
            <span className="text-[11px] text-slate-400">
              (the order doesn't matter, you can change it later)
            </span>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Tip */}
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="relative">
                <div className="h-8 w-10 rounded border border-slate-300 bg-white p-1">
                  <div className="h-1 w-full rounded bg-slate-200 mb-0.5" />
                  <div className="h-1 w-3/4 rounded bg-slate-200" />
                </div>
                <Settings size={14} className="absolute -bottom-1 -right-2 text-emerald-500" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Tip:</span>{' '}
              If you want to add orders faster, assign the machines used to make them. Go to the
              product list and edit selected product.
            </p>
          </div>
        </div>

        {/* Search + actions */}
        <div className="relative flex items-center gap-3 border-b border-slate-200 px-6 py-3">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search"
              className="w-full rounded border border-slate-200 bg-white py-1.5 pl-8 pr-10 text-[12px] focus:outline-none focus:ring-1 focus:ring-orange-300"
            />
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-400 hover:bg-orange-500"
            >
              <ChevronDown size={9} className="text-white" />
            </button>

            {/* Dropdown results */}
            {showDropdown && search && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-[11px] text-slate-400">No results</div>
                ) : (
                  filtered.map((r) => (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-orange-50/70 text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="accent-orange-500"
                      />
                      <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', STATUS_CLS[r.status] ?? 'bg-slate-200 text-slate-600')}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      <span className="font-medium text-slate-700">{r.taskNumber}</span>
                      <span className="text-slate-500 truncate">{r.title}</span>
                      {r.productionOrderNumber && (
                        <span className="ml-auto shrink-0 text-slate-400">{r.productionOrderNumber}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowDropdown(false)}
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-1.5 text-[11px] font-bold text-white hover:bg-orange-600"
          >
            <Plus size={11} /> ADD TO LIST
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">
            <CalendarClock size={11} /> SCHEDULE
          </button>
        </div>

        {/* Selected orders table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Selected orders:
          </p>
          <div className="rounded border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {[
                    'Image',
                    'Status',
                    'ID Prodio',
                    'External order ID',
                    'Product',
                    'Products (done/all)',
                    'Actions',
                  ].map((col) => (
                    <th
                      key={col}
                      className="border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 last:border-r-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <TriangleAlert size={13} className="text-slate-300" />
                        <span className="text-[11px]">No data found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  selectedRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      {/* Image */}
                      <td className="border-r border-slate-100 px-3 py-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            className="h-5 w-5 text-slate-400"
                          >
                            <path
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="border-r border-slate-100 px-3 py-2">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-[10px] font-bold',
                            STATUS_CLS[r.status] ?? 'bg-slate-200 text-slate-600',
                          )}
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      {/* ID Prodio */}
                      <td className="border-r border-slate-100 px-3 py-2 text-[11px] font-medium text-blue-600">
                        {r.id.slice(-8).toUpperCase()}
                      </td>
                      {/* External order ID */}
                      <td className="border-r border-slate-100 px-3 py-2 text-[11px] text-blue-600">
                        {r.productionOrderNumber ?? '—'}
                      </td>
                      {/* Product */}
                      <td className="border-r border-slate-100 px-3 py-2 text-[11px] text-slate-700">
                        {r.title}
                      </td>
                      {/* Products done/all */}
                      <td className="border-r border-slate-100 px-3 py-2 text-[11px] text-slate-700">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-orange-400"
                                style={{
                                  width: `${r.targetQty ? Math.min(100, ((r.completedQty ?? 0) / r.targetQty) * 100) : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {fmtQty(r.completedQty)}/{fmtQty(r.targetQty)}
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2">
                        <button
                          onClick={() => toggle(r.id)}
                          className="rounded p-0.5 hover:bg-rose-50"
                          title="Remove"
                        >
                          <X size={12} className="text-rose-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center border-t border-slate-200 px-6 py-4">
          <button className="rounded-full bg-emerald-500 px-10 py-2.5 text-[12px] font-bold text-white hover:bg-emerald-600 transition">
            SCHEDULE SELECTED ORDERS
          </button>
        </div>
      </div>
    </div>
  );
}
