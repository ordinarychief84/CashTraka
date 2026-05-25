'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  Copy,
  FileText,
  ShoppingCart,
  ListTree,
  Boxes,
  ClipboardList,
  SlidersHorizontal,
  Settings2,
  Search,
  Download,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  barcodeValue?: string | null;
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
  inOrder?: number;
  purchased?: number;
};

type SortKey = 'sku' | 'name' | 'group' | 'price' | 'cost' | 'stock';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtNum(v: number): string {
  return v.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Row action dropdown ────────────────────────────────────────────────────────

function RowActions({
  id,
  archived,
  onArchive,
}: {
  id: string;
  archived: boolean;
  onArchive: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  const items: {
    label: string;
    icon: React.ReactNode;
    danger?: boolean;
    onClick: () => void;
  }[] = [
    {
      label: 'Edit',
      icon: <Pencil size={13} />,
      onClick: () => { router.push(`/products/${id}/edit`); setOpen(false); },
    },
    {
      label: 'Adjust inventory',
      icon: <Boxes size={13} />,
      onClick: () => { router.push(`/inventory/adjustments?product=${id}`); setOpen(false); },
    },
    {
      label: 'Convert BOM',
      icon: <ListTree size={13} />,
      onClick: () => { router.push(`/recipes/${id}`); setOpen(false); },
    },
    {
      label: 'Copy',
      icon: <Copy size={13} />,
      onClick: () => { toast.info('Copy — coming soon'); setOpen(false); },
    },
    {
      label: 'Ledger',
      icon: <FileText size={13} />,
      onClick: () => { router.push(`/inventory/movements?product=${id}`); setOpen(false); },
    },
    {
      label: 'Purchase product',
      icon: <ShoppingCart size={13} />,
      onClick: () => { router.push(`/purchase-orders/new?product=${id}`); setOpen(false); },
    },
    {
      label: 'Show BOM',
      icon: <ClipboardList size={13} />,
      onClick: () => { router.push(`/recipes/${id}`); setOpen(false); },
    },
    {
      label: archived ? 'Restore product' : 'Delete',
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: () => { onArchive(); setOpen(false); },
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition',
                item.danger
                  ? 'text-rose-600 hover:bg-rose-50'
                  : 'text-slate-700 hover:bg-slate-50',
              )}
            >
              <span className={item.danger ? 'text-rose-400' : 'text-slate-400'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Filter panel popover ───────────────────────────────────────────────────────

function FilterPanel({
  open,
  onClose,
  pageSize,
  onPageSizeChange,
  groupOptions,
  groupFilter,
  onGroupChange,
}: {
  open: boolean;
  onClose: () => void;
  pageSize: number;
  onPageSizeChange: (v: number) => void;
  groupOptions: string[];
  groupFilter: string;
  onGroupChange: (v: string) => void;
}) {
  const [groupQ, setGroupQ] = useState('');
  const [listOpen, setListOpen] = useState(false);

  const filtered = useMemo(
    () =>
      groupQ
        ? groupOptions.filter((g) => g.toLowerCase().includes(groupQ.toLowerCase()))
        : groupOptions,
    [groupOptions, groupQ],
  );

  if (!open) return null;

  return (
    <div className="absolute left-0 top-full z-40 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
      {/* Results per page */}
      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Results per page
        </p>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 pr-8 text-[13px] text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Item group */}
      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Default location
        </p>
        <div className="relative">
          <input
            value={groupQ || groupFilter}
            onChange={(e) => { setGroupQ(e.target.value); setListOpen(true); }}
            onFocus={() => setListOpen(true)}
            onBlur={() => setTimeout(() => setListOpen(false), 160)}
            placeholder="Select location…"
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
          {listOpen && groupOptions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded border border-slate-200 bg-white shadow">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-slate-400">No groups</p>
              ) : (
                filtered.map((g) => (
                  <button
                    key={g}
                    onMouseDown={() => { onGroupChange(g); setGroupQ(''); setListOpen(false); }}
                    className="w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-blue-50"
                  >
                    {g}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Primary supplier — placeholder */}
      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          Primary supplier
        </p>
        <div className="relative">
          <input
            disabled
            placeholder=""
            className="w-full cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-3 py-2 pr-8 text-[13px] text-slate-400 outline-none"
          />
          <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 6h8L8 11z" />
          </svg>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { onPageSizeChange(25); onGroupChange(''); setGroupQ(''); }}
          className="flex-1 rounded border border-slate-300 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Clear
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded border border-slate-300 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main table component ───────────────────────────────────────────────────────

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();

  // Filters + search
  const [q, setQ] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open');

  // Sort
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Filter panel
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Busy state for archive
  const [busy, setBusy] = useState<string | null>(null);

  // Close filter panel on outside click
  useEffect(() => {
    function outside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  // Distinct groups for filter list
  const groupOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.group ?? '').filter(Boolean))).sort(),
    [rows],
  );

  // Filtered + sorted rows
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (statusFilter === 'open' && r.archived) return false;
      if (ql) {
        const hit =
          r.name.toLowerCase().includes(ql) ||
          (r.sku ?? '').toLowerCase().includes(ql) ||
          (r.barcodeValue ?? '').toLowerCase().includes(ql);
        if (!hit) return false;
      }
      if (groupFilter && (r.group ?? '') !== groupFilter) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'sku':   return (a.sku ?? '').localeCompare(b.sku ?? '') * dir;
        case 'group': return (a.group ?? '').localeCompare(b.group ?? '') * dir;
        case 'price': return (a.price - b.price) * dir;
        case 'cost':  return ((a.cost ?? 0) - (b.cost ?? 0)) * dir;
        case 'stock': return (a.stock - b.stock) * dir;
        default:      return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [rows, q, groupFilter, statusFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
    setPage(1);
  }

  function toggleAll() {
    if (selected.size === pageRows.length && pageRows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageRows.map((r) => r.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const archiveProduct = useCallback(async (id: string, isArchived: boolean) => {
    if (!isArchived && !confirm('Archive this product? Sales history is preserved.')) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(isArchived ? 'Product restored' : 'Product archived');
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error || 'Could not update product');
      }
    } finally {
      setBusy(null);
    }
  }, [router]);

  // ── Sort header helper ────────────────────────────────────────────────────
  function SortTh({
    label,
    col,
    className,
    align = 'left',
  }: {
    label: string;
    col: SortKey;
    className?: string;
    align?: 'left' | 'right';
  }) {
    const active = sortBy === col;
    const Icon = !active ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown;
    return (
      <th
        className={cn(
          'border-b border-r border-slate-200 bg-white px-3 py-2 whitespace-nowrap',
          className,
        )}
      >
        <button
          onClick={() => toggleSort(col)}
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-semibold transition hover:text-slate-900',
            align === 'right' ? 'ml-auto flex-row-reverse' : '',
            active ? 'text-blue-700' : 'text-slate-500',
          )}
        >
          {label}
          <Icon size={11} className={active ? 'text-blue-600' : 'text-slate-400'} />
        </button>
      </th>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">

      {/* ── Page-level header (count + bulk actions + create) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="text-[15px] font-bold text-slate-800">
          {filtered.length}{' '}
          <span className="font-normal text-slate-500">Products</span>
        </h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
              Bulk actions ({selected.size})
              <ChevronDown size={11} />
            </button>
          )}
          <a
            href="/api/products/export"
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={12} />
            Import / Export
            <ChevronDown size={11} />
          </a>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700 transition"
          >
            <Plus size={12} />
            Create new
          </Link>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
        {/* Filters popover trigger */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <SlidersHorizontal size={12} />
            Filters
            <ChevronDown
              size={11}
              className={cn('transition-transform', filterOpen && 'rotate-180')}
            />
          </button>
          <FilterPanel
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            pageSize={pageSize}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            groupOptions={groupOptions}
            groupFilter={groupFilter}
            onGroupChange={(v) => { setGroupFilter(v); setPage(1); }}
          />
        </div>

        {/* Search */}
        <div className="relative min-w-[180px] flex-1 max-w-sm">
          <Search
            size={12}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="By number & name"
            className="w-full rounded border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-[12px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        {/* Item group quick picker */}
        {groupOptions.length > 0 && (
          <div className="relative">
            <select
              value={groupFilter}
              onChange={(e) => { setGroupFilter(e.target.value); setPage(1); }}
              className="appearance-none rounded border border-slate-300 bg-white py-1.5 pl-3 pr-7 text-[12px] text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            >
              <option value="">Item group</option>
              {groupOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown
              size={11}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        )}

        {/* Settings icon */}
        <button className="ml-auto rounded border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
          <Settings2 size={13} />
        </button>
      </div>

      {/* ── Active filter chips ── */}
      {(statusFilter === 'open' || groupFilter) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-1.5">
          {statusFilter === 'open' && (
            <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
              Status Open
              <button
                onClick={() => setStatusFilter('all')}
                className="ml-0.5 text-slate-400 hover:text-rose-500"
              >
                <X size={10} />
              </button>
            </span>
          )}
          {groupFilter && (
            <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
              Group: {groupFilter}
              <button
                onClick={() => { setGroupFilter(''); setPage(1); }}
                className="ml-0.5 text-slate-400 hover:text-rose-500"
              >
                <X size={10} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr>
              {/* Checkbox */}
              <th className="border-b border-r border-slate-200 bg-white px-3 py-2 w-9">
                <input
                  type="checkbox"
                  checked={pageRows.length > 0 && selected.size === pageRows.length}
                  onChange={toggleAll}
                  className="accent-blue-600"
                />
              </th>
              <SortTh label="Number" col="sku" />
              <SortTh label="Name" col="name" className="min-w-[200px]" />
              <th className="border-b border-r border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Group
              </th>
              <SortTh label="Sales price" col="price" align="right" />
              <SortTh label="Cost price"  col="cost"  align="right" />
              <SortTh label="In stock"    col="stock" align="right" />
              <th className="border-b border-r border-slate-200 bg-white px-3 py-2 text-right text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                In order
              </th>
              <th className="border-b border-r border-slate-200 bg-white px-3 py-2 text-right text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Available
              </th>
              <th className="border-b border-r border-slate-200 bg-white px-3 py-2 text-right text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Purchased
              </th>
              {/* Actions column */}
              <th className="border-b border-slate-200 bg-white px-2 py-2 w-10" />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-10 text-center text-[13px] text-slate-400">
                  No products match these filters.
                </td>
              </tr>
            ) : (
              pageRows.map((p) => {
                const inOrder  = p.inOrder ?? 0;
                const available = p.stock - inOrder;
                const purchased = p.purchased ?? 0;
                const isLow = p.trackStock && p.stock > 0 && p.stock <= p.lowStockAt;
                const isOut = p.trackStock && p.stock === 0;
                const img = p.images?.[0];

                return (
                  <tr
                    key={p.id}
                    className={cn(
                      'group transition-colors hover:bg-blue-50/20',
                      p.archived && 'opacity-50',
                      selected.has(p.id) && 'bg-blue-50/40',
                    )}
                  >
                    {/* Checkbox */}
                    <td className="border-r border-slate-100 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleRow(p.id)}
                        className="accent-blue-600"
                      />
                    </td>

                    {/* Number */}
                    <td className="border-r border-slate-100 px-3 py-2">
                      <Link
                        href={`/products/${p.id}`}
                        className="text-[12px] font-medium text-blue-600 hover:underline"
                      >
                        {p.sku ?? p.id.slice(-6).toUpperCase()}
                      </Link>
                    </td>

                    {/* Name */}
                    <td className="border-r border-slate-100 px-3 py-2">
                      <div className="flex items-center gap-2">
                        {img ? (
                          <div className="h-7 w-7 shrink-0 overflow-hidden rounded border border-slate-200">
                            <Image
                              src={img}
                              alt=""
                              width={28}
                              height={28}
                              className="h-7 w-7 object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50">
                            <Package size={12} className="text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/products/${p.id}`}
                            className="block truncate text-[12px] font-semibold text-slate-800 hover:text-blue-600"
                          >
                            {p.name}
                          </Link>
                          {p.nafdacNumber && (
                            <span className="text-[10px] text-emerald-600">
                              NAFDAC {p.nafdacNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Group */}
                    <td className="border-r border-slate-100 px-3 py-2">
                      <span className="text-[12px] text-slate-600">
                        {p.group ?? <span className="text-slate-300">—</span>}
                      </span>
                    </td>

                    {/* Sales price */}
                    <td className="border-r border-slate-100 px-3 py-2 text-right tabular-nums">
                      <span className="text-[12px] text-slate-700">{fmtNum(p.price)}</span>
                    </td>

                    {/* Cost price */}
                    <td className="border-r border-slate-100 px-3 py-2 text-right tabular-nums">
                      {p.cost != null ? (
                        <span className="text-[12px] text-slate-700">{fmtNum(p.cost)}</span>
                      ) : (
                        <span className="text-[12px] text-slate-300">0.00</span>
                      )}
                    </td>

                    {/* In stock */}
                    <td className="border-r border-slate-100 px-3 py-2 text-right tabular-nums">
                      {p.trackStock ? (
                        <span
                          className={cn(
                            'text-[12px] font-medium',
                            isOut ? 'text-rose-500' : isLow ? 'text-amber-600' : 'text-slate-700',
                          )}
                        >
                          {fmtNum(p.stock)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* In order */}
                    <td className="border-r border-slate-100 px-3 py-2 text-right tabular-nums">
                      <span className="text-[12px] text-slate-500">{fmtNum(inOrder)}</span>
                    </td>

                    {/* Available */}
                    <td className="border-r border-slate-100 px-3 py-2 text-right tabular-nums">
                      {p.trackStock ? (
                        <span
                          className={cn(
                            'text-[12px]',
                            available < 0 ? 'font-semibold text-rose-500' : 'text-slate-700',
                          )}
                        >
                          {fmtNum(available)}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Purchased */}
                    <td className="border-r border-slate-100 px-3 py-2 text-right tabular-nums">
                      <span className="text-[12px] text-slate-500">{fmtNum(purchased)}</span>
                    </td>

                    {/* Row actions */}
                    <td className="px-2 py-1.5">
                      <RowActions
                        id={p.id}
                        archived={p.archived}
                        onArchive={() => archiveProduct(p.id, p.archived)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination footer ── */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
        <span className="text-[11px] text-slate-500">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
          {statusFilter === 'open' ? ' · active only' : ''}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition"
            >
              Prev
            </button>
            <span className="px-1 text-[11px] text-slate-500">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
