'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SupplierInvoiceRow {
  id: string;
  number: string;
  invoiceType: string;
  dueDate: string | null;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string | null;
  supplierName: string;
  heading: string;
  booked: string;
  received: string;
  totalKobo: number;
}

interface Props {
  rows: SupplierInvoiceRow[];
}

function bookedBadge(booked: string) {
  if (booked === 'Booked')
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Booked
      </span>
    );
  return <span className="text-[11px] text-slate-400">Draft</span>;
}

function receivedBadge(received: string) {
  switch (received) {
    case 'Received':
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Received
        </span>
      );
    case 'See order':
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          See order
        </span>
      );
    default:
      return <span className="text-[11px] text-slate-400">Not received</span>;
  }
}

function formatAmount(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function SupplierInvoicesTable({ rows }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.purchaseOrderNumber.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalAmount = filtered.reduce((s, r) => s + r.totalKobo, 0);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
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
                <th className="min-w-[100px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Number ↕
                </th>
                <th className="min-w-[110px] px-4 py-3">Invoice type</th>
                <th className="min-w-[120px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Due date ↕
                </th>
                <th className="min-w-[130px] px-4 py-3">Purchase order</th>
                <th className="min-w-[160px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Supplier ↕
                </th>
                <th className="min-w-[200px] px-4 py-3">Heading</th>
                <th className="px-4 py-3">Booked</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900">
                  Total ↕
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-14 text-center text-sm text-slate-400">
                    No supplier invoices found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-medium text-brand-700">
                        {row.number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.invoiceType}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(row.dueDate)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/purchase-orders/${row.purchaseOrderId}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {row.purchaseOrderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {row.supplierId ? (
                        <Link
                          href={`/suppliers/${row.supplierId}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {row.supplierName}
                        </Link>
                      ) : (
                        <span className="text-slate-600">{row.supplierName}</span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-500">
                      {row.heading || '—'}
                    </td>
                    <td className="px-4 py-3">{bookedBadge(row.booked)}</td>
                    <td className="px-4 py-3">{receivedBadge(row.received)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatAmount(row.totalKobo)}
                    </td>
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
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/50">
                  <td colSpan={9} />
                  <td className="px-4 py-2.5 text-right text-[12px] font-bold text-slate-700">
                    {formatAmount(totalAmount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
