'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type Props = {
  open: boolean;
  onClose: () => void;
  debt: {
    id: string;
    customerName: string;
    amountOwed: number;
    amountPaid: number;
  };
};

export function PartialPaymentDialog({ open, onClose, debt }: Props) {
  const router = useRouter();
  const remaining = Math.max(debt.amountOwed - debt.amountPaid, 0);
  const [amount, setAmount] = useState<string>(String(remaining));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Enter an amount greater than 0');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/debts/${debt.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: n }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not record');
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
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

        <h2 className="text-lg font-bold text-ink">Record a payment</h2>
        <p className="mt-1 text-sm text-slate-600">
          Against <span className="font-semibold text-ink">{debt.customerName}</span>’s debt.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-slate-50 p-3 text-center">
          <Mini label="Owed" value={formatNaira(debt.amountOwed)} />
          <Mini label="Already paid" value={formatNaira(debt.amountPaid)} tone="success" />
          <Mini label="Remaining" value={formatNaira(remaining)} tone="owed" />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="amt" className="label">Amount received (₦)</label>
            <input
              id="amt"
              type="number"
              min={1}
              max={remaining}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-slate-500">
              Recording this also adds a payment to your “Total received”.
            </p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Record payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'owed' }) {
  const t =
    tone === 'success'
      ? 'text-success-700'
      : tone === 'owed'
      ? 'text-owed-600'
      : 'text-ink';
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={'num mt-0.5 text-sm ' + t}>{value}</div>
    </div>
  );
}
