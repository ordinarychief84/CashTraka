'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReceiptRow {
  id: string;
  number: string;
  purchaseOrderNumber: string | null;
  purchaseOrderId: string | null;
  status: string;
  dateOfReceipt: string;
  itemName: string;
  itemHref: string;
}

interface Props {
  rows: ReceiptRow[];
}

function statusBadge(status: string) {
  switch (status) {
    case 'Received':
      return (
        <span className="rounded-full bg-success-100 px-2 py-0.5 text-[11px] font-semibold text-success-700">
          Received
        </span>
      );
    case 'Partly received':
      return (
        <span className="rounded-full bg-owed-100 px-2 py-0.5 text-[11px] font-semibold text-owed-700">
          Partly received
        </span>
      );
    default:
      return (
        <span className="text-[11px] text-slate-400">Not received</span>
      );
  }
}

export function ReceiptsTable({ rows }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        (r.purchaseOrderNumber ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

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
                <th className="min-w-[130px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Number ↕
                </th>
                <th className="min-w-[180px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Purchase order / Invoice ↕
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="min-w-[140px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Date of receipt ↕
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-400">
                    No receipts found
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-medium text-brand-700">
                        {row.number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.purchaseOrderId ? (
                        <Link
                          href={`/purchase-orders/${row.purchaseOrderId}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {row.purchaseOrderNumber ?? row.purchaseOrderId.slice(-6).toUpperCase()}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(row.dateOfReceipt).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
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
          </table>
        </div>
      </div>
    </div>
  );
}
