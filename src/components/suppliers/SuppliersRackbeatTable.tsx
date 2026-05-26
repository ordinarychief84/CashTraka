'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SupplierRackbeatRow {
  id: string;
  number: number;
  name: string;
  vatNo: string | null;
  email: string | null;
  status: string;
}

interface Props {
  rows: SupplierRackbeatRow[];
}

export function SuppliersRackbeatTable({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    let out = rows;
    if (status) out = out.filter((r) => r.status === status);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          String(r.number).includes(q) ||
          (r.email ?? '').toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, search, status]);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50"
        >
          Filters ▾
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="By number &amp; name"
            className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
        >
          <option value="">Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <select
          className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
        >
          <option value="">Supplier group</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600">
                <th className="w-8 px-4 py-3">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="min-w-[110px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Number ↕
                </th>
                <th className="min-w-[200px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Supplier name ↕
                </th>
                <th className="min-w-[140px] px-4 py-3">VAT no.</th>
                <th className="min-w-[200px] px-4 py-3">E-mail</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-400">
                    No suppliers found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/suppliers/${row.id}`}
                        className="font-mono text-[12px] font-medium text-brand-700 hover:underline"
                      >
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/suppliers/${row.id}`}
                        className="font-medium text-slate-800 hover:text-brand-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.vatNo ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
