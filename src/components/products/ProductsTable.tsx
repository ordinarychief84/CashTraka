'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Check,
  Package,
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  Archive,
  Plus,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
};

type SortKey = 'id' | 'name' | 'group' | 'sku' | 'price' | 'stock';

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [skuQ, setSkuQ] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [busy, setBusy] = useState<string | null>(null);

  // Derive distinct group options from data
  const groupOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.group ?? 'Default').filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const skuQl = skuQ.trim().toLowerCase();
    const grpQl = groupFilter.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!showInactive && r.archived) return false;
      if (ql && !r.name.toLowerCase().includes(ql)) return false;
      if (skuQl) {
        const eanVal = (r.barcodeValue ?? r.sku ?? '').toLowerCase();
        if (!eanVal.includes(skuQl)) return false;
      }
      if (grpQl) {
        const g = (r.group ?? 'Default').toLowerCase();
        if (!g.includes(grpQl)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'id':    return a.id.localeCompare(b.id) * dir;
        case 'group': return (a.group ?? '').localeCompare(b.group ?? '') * dir;
        case 'sku':   return (a.sku ?? '').localeCompare(b.sku ?? '') * dir;
        case 'price': return (a.price - b.price) * dir;
        case 'stock': return (a.stock - b.stock) * dir;
        default:      return a.name.localeCompare(b.name) * dir;
      }
    });
  }, [rows, q, skuQ, groupFilter, showInactive, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  }

  async function archiveProduct(id: string) {
    if (!confirm('Archive this product? Sales history is preserved.')) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Product archived'); router.refresh(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d?.error || 'Could not archive'); }
    } finally { setBusy(null); }
  }

  async function bumpStock(id: string, delta: number) {
    setBusy(id + delta);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockDelta: delta }),
      });
      if (res.ok) { toast.success(delta > 0 ? 'Stock +1' : 'Stock -1'); router.refresh(); }
      else { const d = await res.json().catch(() => ({})); toast.error(d?.error || 'Could not adjust'); }
    } finally { setBusy(null); }
  }

  const activeCount  = rows.filter((r) => !r.archived).length;
  const total = rows.filter((r) => showInactive || !r.archived).length;

  return (
    <div className="card overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <p className="text-sm text-slate-500">
          Showing{' '}
          <span className="font-semibold text-ink">{filtered.length}</span>
          {' '}–{' '}
          <span className="font-semibold text-ink">{total}</span> of{' '}
          <span className="font-semibold text-ink">{activeCount}</span> items
        </p>
        <div className="flex items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="sr-only peer"
            />
            <span className="relative inline-block h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-brand-500">
              <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition duration-150 peer-checked:translate-x-4" />
            </span>
            Show inactive products
          </label>
        </div>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <colgroup>
            <col style={{ width: '90px' }} />
            <col style={{ width: '72px' }} />
            <col style={{ width: '140px' }} />
            <col />
            <col style={{ width: '130px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '68px' }} />
            <col style={{ width: '110px' }} />
          </colgroup>

          <thead>
            {/* Column headers */}
            <tr className="border-b border-border bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <SortTh label="Product ID" sortKey="id" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-2.5">Image</th>
              <SortTh label="Product group" sortKey="group" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="Name" sortKey="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortTh label="EAN / SKU" sortKey="sku" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-2.5">Additional names</th>
              <th className="px-3 py-2.5 text-center">Active</th>
              <th className="px-3 py-2.5" />
            </tr>

            {/* Inline filter row */}
            <tr className="border-b border-border bg-white">
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full rounded border border-border bg-white px-2 py-1 text-xs text-slate-600"
                >
                  <option value="">Choose group…</option>
                  {groupOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1.5">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name…"
                  className="w-full rounded border border-border bg-white px-2 py-1 text-xs"
                />
              </td>
              <td className="px-2 py-1.5">
                <input
                  value={skuQ}
                  onChange={(e) => setSkuQ(e.target.value)}
                  placeholder="EAN / SKU…"
                  className="w-full rounded border border-border bg-white px-2 py-1 text-xs"
                />
              </td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5">
                <select
                  onChange={(e) => {
                    if (e.target.value === 'inactive') setShowInactive(true);
                    else setShowInactive(false);
                  }}
                  className="w-full rounded border border-border bg-white px-1 py-1 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </td>
              <td className="px-2 py-1.5" />
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {filtered.map((p) => {
              const isLow = p.trackStock && p.stock <= p.lowStockAt;
              const img = p.images?.[0];
              const ean = p.barcodeValue ?? p.sku;
              const additionalName = p.description
                ? p.description.slice(0, 40) + (p.description.length > 40 ? '…' : '')
                : p.sku && p.barcodeValue
                  ? p.sku
                  : null;

              return (
                <tr
                  key={p.id}
                  className={cn(
                    'group transition-colors hover:bg-slate-50',
                    p.archived && 'opacity-60',
                  )}
                >
                  {/* ID */}
                  <td className="px-3 py-2.5 align-middle">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                    >
                      {p.id.slice(-7).toUpperCase()}
                    </Link>
                  </td>

                  {/* Image */}
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-slate-50">
                      {img ? (
                        <Image
                          src={img}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 object-cover"
                          unoptimized
                        />
                      ) : (
                        <Package size={16} className="text-slate-300" />
                      )}
                    </div>
                  </td>

                  {/* Product group */}
                  <td className="px-3 py-2.5 align-middle">
                    {p.group ? (
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                        {p.group}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-3 py-2.5 align-middle">
                    <Link
                      href={`/products/${p.id}`}
                      className="block font-semibold text-ink hover:text-brand-700"
                    >
                      {p.name}
                    </Link>
                    {p.nafdacNumber && (
                      <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        NAFDAC {p.nafdacNumber}
                      </span>
                    )}
                    {p.trackStock && (
                      <span
                        className={cn(
                          'mt-0.5 block text-[10px] font-semibold',
                          isLow ? 'text-rose-600' : p.stock === 0 ? 'text-slate-400' : 'text-emerald-600',
                        )}
                      >
                        {p.stock} in stock{isLow ? ' · Low' : ''}
                      </span>
                    )}
                  </td>

                  {/* EAN / SKU */}
                  <td className="px-3 py-2.5 align-middle">
                    {ean ? (
                      <span className="font-mono text-xs text-slate-600">{ean}</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  {/* Additional names / description */}
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-500">
                    {additionalName ?? <span className="text-slate-300">—</span>}
                  </td>

                  {/* Active */}
                  <td className="px-3 py-2.5 align-middle text-center">
                    {p.archived ? (
                      <span className="text-[10px] font-semibold text-slate-400">Inactive</span>
                    ) : (
                      <Check size={16} className="mx-auto text-emerald-500" />
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5 align-middle">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <ActionBtn
                        title="View"
                        onClick={() => router.push(`/products/${p.id}`)}
                      >
                        <Eye size={14} />
                      </ActionBtn>
                      <ActionBtn
                        title="Edit"
                        onClick={() => router.push(`/products/${p.id}/edit`)}
                      >
                        <Pencil size={14} />
                      </ActionBtn>
                      {p.trackStock && (
                        <>
                          <ActionBtn title="+1 stock" onClick={() => bumpStock(p.id, 1)} disabled={busy === p.id + 1}>
                            <Plus size={14} />
                          </ActionBtn>
                          <ActionBtn title="-1 stock" onClick={() => bumpStock(p.id, -1)} disabled={busy === p.id + -1}>
                            <Minus size={14} />
                          </ActionBtn>
                        </>
                      )}
                      <ActionBtn
                        title="Archive"
                        danger
                        onClick={() => archiveProduct(p.id)}
                        disabled={busy === p.id}
                      >
                        <Archive size={14} />
                      </ActionBtn>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                  No products match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <ul className="divide-y divide-border md:hidden">
        {filtered.map((p) => {
          const isLow = p.trackStock && p.stock <= p.lowStockAt;
          const img = p.images?.[0];
          return (
            <li key={p.id} className={cn('flex items-start gap-3 px-4 py-3', p.archived && 'opacity-60')}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-slate-50">
                {img ? (
                  <Image src={img} alt="" width={48} height={48} className="h-12 w-12 object-cover" unoptimized />
                ) : (
                  <Package size={18} className="text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${p.id}`} className="block truncate font-semibold text-ink">
                  {p.name}
                </Link>
                <div className="text-xs text-slate-500">
                  {p.group ?? '—'}
                  {p.sku ? ` · ${p.sku}` : ''}
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {p.trackStock && (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
                      isLow ? 'bg-rose-50 text-rose-700' : p.stock === 0 ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700')}>
                      {p.stock} in stock
                    </span>
                  )}
                  {!p.archived && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <ActionBtn title="Edit" onClick={() => router.push(`/products/${p.id}/edit`)}>
                  <Pencil size={14} />
                </ActionBtn>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-slate-400">No products match these filters.</li>
        )}
      </ul>
    </div>
  );
}

/* ── Sort-able column header ── */
function SortTh({
  label,
  sortKey,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sortBy: SortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}) {
  const active = sortBy === sortKey;
  return (
    <th className="px-3 py-2.5">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide transition-colors hover:text-ink',
          active ? 'text-brand-700' : 'text-slate-500',
        )}
      >
        {label}
        <span className="ml-0.5 opacity-60">
          {active ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronUp size={11} className="opacity-30" />}
        </span>
      </button>
    </th>
  );
}

/* ── Inline action button ── */
function ActionBtn({
  children,
  title,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-md border transition-colors disabled:opacity-40',
        danger
          ? 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'border-border bg-white text-slate-500 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
      )}
    >
      {children}
    </button>
  );
}
