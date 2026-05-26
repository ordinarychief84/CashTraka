'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PORow {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  totalKobo: number;
  expectedAt: string | null;
  receivedAt: string | null;
  deliveredCount: number;
  totalQtyCount: number;
  notes: string | null;
}

interface Props {
  rows: PORow[];
}

function sentBadge(status: string) {
  const isSent = ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].includes(status);
  const isDraft = status === 'DRAFT';
  if (isDraft)
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
        Draft
      </span>
    );
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      Sent
    </span>
  );
}

function receivedBadge(status: string) {
  switch (status) {
    case 'RECEIVED':
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Received
        </span>
      );
    case 'PARTIALLY_RECEIVED':
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          Partly received
        </span>
      );
    case 'ORDERED':
      return (
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
          Ready for receiving
        </span>
      );
    default:
      return (
        <span className="text-[11px] text-slate-400">Not received</span>
      );
  }
}

function invoicedBadge(status: string) {
  // No invoice model yet — show "Not invoiced"
  return <span className="text-[11px] text-slate-400">Not invoiced</span>;
}

function formatAmount(kobo: number) {
  return '₦' + (kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PAGE_SIZE = 20;

export function PurchaseOrdersTable({ rows }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.poNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalAmount = filtered.reduce((sum, r) => sum + r.totalKobo, 0);

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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                <th className="min-w-[110px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Number ↕
                </th>
                <th className="min-w-[160px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Supplier ↕
                </th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Invoiced</th>
                <th className="min-w-[140px] px-4 py-3 cursor-pointer hover:text-slate-900">
                  Preferred delivery date ↕
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900">
                  Total ↕
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-sm text-slate-400">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/purchase-orders/${row.id}`}
                        className="font-mono text-[12px] font-medium text-brand-700 hover:underline"
                      >
                        {row.poNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.supplierName}</td>
                    <td className="px-4 py-3">{sentBadge(row.status)}</td>
                    <td className="px-4 py-3">{receivedBadge(row.status)}</td>
                    <td className="px-4 py-3">{invoicedBadge(row.status)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(row.expectedAt)}</td>
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
                  <td colSpan={7} />
                  <td className="px-4 py-2.5 text-right text-[12px] font-bold text-slate-700">
                    {formatAmount(totalAmount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2 text-[12px] text-slate-500">
            <span>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
