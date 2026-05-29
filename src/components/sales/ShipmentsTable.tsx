'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Box, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ShipmentRow {
  id: string;
  number: string;
  customerName: string;
  customerId: string | null;
  orderNumber: string;
  orderId: string;
  deliveryResponsible: string;
  picked: string;
  sent: string;
}

interface Props {
  rows: ShipmentRow[];
}

function pickedBadge(s: string) {
  if (s === 'Picked')
    return (
      <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-semibold text-success-700">
        Picked
      </span>
    );
  return (
    <span className="rounded-full bg-owed-100 px-2 py-0.5 text-[11px] font-semibold text-owed-700">
      Not picked
    </span>
  );
}

function sentBadge(s: string) {
  if (s === 'Shipped')
    return (
      <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-semibold text-success-700">
        Shipped
      </span>
    );
  return <span className="text-[11px] text-slate-400">Not shipped</span>;
}

export function ShipmentsTable({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [sentFilter, setSentFilter] = useState('Not shipped');

  const filtered = useMemo(() => {
    let out = rows;
    if (sentFilter && sentFilter !== 'All') out = out.filter((r) => r.sent === sentFilter);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.orderNumber.toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, search, sentFilter]);

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
            placeholder="Search…"
            className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
          />
        </div>
        <select className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-600 outline-none">
          <option>Customer</option>
        </select>
        <select className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-600 outline-none">
          <option>Order</option>
        </select>
        <select
          value={sentFilter}
          onChange={(e) => setSentFilter(e.target.value)}
          className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-600 outline-none"
        >
          <option>Not shipped</option>
          <option>Shipped</option>
          <option>All</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16">
            <Box size={40} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No shipments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[12px] font-semibold text-slate-600">
                  <th className="w-8 px-4 py-3">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </th>
                  <th className="min-w-[100px] px-4 py-3 cursor-pointer hover:text-slate-900">
                    Number ↕
                  </th>
                  <th className="min-w-[160px] px-4 py-3 cursor-pointer hover:text-slate-900">
                    Customer ↕
                  </th>
                  <th className="min-w-[140px] px-4 py-3">Order / Invoice</th>
                  <th className="min-w-[160px] px-4 py-3">Delivery responsible</th>
                  <th className="min-w-[120px] px-4 py-3">Picked</th>
                  <th className="min-w-[120px] px-4 py-3">Sent</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-medium text-brand-700">
                        {row.number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.customerId ? (
                        <Link
                          href={`/customers/${row.customerId}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {row.customerName}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-700">{row.customerName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${row.orderId}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {row.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.deliveryResponsible}</td>
                    <td className="px-4 py-3">{pickedBadge(row.picked)}</td>
                    <td className="px-4 py-3">{sentBadge(row.sent)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
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
