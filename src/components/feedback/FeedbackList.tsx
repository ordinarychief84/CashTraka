'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, CheckCircle2, Download } from 'lucide-react';

type Filter = 'all' | 'positive' | 'negative' | 'unresolved';
type Range = 'all' | '7d' | '30d' | '90d';

/** Translate a Range chip into a `from` ISO date string (or null). */
function rangeToFrom(range: Range): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

type FeedbackRow = {
  id: string;
  rating: string;
  reason: string | null;
  comment: string | null;
  source: string;
  isNegative: boolean;
  isResolved: boolean;
  submittedAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; phone: string } | null;
  receipt: { id: string; receiptNumber: string } | null;
  invoice: { id: string; invoiceNumber: string } | null;
};

const RATING_LABEL: Record<string, string> = {
  VERY_HAPPY: 'Very happy',
  HAPPY: 'Happy',
  UNHAPPY: 'Unhappy',
  VERY_UNHAPPY: 'Very unhappy',
};

const REASON_LABEL: Record<string, string> = {
  DELAY: 'Delay',
  WRONG_ITEM: 'Wrong item',
  POOR_SERVICE: 'Poor service',
  PAYMENT_ISSUE: 'Payment issue',
  OTHER: 'Other',
};

const SOURCE_LABEL: Record<string, string> = {
  RECEIPT: 'Receipt',
  PAYMENT: 'Payment',
  INVOICE: 'Invoice',
  TRANSACTION: 'Transaction',
  MANUAL: 'Manual',
};

function ratingPill(rating: string): { label: string; cls: string } {
  if (rating === 'VERY_HAPPY')
    return { label: 'Very happy', cls: 'bg-success-100 text-success-800' };
  if (rating === 'HAPPY') return { label: 'Happy', cls: 'bg-brand-50 text-brand-700' };
  if (rating === 'UNHAPPY')
    return { label: 'Unhappy', cls: 'bg-amber-50 text-amber-700' };
  if (rating === 'VERY_UNHAPPY')
    return { label: 'Very unhappy', cls: 'bg-red-50 text-red-700' };
  return { label: rating, cls: 'bg-slate-100 text-slate-700' };
}

function relTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export function FeedbackList() {
  const [filter, setFilter] = useState<Filter>('all');
  const [range, setRange] = useState<Range>('all');
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build the query params shared between the list fetch and the CSV
  // export so they always stay in sync.
  const params = useMemo(() => {
    const p = new URLSearchParams({ pageSize: '50' });
    if (filter === 'positive') p.set('isNegative', 'false');
    else if (filter === 'negative') p.set('isNegative', 'true');
    else if (filter === 'unresolved') {
      p.set('isNegative', 'true');
      p.set('isResolved', 'false');
    }
    const from = rangeToFrom(range);
    if (from) p.set('from', from);
    return p;
  }, [filter, range]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/feedback?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRows(data?.data?.rows ?? []);
      } else {
        setError(data?.error || 'Could not load feedback.');
      }
    } catch {
      setError('Network problem.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function exportCsv() {
    // Same filters but with format=csv. Triggers a browser download.
    const csvParams = new URLSearchParams(params);
    csvParams.delete('pageSize');
    csvParams.set('format', 'csv');
    window.location.href = `/api/feedback?${csvParams.toString()}`;
  }

  async function resolve(id: string) {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      load();
    }
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'positive', label: 'Positive' },
            { id: 'negative', label: 'Negative' },
            { id: 'unresolved', label: 'Needs follow up' },
          ] as Array<{ id: Filter; label: string }>
        ).map((c) => {
          const active = filter === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition ' +
                (active
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300')
              }
            >
              {c.label}
            </button>
          );
        })}

        <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:inline-block" />

        {(
          [
            { id: 'all', label: 'All time' },
            { id: '7d', label: 'Last 7 days' },
            { id: '30d', label: 'Last 30 days' },
            { id: '90d', label: 'Last 90 days' },
          ] as Array<{ id: Range; label: string }>
        ).map((c) => {
          const active = range === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setRange(c.id)}
              className={
                'rounded-full border px-3 py-1.5 text-xs font-medium transition ' +
                (active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')
              }
            >
              {c.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={exportCsv}
          disabled={busy || rows.length === 0}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
          title="Download a CSV of the current filtered list"
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      {busy ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-5 text-sm text-slate-600">
          <Loader2 size={14} className="animate-spin" /> Loading feedback...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-slate-600">
          No feedback yet. Send a Service Check link to a customer to get started.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-white">
          {rows.map((r) => {
            const pill = ratingPill(r.rating);
            const ref =
              r.receipt?.receiptNumber ?? r.invoice?.invoiceNumber ?? null;
            return (
              <li key={r.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">
                      {r.customer?.name ?? 'Customer'}
                    </span>
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                        pill.cls
                      }
                    >
                      {pill.label}
                    </span>
                    {r.isNegative && r.isResolved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-semibold text-success-700">
                        <CheckCircle2 size={10} /> Resolved
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {SOURCE_LABEL[r.source] ?? r.source}
                    {ref ? ` · ${ref}` : ''}
                    {r.submittedAt ? ` · ${relTime(r.submittedAt)}` : ''}
                  </div>
                  {r.reason ? (
                    <div className="mt-1 text-xs text-amber-700">
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </div>
                  ) : null}
                  {r.comment ? (
                    <div className="mt-1 text-sm text-slate-700">
                      &ldquo;{r.comment}&rdquo;
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {r.isNegative && !r.isResolved ? (
                    <>
                      {r.customer?.phone ? (
                        <Link
                          href={`/follow-up?customerId=${r.customer.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1fbd5b]"
                        >
                          <MessageCircle size={12} />
                          Follow up
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => resolve(r.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-400"
                      >
                        Mark resolved
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
