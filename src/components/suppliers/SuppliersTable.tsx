'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Search, MoreHorizontal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKobo } from '@/lib/format';

export type SupplierRow = {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  status: string;
  totalSpendKobo: number;
  lastPurchaseAt: string | null;
  onTimeDeliveryRating: number | null; // 0–100
  qualityRating: number | null; // 0–100
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Render 5 stars filled in proportion to a 0–100 rating. */
function StarRow({ rating }: { rating: number | null }) {
  if (rating == null) {
    return <span className="text-[10px] text-slate-400">—</span>;
  }
  const value = Math.max(0, Math.min(5, rating / 20));
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < Math.round(value);
        return (
          <Star
            key={i}
            size={11}
            className={filled ? 'fill-owed-500 text-owed-500' : 'text-slate-300'}
          />
        );
      })}
      <span className="num ml-1 text-[10px] font-semibold text-slate-600">
        {value.toFixed(1)}
      </span>
    </span>
  );
}

/**
 * Suppliers list table with star ratings for quality and on-time delivery.
 * Search + status filter, client-side.
 */
export function SuppliersTable({ rows }: { rows: SupplierRow[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.category) set.add(r.category);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (category && r.category !== category) return false;
      if (ql) {
        const hay = [r.name, r.contactPerson ?? '', r.phone ?? '', r.email ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, status, category]);

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-2 border-b border-border bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search suppliers by name, contact or phone..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLACKLISTED">Blacklisted</option>
        </select>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Contact</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Total Spend</th>
                <th className="px-3 py-2.5">Last Purchase</th>
                <th className="px-3 py-2.5">On-time</th>
                <th className="px-3 py-2.5">Quality</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 align-middle">
                    <Link
                      href={`/suppliers/${r.id}`}
                      className="flex items-center gap-2.5 hover:opacity-90"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                        <Users size={14} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {r.name}
                        </div>
                        {r.contactPerson && (
                          <div className="text-[10px] text-slate-500">
                            {r.contactPerson}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.category ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.phone || r.email || '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right num text-xs font-semibold text-ink">
                    {formatKobo(r.totalSpendKobo)}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {fmt(r.lastPurchaseAt)}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <span
                      className={cn(
                        'num text-xs font-semibold',
                        r.onTimeDeliveryRating == null
                          ? 'text-slate-400'
                          : r.onTimeDeliveryRating >= 80
                            ? 'text-success-700'
                            : r.onTimeDeliveryRating >= 50
                              ? 'text-owed-700'
                              : 'text-rose-700',
                      )}
                    >
                      {r.onTimeDeliveryRating == null
                        ? '—'
                        : `${r.onTimeDeliveryRating}%`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StarRow rating={r.qualityRating} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right">
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No suppliers match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link
              href={`/suppliers/${r.id}`}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                <Users size={16} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-[11px] text-slate-500">
                  {r.category ?? '—'}
                  {r.phone ? ` · ${r.phone}` : ''}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <StarRow rating={r.qualityRating} />
                  <span className="num font-semibold text-ink">
                    {formatKobo(r.totalSpendKobo)}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No suppliers match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
