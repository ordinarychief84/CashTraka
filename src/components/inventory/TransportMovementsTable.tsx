'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Box, Plus, Upload } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface TransportRow {
  id: string;
  transferNumber: string;
  date: string;
  itemName: string;
  itemHref: string;
  fromLocation: string;
  toLocation: string;
  status: string;
  createdByName: string;
  notes: string | null;
}

interface Props {
  rows: TransportRow[];
  tab: 'movements' | 'receipts';
}

const STATUSES = ['Not received', 'Partially received', 'Received', 'Cancelled'];

export function TransportMovementsTable({ rows, tab }: Props) {
  const router = useRouter();
  const [archived, setArchived] = useState('All');
  const [status, setStatus] = useState('Not received');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productQ, setProductQ] = useState('');
  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (archived === 'Archived') return false; // simplified; no archived field yet
      if (status && r.status !== status) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo + 'T23:59:59') return false;
      if (productQ && !r.itemName.toLowerCase().includes(productQ.toLowerCase())) return false;
      if (fromLoc && r.fromLocation !== fromLoc) return false;
      if (toLoc && r.toLocation !== toLoc) return false;
      return true;
    });
  }, [rows, archived, status, dateFrom, dateTo, productQ, fromLoc, toLoc]);

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => router.push('/inventory/transfers')}
          className={cn(
            'px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors',
            tab === 'movements'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-600 hover:text-ink hover:border-slate-300',
          )}
        >
          Transport movements
        </button>
        <button
          type="button"
          onClick={() => router.push('/inventory/receipts')}
          className={cn(
            'px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors',
            tab === 'receipts'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-600 hover:text-ink hover:border-slate-300',
          )}
        >
          Receipts
        </button>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Archived</label>
            <select
              value={archived}
              onChange={(e) => setArchived(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            >
              <option>All</option>
              <option>Archived</option>
              <option>Not archived</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Date from</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Date to</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Product</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={productQ}
                onChange={(e) => setProductQ(e.target.value)}
                placeholder=""
                className="h-8 w-32 rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">From</label>
            <select
              value={fromLoc}
              onChange={(e) => setFromLoc(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            >
              <option value="">Select location</option>
              <option>Default Warehouse</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">To</label>
            <select
              value={toLoc}
              onChange={(e) => setToLoc(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            >
              <option value="">Select location</option>
              <option>Default Warehouse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table / empty state */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-20">
            <Box size={44} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No transport movements found</p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={14} /> Create
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600">
                  <th className="w-8 px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </th>
                  <th className="min-w-[130px] px-4 py-3">Number</th>
                  <th className="min-w-[100px] px-4 py-3">Date</th>
                  <th className="min-w-[160px] px-4 py-3">Item</th>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-brand-700">{row.transferNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(row.date).toLocaleDateString('en-NG', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={row.itemHref} className="font-medium text-brand-700 hover:underline">
                        {row.itemName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.fromLocation || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.toLocation || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          row.status === 'Received'
                            ? 'bg-emerald-100 text-emerald-700'
                            : row.status === 'Not received'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.createdByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
