'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Search, Star, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type ServiceCheckRow = {
  id: string;
  checkId: string;
  customerName: string;
  relatedOrder: string | null;
  feedbackType: string;
  dateSent: string;
  dateResponded: string | null;
  satisfactionScore: number | null; // 1–5
  status: string; // COMPLETED | PENDING | OVERDUE | RESOLVED
  assignedStaff: string;
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const TYPE_LABEL: Record<string, string> = {
  RECEIPT: 'Receipt',
  INVOICE: 'Invoice',
  PAYMENT: 'Payment',
  TRANSACTION: 'Transaction',
  MANUAL: 'Manual',
};

const TYPE_TONE: Record<string, string> = {
  RECEIPT: 'text-brand-700',
  INVOICE: 'text-success-700',
  PAYMENT: 'text-owed-700',
  TRANSACTION: 'text-rose-700',
  MANUAL: 'text-slate-600',
};

function ScoreStars({ score }: { score: number | null }) {
  if (score == null) return <span className="text-[10px] text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={11}
          className={i < score ? 'fill-owed-500 text-owed-500' : 'text-slate-300'}
        />
      ))}
      <span className="num ml-1 text-[10px] font-semibold text-slate-600">
        {score.toFixed(1)}
      </span>
    </span>
  );
}

export function ServiceCheckTable({ rows }: { rows: ServiceCheckRow[] }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (type && r.feedbackType !== type) return false;
      if (ql) {
        const hay = [r.checkId, r.customerName, r.relatedOrder ?? '', r.assignedStaff]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, status, type]);

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-2 border-b border-border bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search check ID, customer or order..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([v, lbl]) => (
            <option key={v} value={v}>
              {lbl}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="OVERDUE">Overdue</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Check ID</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Related Order</th>
                <th className="px-3 py-2.5">Feedback Type</th>
                <th className="px-3 py-2.5">Date Sent</th>
                <th className="px-3 py-2.5">Date Responded</th>
                <th className="px-3 py-2.5">Score</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Assigned Staff</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 align-middle">
                    <Link
                      href={`/service-check/${r.id}`}
                      className="flex items-center gap-2.5 hover:opacity-90"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                        <ClipboardCheck size={14} className="text-slate-400" />
                      </div>
                      <div className="font-mono text-xs font-bold text-ink">
                        {r.checkId}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs font-semibold text-ink">
                    {r.customerName}
                  </td>
                  <td className="px-3 py-2.5 align-middle font-mono text-xs text-slate-600">
                    {r.relatedOrder ?? '—'}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 align-middle text-xs font-semibold',
                      TYPE_TONE[r.feedbackType] ?? 'text-slate-600',
                    )}
                  >
                    {TYPE_LABEL[r.feedbackType] ?? r.feedbackType}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {fmt(r.dateSent)}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {fmt(r.dateResponded)}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <ScoreStars score={r.satisfactionScore} />
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.assignedStaff}
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No service checks match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link
              href={`/service-check/${r.id}`}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                <ClipboardCheck size={16} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-sm font-bold text-ink">{r.checkId}</div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {r.customerName}
                  {r.relatedOrder ? ` · ${r.relatedOrder}` : ''}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <ScoreStars score={r.satisfactionScore} />
                  <span className="text-[10px] text-slate-500">{fmt(r.dateResponded)}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No service checks match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
