'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MoreHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrderRackbeatRow {
  id: string;
  number: string;
  customerName: string;
  customerId: string | null;
  orderStatus: string;
  deliveryStatus: string;
  invoiceStatus: string;
  deliveryDate: string | null;
  totalKobo: number;
}

interface Props {
  rows: OrderRackbeatRow[];
}

function orderStatusBadge(s: string) {
  const upper = s.toUpperCase();
  if (['CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED'].includes(upper))
    return (
      <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-semibold text-success-700">
        Confirmed
      </span>
    );
  if (upper === 'CANCELLED')
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
        Cancelled
      </span>
    );
  return <span className="text-[11px] text-slate-400">Draft</span>;
}

function deliveryStatusBadge(s: string) {
  switch (s) {
    case 'Shipped':
      return (
        <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-semibold text-success-700">
          Shipped
        </span>
      );
    case 'Ready for shipping':
      return (
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
          Ready for shipping
        </span>
      );
    default:
      return <span className="text-[11px] text-slate-400">Not shipped</span>;
  }
}

function invoiceStatusBadge(s: string) {
  switch (s) {
    case 'Ready for invoicing':
      return (
        <span className="rounded-full bg-owed-100 px-2 py-0.5 text-[11px] font-semibold text-owed-700">
          Ready for invoicing
        </span>
      );
    case 'Invoiced':
      return (
        <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-semibold text-success-700">
          Invoiced
        </span>
      );
    default:
      return <span className="text-[11px] text-slate-400">Not invoiced</span>;
  }
}

function fmtDate(iso: string | null, overdue = false) {
  if (!iso) return <span className="text-slate-400">—</span>;
  const label = new Date(iso).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return overdue ? (
    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
      {label}
    </span>
  ) : (
    <span className="text-slate-600">{label}</span>
  );
}

function fmtAmount(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

export function OrdersRackbeatTable({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.number.toLowerCase().includes(q) || r.customerName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalAmount = filtered.reduce((s, r) => s + r.totalKobo, 0);

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
        <select className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-600 outline-none">
          <option>Product</option>
        </select>
        <select className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-600 outline-none">
          <option>Employee</option>
        </select>
        <select className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-600 outline-none">
          <option>Not archived</option>
          <option>All</option>
          <option>Archived</option>
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
                <th className="w-8 px-3 py-3" />
                <th className="min-w-[110px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Number ↕
                </th>
                <th className="min-w-[160px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Customer ↕
                </th>
                <th className="min-w-[120px] px-4 py-3">Order status</th>
                <th className="min-w-[160px] px-4 py-3">Delivery status</th>
                <th className="min-w-[160px] px-4 py-3">Invoice status</th>
                <th className="min-w-[130px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Delivery date ↕
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900">
                  Total ↕
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-14 text-center text-sm text-slate-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isOverdue =
                    !!row.deliveryDate && new Date(row.deliveryDate) < new Date();
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded border-slate-300" />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                              return next;
                            })
                          }
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <ChevronDown
                            size={13}
                            className={cn(
                              'transition-transform',
                              expanded.has(row.id) && 'rotate-180',
                            )}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/orders/${row.id}`}
                          className="font-mono text-[12px] font-medium text-brand-700 hover:underline"
                        >
                          {row.number}
                        </Link>
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
                      <td className="px-4 py-3">{orderStatusBadge(row.orderStatus)}</td>
                      <td className="px-4 py-3">{deliveryStatusBadge(row.deliveryStatus)}</td>
                      <td className="px-4 py-3">{invoiceStatusBadge(row.invoiceStatus)}</td>
                      <td className="px-4 py-3">{fmtDate(row.deliveryDate, isOverdue)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {fmtAmount(row.totalKobo)}
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
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/50">
                  <td colSpan={8} />
                  <td className="px-4 py-2.5 text-right text-[12px] font-bold text-slate-700">
                    {fmtAmount(totalAmount)}
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
