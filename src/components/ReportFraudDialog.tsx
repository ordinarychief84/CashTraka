'use client';

import { useState } from 'react';
import { X, Flag } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  phone: string;
  customerName: string;
  onReported?: () => void;
};

const SUGGESTED_REASONS = [
  'Sent fake transaction screenshot',
  'Took goods and never paid',
  'Chargeback / reversed transfer',
  'Placed fake order under another name',
];

export function ReportFraudDialog({ open, onClose, phone, customerName, onReported }: Props) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    setError(null);
    const r = reason.trim();
    if (r.length < 3) {
      setError('Give a short reason — it helps other sellers.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/fraud-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, reason: r }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not report');
      onReported?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>

        <div className="mb-2 flex items-center gap-2">
          <Flag size={18} className="text-owed-600" />
          <h2 className="text-lg font-bold text-ink">Report fraud</h2>
        </div>
        <p className="text-sm text-slate-600">
          Warn other CashTraka sellers about{' '}
          <span className="font-semibold text-ink">{customerName}</span>.
        </p>

        <div className="mt-4">
          <label htmlFor="reason" className="label">
            What happened?
          </label>
          <textarea
            id="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Short description, e.g. sent fake transfer screenshot of ₦15,000"
            className="input"
            maxLength={300}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-owed-500 hover:bg-owed-50 hover:text-owed-700"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn-primary flex-1"
          >
            {submitting ? 'Reporting…' : 'Report'}
          </button>
        </div>

        <p className="mt-3 text-[11px] text-slate-500">
          Reports are visible to other CashTraka sellers as a warning when this number appears.
          You can remove your report any time.
        </p>
      </div>
    </div>
  );
}
