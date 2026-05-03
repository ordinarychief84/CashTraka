'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, CheckCircle2 } from 'lucide-react';

type Filter = 'all' | 'positive' | 'negative' | 'unresolved';

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
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(f: Filter) {
    setBusy(true);
    setError(null);
    const params = new URLSearchParams({ pageSize: '50' });
    if (f === 'positive') {
      // No direct rating-set filter. Use isNegative=false to get positives.
      params.set('isNegative', 'false');
    } else if (f === 'negative') {
      params.set('isNegative', 'true');
    } else if (f === 'unresolved') {
      params.set('isNegative', 'true');
      params.set('isResolved', 'false');
    }
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
    load(filter);
  }, [filter]);

  async function resolve(id: string) {
    const res = await fetch(`/api/feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      load(filter);
    }
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap gap-2">
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
