'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Pencil,
  Search,
} from 'lucide-react';
import { formatKobo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';

/* ── Types ───────────────────────────────────────────────────────── */
export type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  totalKobo: number;
  dueAt: string | null;
  createdAt: string;
  notes: string | null;
  itemCount: number;
  productSummary: string;
  productNames: string[];
  productionStatus: string | null;
};

type SortKey = 'orderNumber' | 'customerName' | 'dueAt' | 'totalKobo' | 'status';
type DateRange = { from: string; to: string };

const ORDER_STATUSES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PRODUCTION', label: 'In Production' },
  { value: 'READY', label: 'Ready' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ── Click-outside hook ──────────────────────────────────────────── */
function useClickOutside(ref: React.RefObject<HTMLDivElement>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

/* ── Multi-select checkbox dropdown (Status / Product) ───────────── */
function MultiSelectDropdown({
  placeholder,
  options,
  selected,
  onChange,
  width = 'w-52',
}: {
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<string[]>(selected);
  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, () => setOpen(false));

  function handleOpen() {
    setDraft(selected);
    setSearch('');
    setOpen(true);
  }

  const visible = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(v: string) {
    setDraft((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  function clear() {
    setDraft([]);
    onChange([]);
    setOpen(false);
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={cn(
          'flex h-[30px] w-full items-center justify-between gap-1.5 rounded-md border px-2.5 text-xs transition',
          selected.length > 0
            ? 'border-brand-400 bg-brand-50 font-semibold text-brand-700'
            : 'border-border bg-white text-slate-600 hover:border-slate-300',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {selected.length > 0 ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            className="shrink-0 cursor-pointer text-brand-400 hover:text-brand-700"
            title="Clear"
          >
            ✕
          </span>
        ) : (
          <ChevronDown size={11} className={cn('shrink-0 transition', open && 'rotate-180')} />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-white shadow-xl',
            width,
          )}
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                autoFocus
                className="w-full rounded-md border border-border py-1 pl-6 pr-2 text-xs outline-none focus:border-brand-400"
              />
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {visible.map((opt) => (
              <li key={opt.value}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-slate-50',
                    draft.includes(opt.value) && 'bg-slate-50/80',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={draft.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span className="text-sm text-ink">{opt.label}</span>
                </label>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-3 py-3 text-xs text-slate-400">No matches</li>
            )}
          </ul>

          <div className="border-t border-border p-2">
            <button
              type="button"
              onClick={apply}
              className="w-full rounded-full bg-brand-500 py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-brand-600"
            >
              Filter the list{draft.length > 0 && ` (${draft.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Date-range dropdown ─────────────────────────────────────────── */
const DATE_PRESETS = [
  {
    label: 'Yesterday',
    get(): DateRange {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const s = d.toISOString().slice(0, 10);
      return { from: s, to: s };
    },
  },
  {
    label: 'Last 7 days',
    get(): DateRange {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'Last 30 days',
    get(): DateRange {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 29);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'Current month',
    get(): DateRange {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10),
        to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10),
      };
    },
  },
  {
    label: 'Previous month',
    get(): DateRange {
      const n = new Date();
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 1, 1).toISOString().slice(0, 10),
        to: new Date(n.getFullYear(), n.getMonth(), 0).toISOString().slice(0, 10),
      };
    },
  },
];

function DateRangeDropdown({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (v: DateRange) => void;
}) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, () => setOpen(false));

  /* Build calendar day grid (Mon-first) */
  const firstDay = new Date(calYear, calMonth, 1);
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0 … Sun=6
  const calDays: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function isoForDay(d: number) {
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function selectDay(d: number) {
    const iso = isoForDay(d);
    if (!draft.from || (draft.from && draft.to)) {
      setDraft({ from: iso, to: '' });
    } else {
      setDraft(
        iso < draft.from ? { from: iso, to: draft.from } : { from: draft.from, to: iso },
      );
    }
  }

  function dayState(d: number): 'start' | 'end' | 'in-range' | 'single' | 'none' {
    const iso = isoForDay(d);
    const { from, to } = draft;
    if (from && !to && iso === from) return 'single';
    if (from && to) {
      if (iso === from && iso === to) return 'single';
      if (iso === from) return 'start';
      if (iso === to) return 'end';
      if (iso > from && iso < to) return 'in-range';
    }
    return 'none';
  }

  function prevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  function applyPreset(preset: (typeof DATE_PRESETS)[number]) {
    const range = preset.get();
    setDraft(range);
    // Navigate calendar to the "from" month
    const d = new Date(range.from);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }

  /* Label shown on trigger button */
  const btnLabel =
    value.from && value.to && value.from === value.to
      ? value.from
      : value.from && value.to
        ? `${value.from} – ${value.to}`
        : value.from
          ? `From ${value.from}`
          : 'Choose';

  const hasValue = !!(value.from || value.to);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            setDraft(value);
            setOpen(true);
          }
        }}
        className={cn(
          'flex h-[30px] w-full items-center justify-between gap-1.5 rounded-md border px-2.5 text-xs transition',
          hasValue
            ? 'border-brand-400 bg-brand-50 font-semibold text-brand-700'
            : 'border-border bg-white text-slate-600 hover:border-slate-300',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{btnLabel}</span>
        {hasValue ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: '', to: '' });
            }}
            className="shrink-0 cursor-pointer text-brand-400 hover:text-brand-700"
            title="Clear"
          >
            ✕
          </span>
        ) : (
          <ChevronDown size={11} className={cn('shrink-0 transition', open && 'rotate-180')} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 flex overflow-hidden rounded-lg border border-border bg-white shadow-xl">
          {/* Presets */}
          <div className="w-36 border-r border-border py-1">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Mini calendar */}
          <div className="w-56 p-3">
            {/* Month + Year navigation */}
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="flex-1 text-center text-xs font-semibold text-ink">
                {MONTHS[calMonth]}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100"
              >
                <ChevronRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => setCalYear((y) => y - 1)}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-semibold text-ink">{calYear}</span>
              <button
                type="button"
                onClick={() => setCalYear((y) => y + 1)}
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-slate-100"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="mb-0.5 grid grid-cols-7">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div
                  key={d}
                  className="text-center text-[9px] font-bold uppercase text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {calDays.map((d, i) => {
                const state = d ? dayState(d) : 'none';
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!d}
                    onClick={d ? () => selectDay(d) : undefined}
                    className={cn(
                      'flex h-7 items-center justify-center text-xs',
                      !d && 'invisible',
                      state === 'none' && 'rounded text-ink hover:bg-slate-100',
                      state === 'single' &&
                        'rounded-full bg-brand-500 font-bold text-white',
                      state === 'start' &&
                        'rounded-l-full bg-brand-500 font-bold text-white',
                      state === 'end' &&
                        'rounded-r-full bg-brand-500 font-bold text-white',
                      state === 'in-range' && 'bg-brand-100 text-brand-800',
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* From / To display + actions */}
            {(draft.from || draft.to) && (
              <div className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-600">
                {draft.from && <div>From: {draft.from}</div>}
                {draft.to && <div>To: {draft.to}</div>}
              </div>
            )}

            <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold uppercase text-slate-500 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="rounded-full bg-success-600 px-4 py-1.5 text-xs font-bold uppercase text-white hover:bg-success-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sortable column header ──────────────────────────────────────── */
function SortTh({
  children,
  sortKey,
  currentSort,
  dir,
  onSort,
  align = 'left',
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSort: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={cn(
        'px-3 py-2',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-0.5 whitespace-nowrap hover:text-ink',
          active ? 'text-ink' : 'text-slate-500',
        )}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp size={11} />
          ) : (
            <ChevronDown size={11} />
          )
        ) : (
          <ChevronDown size={11} className="text-slate-300" />
        )}
      </button>
    </th>
  );
}

/* ── Hover action button ─────────────────────────────────────────── */
function ActionBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded border border-border bg-white text-slate-500 hover:border-brand-400 hover:text-brand-600"
    >
      {children}
    </button>
  );
}

/* ── Main table component ────────────────────────────────────────── */
export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();

  /* Filter state */
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [productFilters, setProductFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>('dueAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  /* All unique product names across orders */
  const allProductNames = useMemo(() => {
    const names = new Set<string>();
    rows.forEach((r) => r.productNames.forEach((n) => names.add(n)));
    return Array.from(names).sort();
  }, [rows]);

  /* Filter + sort */
  const filtered = useMemo(() => {
    const out = rows.filter((r) => {
      if (!showClosed && (r.status === 'CANCELLED' || r.status === 'DELIVERED')) return false;
      if (statusFilters.length > 0 && !statusFilters.includes(r.status)) return false;
      if (
        productFilters.length > 0 &&
        !r.productNames.some((n) => productFilters.includes(n))
      )
        return false;
      if (dateRange.from && r.dueAt && r.dueAt.slice(0, 10) < dateRange.from) return false;
      if (dateRange.to && r.dueAt && r.dueAt.slice(0, 10) > dateRange.to) return false;
      if (
        clientSearch.trim() &&
        !r.customerName.toLowerCase().includes(clientSearch.toLowerCase())
      )
        return false;
      if (
        orderIdSearch.trim() &&
        !r.orderNumber.toLowerCase().includes(orderIdSearch.toLowerCase())
      )
        return false;
      if (showOverdueOnly) {
        const d = daysLeft(r.dueAt);
        if (d === null || d >= 0) return false;
      }
      return true;
    });

    return [...out].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'orderNumber':
          return a.orderNumber.localeCompare(b.orderNumber) * dir;
        case 'customerName':
          return a.customerName.localeCompare(b.customerName) * dir;
        case 'dueAt': {
          const av = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bv = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return (av - bv) * dir;
        }
        case 'totalKobo':
          return (a.totalKobo - b.totalKobo) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
      }
    });
  }, [
    rows,
    statusFilters,
    productFilters,
    dateRange,
    clientSearch,
    orderIdSearch,
    showClosed,
    showOverdueOnly,
    sortBy,
    sortDir,
  ]);

  function toggleSort(k: SortKey) {
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(k);
      setSortDir('asc');
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  const pageTotal = filtered.reduce((s, o) => s + o.totalKobo, 0);
  const overdueCount = rows.filter((r) => {
    const d = daysLeft(r.dueAt);
    return d !== null && d < 0 && r.status !== 'DELIVERED' && r.status !== 'CANCELLED';
  }).length;

  const hasFilters =
    statusFilters.length > 0 ||
    productFilters.length > 0 ||
    dateRange.from !== '' ||
    clientSearch !== '' ||
    orderIdSearch !== '';

  return (
    <div className="card overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-slate-50/50 px-4 py-2.5 text-xs">
        <div className="text-slate-600">
          Records:{' '}
          <span className="font-bold text-ink">{filtered.length}</span>
          {rows.length !== filtered.length && (
            <span className="text-slate-400"> / {rows.length}</span>
          )}
        </div>

        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setShowOverdueOnly((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition',
              showOverdueOnly
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
            )}
          >
            <AlertTriangle size={10} />
            {overdueCount} overdue
          </button>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setStatusFilters([]);
              setProductFilters([]);
              setDateRange({ from: '', to: '' });
              setClientSearch('');
              setOrderIdSearch('');
            }}
            className="text-[11px] font-semibold text-rose-600 hover:underline"
          >
            Clear all filters
          </button>
        )}

        <div className="flex-1" />

        <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-600">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="h-3.5 w-3.5 accent-brand-500"
          />
          Show delivered / cancelled
        </label>

        <a
          href="/api/orders/export"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </a>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white text-[10px] font-bold uppercase tracking-wider">
              {/* Sort row */}
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 accent-brand-500"
                    aria-label="Select all"
                  />
                </th>
                <SortTh
                  sortKey="status"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="w-32"
                >
                  Status
                </SortTh>
                <SortTh
                  sortKey="orderNumber"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  className="w-28"
                >
                  Order ID
                </SortTh>
                <SortTh
                  sortKey="customerName"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                >
                  Client
                </SortTh>
                <th className="px-3 py-2">Products</th>
                <SortTh
                  sortKey="dueAt"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  align="center"
                  className="w-20"
                >
                  Days left
                </SortTh>
                <th className="w-32 px-3 py-2">Due date</th>
                <th className="w-28 px-3 py-2">Prod. status</th>
                <th className="px-3 py-2">Notes</th>
                <SortTh
                  sortKey="totalKobo"
                  currentSort={sortBy}
                  dir={sortDir}
                  onSort={toggleSort}
                  align="right"
                  className="w-28"
                >
                  Total
                </SortTh>
                <th className="w-16 px-3 py-2" />
              </tr>

              {/* Filter row */}
              <tr className="border-b border-border bg-slate-50/60">
                <td className="px-3 py-1.5" />

                {/* Status filter */}
                <td className="px-2 py-1.5">
                  <MultiSelectDropdown
                    placeholder="Choose"
                    options={ORDER_STATUSES}
                    selected={statusFilters}
                    onChange={setStatusFilters}
                    width="w-52"
                  />
                </td>

                {/* Order ID search */}
                <td className="px-2 py-1.5">
                  <div className="relative">
                    <Search
                      size={11}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={orderIdSearch}
                      onChange={(e) => setOrderIdSearch(e.target.value)}
                      placeholder="Search"
                      className="h-[30px] w-full rounded-md border border-border bg-white py-1 pl-5 pr-2 text-xs outline-none focus:border-brand-400"
                    />
                  </div>
                </td>

                {/* Client search */}
                <td className="px-2 py-1.5">
                  <div className="relative">
                    <Search
                      size={11}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search"
                      className="h-[30px] w-full rounded-md border border-border bg-white py-1 pl-5 pr-2 text-xs outline-none focus:border-brand-400"
                    />
                  </div>
                </td>

                {/* Product filter */}
                <td className="px-2 py-1.5">
                  <MultiSelectDropdown
                    placeholder="Choose"
                    options={allProductNames.map((n) => ({ value: n, label: n }))}
                    selected={productFilters}
                    onChange={setProductFilters}
                    width="w-64"
                  />
                </td>

                <td className="px-2 py-1.5" />

                {/* Due date filter */}
                <td className="px-2 py-1.5">
                  <DateRangeDropdown value={dateRange} onChange={setDateRange} />
                </td>

                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5" />
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {filtered.map((o) => {
                const d = daysLeft(o.dueAt);
                const overdue = d !== null && d < 0;
                const dueSoon = d !== null && d >= 0 && d <= 3;

                return (
                  <tr key={o.id} className="group hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggleSelect(o.id)}
                        className="h-3.5 w-3.5 accent-brand-500"
                      />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="font-semibold text-ink">{o.customerName}</div>
                      {o.customerPhone && (
                        <div className="text-xs text-slate-500">{o.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="max-w-[160px] truncate text-sm text-slate-700">
                        {o.productSummary || '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-middle">
                      {d === null ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <span
                          className={cn(
                            'text-sm font-bold',
                            overdue
                              ? 'text-rose-600'
                              : dueSoon
                                ? 'text-owed-600'
                                : 'text-success-700',
                          )}
                        >
                          {overdue ? `${d}d` : `+${d}d`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      <div className="inline-flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        {formatDate(o.dueAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {o.productionStatus ? (
                        <StatusBadge status={o.productionStatus} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="max-w-[120px] px-3 py-2.5 align-middle">
                      <span className="line-clamp-1 text-xs text-slate-500">{o.notes ?? ''}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right align-middle">
                      <span className="num text-sm font-bold text-ink">
                        {formatKobo(o.totalKobo)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <ActionBtn title="View" onClick={() => router.push(`/orders/${o.id}`)}>
                          <Eye size={12} />
                        </ActionBtn>
                        <ActionBtn
                          title="Edit"
                          onClick={() => router.push(`/orders/${o.id}/edit`)}
                        >
                          <Pencil size={12} />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-500">
                    No orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>

            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-owed-200 bg-owed-50/70">
                  <td colSpan={9} className="px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Page summary — {filtered.length}{' '}
                      {filtered.length === 1 ? 'order' : 'orders'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="num text-sm font-black text-ink">
                      {formatKobo(pageTotal)}
                    </span>
                  </td>
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <ul className="divide-y divide-border md:hidden">
        {filtered.map((o) => {
          const d = daysLeft(o.dueAt);
          const overdue = d !== null && d < 0;
          return (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={o.status} />
                  <span className="font-mono text-xs font-semibold text-brand-700">
                    {o.orderNumber}
                  </span>
                </div>
                <div className="text-sm font-semibold text-ink">{o.customerName}</div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'} · {formatDate(o.dueAt)}
                    {d !== null && (
                      <span
                        className={cn(
                          'ml-1 font-bold',
                          overdue ? 'text-rose-600' : 'text-slate-700',
                        )}
                      >
                        ({d}d)
                      </span>
                    )}
                  </span>
                  <span className="num font-bold text-ink">{formatKobo(o.totalKobo)}</span>
                </div>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No orders match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
