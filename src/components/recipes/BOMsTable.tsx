'use client';

import Link from 'next/link';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreHorizontal, X, Filter, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKobo } from '@/lib/format';

export interface BOMRow {
  id: string;
  number: string;
  name: string;
  group: string;
  salesPrice: number; // kobo
  costPrice: number;  // kobo
  inStock: number;
  inOrder: number;
  available: number;
  inProduction: number;
  hasRecipe: boolean;
  recipeYield: number | null;
  images: string[];
}

interface Props {
  rows: BOMRow[];
}

function Num({ v }: { v: number }) {
  const color = v < 0 ? 'text-red-600' : v === 0 ? 'text-slate-400' : 'text-slate-800';
  return <span className={`num ${color}`}>{v.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>;
}

function RowActions({ id, name }: { id: string; name: string }) {
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

  const items = [
    { label: 'Edit BOM', onClick: () => router.push(`/recipes/${id}`) },
    { label: 'Edit product', onClick: () => router.push(`/products/${id}/edit`) },
    { label: 'Adjust inventory', onClick: () => router.push(`/inventory/adjustments?product=${id}`) },
    { label: 'View movements', onClick: () => router.push(`/inventory/movements?product=${id}`) },
  ];

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
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { setOpen(false); item.onClick(); }}
              className="block w-full px-4 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BOMsTable({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'missing'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => Array.from(new Set(rows.map((r) => r.group).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.number.toLowerCase().includes(q) || r.group.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && r.hasRecipe) ||
        (statusFilter === 'missing' && !r.hasRecipe);
      return matchSearch && matchStatus;
    });
  }, [rows, search, statusFilter]);

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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
        >
          <Filter size={12} />
          Filters
        </button>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="By number & name"
            className="h-8 rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex items-center gap-1 ml-1">
          {(['all', 'active', 'missing'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setStatusFilter(v)}
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize transition-colors',
                statusFilter === v
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
              )}
            >
              {v === 'all' ? 'All' : v === 'active' ? '✓ Has BOM' : '⚠ Missing BOM'}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-slate-500">{selected.size} selected</span>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
            >
              Bulk actions
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-[13px]">
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
              <th className="w-8 px-1 py-2.5" />
              <th className="px-3 py-2.5">Number</th>
              <th className="min-w-[200px] px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Group</th>
              <th className="px-3 py-2.5 text-right">Sales price</th>
              <th className="px-3 py-2.5 text-right">Cost price</th>
              <th className="px-3 py-2.5 text-right">In stock</th>
              <th className="px-3 py-2.5 text-right">In order</th>
              <th className="px-3 py-2.5 text-right">Available</th>
              <th className="px-3 py-2.5 text-right">In production</th>
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-6 py-10 text-center text-sm text-slate-400">
                  No products found
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
                  <td className="px-1 py-2.5">
                    {/* Thumbnail / BOM status icon */}
                    {row.images[0] ? (
                      <img src={row.images[0]} alt="" className="h-7 w-7 rounded object-cover" />
                    ) : (
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded',
                        row.hasRecipe ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500',
                      )}>
                        {row.hasRecipe
                          ? <CheckCircle2 size={14} />
                          : <AlertTriangle size={14} />}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/recipes/${row.id}`} className="font-mono text-[12px] text-brand-700 hover:underline">
                      {row.number || '—'}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/recipes/${row.id}`} className="block font-semibold text-ink hover:text-brand-700">
                      {row.name}
                    </Link>
                    <span className="text-[11px] text-slate-400">
                      {row.hasRecipe
                        ? `Yield: ${row.recipeYield ?? 1} per batch`
                        : 'No BOM yet'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500">{row.group || '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Num v={row.salesPrice / 100} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-slate-500">
                      <Num v={row.costPrice / 100} />
                      {!row.hasRecipe && <span className="ml-0.5 text-[10px] text-amber-400">*</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Num v={row.inStock} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Num v={row.inOrder} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Num v={row.available} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Num v={row.inProduction} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <RowActions id={row.id} name={row.name} />
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
