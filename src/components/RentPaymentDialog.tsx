'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

type Props = {
  tenantId: string;
  tenantName: string;
  rentAmount: number;
  open: boolean;
  onClose: () => void;
};

export function RentPaymentDialog({ tenantId, tenantName, rentAmount, open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentPeriod = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (open) {
      setError('');
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const payload = {
      tenantId,
      amount: Number(fd.get('amount')),
      period: fd.get('period') as string,
      status: 'PAID' as const,
      note: fd.get('note') as string,
    };

    try {
      const res = await fetch('/api/rent-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong');
        setSaving(false);
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Record rent payment</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="text-sm text-slate-600">
            Recording payment for <span className="font-semibold text-ink">{tenantName}</span>
          </div>

          <div>
            <label htmlFor="amount" className="label">Amount (Naira)</label>
            <input
              id="amount"
              name="amount"
              type="number"
              required
              min={1}
              defaultValue={rentAmount}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="period" className="label">Period</label>
            <input
              id="period"
              name="period"
              type="month"
              required
              defaultValue={currentPeriod}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="note" className="label">Note (optional)</label>
            <input
              id="note"
              name="note"
              type="text"
              className="input"
              placeholder="e.g. Bank transfer"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Record payment'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
