'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKobo } from '@/lib/format';

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  group: string;
  location: string;
  dateJoined: string;
  totalSalesKobo: number;
  outstandingKobo: number;
  status: string; // ACTIVE | INACTIVE | BLOCKED | PROSPECT
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [group, setGroup] = useState('');

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.group) set.add(r.group);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const digits = ql.replace(/\D/g, '');
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (group && r.group !== group) return false;
      if (ql) {
        const hay = [r.name, r.email ?? '', r.location].join(' ').toLowerCase();
        if (!hay.includes(ql) && !(digits && r.phone.includes(digits))) {
          return false;
        }
      }
      return true;
    });
  }, [rows, q, status, group]);

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
            placeholder="Search by customer name, phone, email..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
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
          <option value="BLOCKED">Blocked</option>
          <option value="PROSPECT">Prospect</option>
        </select>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Contact</th>
                <th className="px-3 py-2.5">Group</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="px-3 py-2.5">Date Joined</th>
                <th className="px-3 py-2.5 text-right">Total Sales</th>
                <th className="px-3 py-2.5 text-right">Outstanding</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 align-middle">
                    <Link
                      href={`/customers/${r.id}`}
                      className="flex items-center gap-2.5 hover:opacity-90"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                        <Users size={14} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {r.name}
                        </div>
                        {r.email && (
                          <div className="truncate text-[10px] text-slate-500">
                            {r.email}
                          </div>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.phone}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.group || '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.location || '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {fmtDate(r.dateJoined)}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right num text-sm font-semibold text-ink">
                    {formatKobo(r.totalSalesKobo)}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 align-middle text-right num text-xs font-semibold',
                      r.outstandingKobo > 0 ? 'text-rose-700' : 'text-slate-400',
                    )}
                  >
                    {r.outstandingKobo > 0 ? formatKobo(r.outstandingKobo) : '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge status={r.status} />
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
                    No customers match these filters.
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
              href={`/customers/${r.id}`}
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
                <div className="truncate text-[11px] text-slate-500">
                  {r.phone}
                  {r.group ? ` · ${r.group}` : ''}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{r.location || '—'}</span>
                  <span className="num font-semibold text-ink">
                    {formatKobo(r.totalSalesKobo)}
                  </span>
                </div>
                {r.outstandingKobo > 0 && (
                  <div className="mt-0.5 text-[11px] font-semibold text-rose-700">
                    Outstanding {formatKobo(r.outstandingKobo)}
                  </div>
                )}
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No customers match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
