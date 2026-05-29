'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Box, Download, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MovementRow {
  id: string;
  date: string;
  itemName: string;
  itemHref: string;
  itemType: string;
  reason: string;
  delta: number;
  balanceAfter: number;
  unit: string;
  createdByName: string;
  status: string;
}

interface Props {
  rows: MovementRow[];
}

const REASON_LABELS: Record<string, string> = {
  PURCHASE_RECEIVE: 'Purchase receive',
  PRODUCTION_CONSUME: 'Production consume',
  PRODUCTION_PRODUCE: 'Production produce',
  SALE: 'Sale',
  ADJUSTMENT: 'Adjustment',
  WRITE_OFF: 'Write-off',
  RETURN: 'Return',
  TRANSFER: 'Transfer',
};

export function MovementsTable({ rows }: Props) {
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productQ, setProductQ] = useState('');
  const [userQ, setUserQ] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo + 'T23:59:59') return false;
      if (productQ && !r.itemName.toLowerCase().includes(productQ.toLowerCase())) return false;
      if (userQ && !r.createdByName.toLowerCase().includes(userQ.toLowerCase())) return false;
      return true;
    });
  }, [rows, status, dateFrom, dateTo, productQ, userQ]);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
            >
              <option value="">Draft</option>
              <option value="Posted">Posted</option>
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
                className="h-8 w-36 rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">User</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={userQ}
                onChange={(e) => setUserQ(e.target.value)}
                placeholder=""
                className="h-8 w-36 rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16">
            <Box size={40} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No movements found.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download size={14} /> Import
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700"
              >
                <Plus size={14} /> Create new
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600">
                  <th className="w-8 px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </th>
                  <th className="min-w-[100px] px-4 py-3">Date</th>
                  <th className="min-w-[180px] px-4 py-3">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Δ Qty</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
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
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">
                        {row.itemType.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {REASON_LABELS[row.reason] ?? row.reason.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          'font-mono font-semibold',
                          row.delta > 0 ? 'text-success-600' : 'text-rose-600',
                        )}
                      >
                        {row.delta > 0 ? '+' : ''}
                        {row.delta}
                        {row.unit ? ` ${row.unit}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {row.balanceAfter}
                      {row.unit ? ` ${row.unit}` : ''}
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
