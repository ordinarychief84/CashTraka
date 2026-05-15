'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Truck, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatKobo } from '@/lib/format';

export type PurchaseRow = {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  lineCount: number;
  totalKobo: number;
  amountPaidKobo: number;
  expectedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Purchase orders list table. Matches the comp columns: PO number,
 * supplier, status, line count, expected/received dates, total, paid,
 * outstanding. Client-side search + status filter.
 */
export function PurchasesTable({ rows }: { rows: PurchaseRow[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (ql) {
        const hay = [r.poNumber, r.supplierName].join(' ').toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, status]);

  return (
    <div className="card overflow-hidden">
      {/* Filter bar */}
      <div className="grid gap-2 border-b border-border bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by PO number or supplier..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="ORDERED">Ordered</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">PO Number</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Lines</th>
                <th className="px-3 py-2.5">Expected</th>
                <th className="px-3 py-2.5">Received</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Paid</th>
                <th className="px-3 py-2.5 text-right">Outstanding</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const outstanding = Math.max(0, r.totalKobo - r.amountPaidKobo);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={`/purchase-orders/${r.id}`}
                        className="flex items-center gap-2.5 hover:opacity-90"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                          <Truck size={14} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono text-sm font-bold text-ink">
                            {r.poNumber}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Created {fmt(r.createdAt)}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-700">
                      {r.supplierName}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs text-slate-600">
                      {r.lineCount}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {fmt(r.expectedAt)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {fmt(r.receivedAt)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-sm font-semibold text-ink">
                      {formatKobo(r.totalKobo)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-xs text-slate-600">
                      {formatKobo(r.amountPaidKobo)}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 align-middle text-right num text-xs font-semibold',
                        outstanding > 0 ? 'text-rose-700' : 'text-success-700',
                      )}
                    >
                      {formatKobo(outstanding)}
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
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No purchase orders match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {filtered.map((r) => {
          const outstanding = Math.max(0, r.totalKobo - r.amountPaidKobo);
          return (
            <li key={r.id}>
              <Link
                href={`/purchase-orders/${r.id}`}
                className="flex items-start gap-3 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                  <Truck size={16} className="text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-mono text-sm font-bold text-ink">
                      {r.poNumber}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {r.supplierName} · {r.lineCount} line{r.lineCount === 1 ? '' : 's'}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {r.receivedAt ? `Received ${fmt(r.receivedAt)}` : `Expected ${fmt(r.expectedAt)}`}
                    </span>
                    <span className="num font-semibold text-ink">
                      {formatKobo(r.totalKobo)}
                    </span>
                  </div>
                  {outstanding > 0 && (
                    <div className="mt-0.5 text-[11px] font-semibold text-rose-700">
                      Outstanding {formatKobo(outstanding)}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No purchase orders match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
