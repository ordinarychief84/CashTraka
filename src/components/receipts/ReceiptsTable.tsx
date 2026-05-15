'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Receipt as ReceiptIcon,
  Search,
  ExternalLink,
  Download,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKobo } from '@/lib/format';

export type ReceiptRow = {
  id: string;
  receiptNumber: string;
  customerName: string;
  phone: string;
  source: string;
  amountKobo: number;
  balanceRemainingKobo: number | null;
  createdAt: string;
};

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  PAYSTACK: 'Paystack',
  PROMISE: 'Promise',
  INSTALLMENT: 'Installment',
  DEBT: 'Debt cleared',
  CATALOG: 'Catalog',
  PRODUCTION: 'Production',
};

const SOURCE_TONE: Record<string, string> = {
  MANUAL: 'bg-slate-100 text-slate-700',
  PAYSTACK: 'bg-brand-100 text-brand-800',
  PROMISE: 'bg-owed-100 text-owed-800',
  INSTALLMENT: 'bg-owed-50 text-owed-800',
  DEBT: 'bg-success-100 text-success-800',
  CATALOG: 'bg-rose-50 text-rose-700',
  PRODUCTION: 'bg-brand-50 text-brand-700',
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReceiptsTable({ rows }: { rows: ReceiptRow[] }) {
  const [q, setQ] = useState('');
  const [source, setSource] = useState('');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const digits = ql.replace(/\D/g, '');
    return rows.filter((r) => {
      if (source && r.source !== source) return false;
      if (ql) {
        const hay = [r.receiptNumber, r.customerName].join(' ').toLowerCase();
        if (!hay.includes(ql) && !(digits && r.phone.includes(digits))) {
          return false;
        }
      }
      return true;
    });
  }, [rows, q, source]);

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-2 border-b border-border bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by receipt number, customer or phone..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All payment methods</option>
          {Object.entries(SOURCE_LABEL).map(([v, lbl]) => (
            <option key={v} value={v}>
              {lbl}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Receipt</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Payment Method</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5 text-right">Balance</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => {
                const partial = (r.balanceRemainingKobo ?? 0) > 0;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 align-middle">
                      <Link
                        href={`/receipts/${r.id}`}
                        className="flex items-center gap-2.5 hover:opacity-90"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                          <ReceiptIcon size={14} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-bold text-ink">
                              {r.receiptNumber}
                            </span>
                            {partial && (
                              <span className="rounded-full bg-owed-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-owed-800">
                                Partial
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <div className="text-sm font-semibold text-ink">
                        {r.customerName}
                      </div>
                      {r.phone && (
                        <div className="text-[10px] text-slate-500">{r.phone}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          SOURCE_TONE[r.source] ?? 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {SOURCE_LABEL[r.source] ?? r.source}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                      {fmtDateTime(r.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right num text-sm font-semibold text-ink">
                      {formatKobo(r.amountKobo)}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 align-middle text-right num text-xs font-semibold',
                        partial ? 'text-owed-700' : 'text-slate-400',
                      )}
                    >
                      {partial ? formatKobo(r.balanceRemainingKobo ?? 0) : '—'}
                    </td>
                    <td className="px-3 py-2.5 align-middle text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/r/${r.id}`}
                          target="_blank"
                          title="Open public receipt"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <a
                          href={`/api/receipts/${r.id}`}
                          download
                          title="Download PDF"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                        >
                          <Download size={14} />
                        </a>
                        <Link
                          href={`/receipts/${r.id}`}
                          title="Share"
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-success-700"
                        >
                          <MessageCircle size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No receipts match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {filtered.map((r) => {
          const partial = (r.balanceRemainingKobo ?? 0) > 0;
          return (
            <li key={r.id}>
              <Link
                href={`/receipts/${r.id}`}
                className="flex items-start gap-3 px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                  <ReceiptIcon size={16} className="text-slate-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-ink">
                      {r.receiptNumber}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        SOURCE_TONE[r.source] ?? 'bg-slate-100 text-slate-700',
                      )}
                    >
                      {SOURCE_LABEL[r.source] ?? r.source}
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {r.customerName}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{fmtDateTime(r.createdAt)}</span>
                    <span className="num font-semibold text-ink">
                      {formatKobo(r.amountKobo)}
                    </span>
                  </div>
                  {partial && (
                    <div className="mt-0.5 text-[11px] font-semibold text-owed-700">
                      Balance {formatKobo(r.balanceRemainingKobo ?? 0)}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No receipts match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
