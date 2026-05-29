'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MoreHorizontal, ChevronDown, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductionOrderRow {
  id: string;
  productionNumber: string;
  products: string;
  customerName: string | null;
  orderNumber: string | null;
  customerOrderId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  plannedEndAt: string | null;
  cancelled: boolean;
}

interface Props {
  rows: ProductionOrderRow[];
  startedParam: string;
  finishedParam: string;
  cancelledParam: string;
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    PLANNED: 'bg-slate-400',
    MATERIALS_NEEDED: 'bg-owed-500',
    READY_TO_PRODUCE: 'bg-blue-500',
    IN_PRODUCTION: 'bg-green-500',
    COMPLETED: 'bg-success-600',
    DELAYED: 'bg-orange-500',
    CANCELLED: 'bg-rose-500',
  };
  const label: Record<string, string> = {
    PLANNED: 'Not started',
    MATERIALS_NEEDED: 'Materials needed',
    READY_TO_PRODUCE: 'Ready',
    IN_PRODUCTION: 'Started',
    COMPLETED: 'Finished',
    DELAYED: 'Delayed',
    CANCELLED: 'Cancelled',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', map[status] ?? 'bg-slate-300')} />
      <span className="text-slate-600">{label[status] ?? status}</span>
    </span>
  );
}

function RowActions({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
        className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {[
            { label: 'View details', href: `/production/${id}` },
            { label: 'Start production', href: `/production/${id}?action=start` },
            { label: 'Mark complete', href: `/production/${id}?action=complete` },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  paramKey,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  paramKey: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function select(v: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, v);
    router.push(`/production?${params.toString()}`);
  }

  const selected = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
      >
        <span className="text-slate-400">{label}:</span> {selected}
        <ChevronDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt.value)}
              className={cn(
                'block w-full px-4 py-2 text-left text-[13px] hover:bg-slate-50',
                opt.value === value ? 'font-semibold text-brand-700' : 'text-slate-700',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductionOrdersTable({ rows, startedParam, finishedParam, cancelledParam }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.productionNumber.toLowerCase().includes(q) ||
        r.products.toLowerCase().includes(q) ||
        (r.customerName ?? '').toLowerCase().includes(q) ||
        (r.orderNumber ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <FilterDropdown
          label="Started"
          paramKey="started"
          value={startedParam}
          options={[
            { value: 'all', label: 'All' },
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
        <FilterDropdown
          label="Finished"
          paramKey="finished"
          value={finishedParam}
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'all', label: 'All' },
          ]}
        />
        <FilterDropdown
          label="Cancelled"
          paramKey="cancelled"
          value={cancelledParam}
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
            { value: 'all', label: 'All' },
          ]}
        />

        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-8 rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
        >
          <Bookmark size={11} />
          Remember
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-[13px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="w-8 px-4 py-2.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={selected.size > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-2.5">Number</th>
              <th className="min-w-[180px] px-3 py-2.5">Products</th>
              <th className="px-3 py-2.5">Customer</th>
              <th className="px-3 py-2.5">Order</th>
              <th className="px-3 py-2.5">Started</th>
              <th className="px-3 py-2.5">Finished</th>
              <th className="px-3 py-2.5">Cancelled</th>
              <th className="px-3 py-2.5">Expected date</th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-10 text-center text-sm text-slate-400">
                  No production orders found
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/production/${row.id}`}
                      className="font-mono text-[12px] font-semibold text-brand-700 hover:underline"
                    >
                      {row.productionNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-ink">{row.products || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {row.customerName ? (
                      <Link href={`/orders/${row.customerOrderId}`} className="hover:text-brand-700 hover:underline">
                        {row.customerName}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.orderNumber ? (
                      <Link href={`/orders/${row.customerOrderId}`} className="font-mono text-[12px] text-brand-700 hover:underline">
                        {row.orderNumber}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {row.startedAt ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        {fmtDate(row.startedAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not started</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {row.completedAt ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-success-600" />
                        {fmtDate(row.completedAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not finished</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.cancelled ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-600">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-green-600">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.plannedEndAt ? (
                      <span className={cn(
                        'text-[12px]',
                        new Date(row.plannedEndAt) < new Date() && !row.completedAt
                          ? 'font-semibold text-rose-600'
                          : 'text-slate-600',
                      )}>
                        {fmtDate(row.plannedEndAt)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <RowActions id={row.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
