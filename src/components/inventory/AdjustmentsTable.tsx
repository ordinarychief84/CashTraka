'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Box, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdjustmentRow {
  id: string;
  adjustNumber: string;
  date: string;
  itemName: string;
  itemHref: string;
  reason: string;
  delta: number;
  notes: string | null;
  createdByName: string;
  status: string;
  category: string | null;
  location: string | null;
}

interface Props {
  rows: AdjustmentRow[];
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function SearchInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</label>
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? ''}
          className="h-8 w-36 rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
        />
      </div>
    </div>
  );
}

export function AdjustmentsTable({ rows }: Props) {
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productQ, setProductQ] = useState('');
  const [userQ, setUserQ] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo + 'T23:59:59') return false;
      if (productQ && !r.itemName.toLowerCase().includes(productQ.toLowerCase())) return false;
      if (userQ && !r.createdByName.toLowerCase().includes(userQ.toLowerCase())) return false;
      if (location && r.location !== location) return false;
      if (category && r.category !== category) return false;
      return true;
    });
  }, [rows, status, dateFrom, dateTo, productQ, userQ, location, category]);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={['Draft', 'Posted']}
            placeholder="Draft"
          />
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
          <SearchInput label="Product" value={productQ} onChange={setProductQ} placeholder="" />
          <SearchInput label="User" value={userQ} onChange={setUserQ} placeholder="" />
          <FilterSelect
            label="Location"
            value={location}
            onChange={setLocation}
            options={['Default Warehouse']}
            placeholder="Select location"
          />
          <FilterSelect
            label="Adjustment category"
            value={category}
            onChange={setCategory}
            options={['Write-off', 'Return', 'Correction', 'Other']}
            placeholder="Select adjustment catego..."
          />
        </div>
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
                <th className="min-w-[130px] px-4 py-3">Number</th>
                <th className="min-w-[100px] px-4 py-3">Date</th>
                <th className="min-w-[180px] px-4 py-3">Product</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Δ Qty</th>
                <th className="px-4 py-3">User</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Box size={36} className="text-slate-300" />
                      <span className="text-sm text-slate-400">None found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-brand-700">{row.adjustNumber}</span>
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
                    <td className="px-4 py-3 text-slate-600">{row.reason}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'font-mono font-semibold',
                          row.delta > 0 ? 'text-success-600' : 'text-rose-600',
                        )}
                      >
                        {row.delta > 0 ? '+' : ''}
                        {row.delta}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.createdByName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" className="text-slate-400 hover:text-brand-600" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="text-slate-400 hover:text-rose-500" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
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
