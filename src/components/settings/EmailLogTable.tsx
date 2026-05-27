'use client';

import { useMemo, useState } from 'react';
import { Search, Inbox } from 'lucide-react';

export interface EmailLogRow {
  id: string;
  toEmail: string;
  fromEmail: string;
  subject: string;
  status: string;
  category: string | null;
  errorReason: string | null;
  sentAt: string;
}

interface Props {
  initialRows: EmailLogRow[];
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    delivered:  { bg: 'bg-success-50', text: 'text-success-700', label: 'Delivered' },
    opened:     { bg: 'bg-success-50', text: 'text-success-700', label: 'Opened' },
    clicked:    { bg: 'bg-success-50', text: 'text-success-700', label: 'Clicked' },
    sent:       { bg: 'bg-brand-50',   text: 'text-brand-700',   label: 'Sent' },
    queued:     { bg: 'bg-slate-100',  text: 'text-slate-600',   label: 'Queued' },
    bounced:    { bg: 'bg-rose-50',    text: 'text-rose-700',    label: 'Bounced' },
    complained: { bg: 'bg-rose-50',    text: 'text-rose-700',    label: 'Complained' },
    failed:     { bg: 'bg-rose-50',    text: 'text-rose-700',    label: 'Failed' },
  };
  const m = map[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'Just now';
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function EmailLogTable({ initialRows }: Props) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filtered = useMemo(() => {
    return initialRows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        r.toEmail.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [initialRows, query, statusFilter]);

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipient or subject"
            className="h-8 w-full rounded-md border border-slate-300 pl-8 pr-3 text-[12px] text-slate-700 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-300"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-slate-300 px-2 pr-7 text-[12px] text-slate-600 outline-none"
        >
          <option value="">All statuses</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="sent">Sent</option>
          <option value="queued">Queued</option>
          <option value="bounced">Bounced</option>
          <option value="complained">Complained</option>
          <option value="failed">Failed</option>
        </select>
        <span className="ml-auto text-[12px] text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={16} />
            </div>
            <p className="text-[13px] text-slate-500">
              {initialRows.length === 0
                ? "No e-mails sent yet. They'll show up here once Resend starts processing your invoices, receipts and reminders."
                : 'No e-mails match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Recipient</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-slate-700">{r.toEmail}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.subject}</p>
                      {r.errorReason && (
                        <p className="mt-0.5 text-[11px] text-rose-600">{r.errorReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">
                      {r.category ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500" title={r.sentAt}>
                      {relativeTime(r.sentAt)}
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
