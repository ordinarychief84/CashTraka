'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Initial = {
  id?: string;
  customerName?: string;
  phone?: string;
  amountOwed?: number;
  dueDate?: string;
};

type Props = {
  redirectTo?: string;
  onSuccess?: () => void;
  /** If present, edits via PATCH /api/debts/{id}. */
  initial?: Initial;
};

export function DebtForm({ redirectTo = '/debts', onSuccess, initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      customerName: String(form.get('customerName') || ''),
      phone: String(form.get('phone') || ''),
      amountOwed: Number(form.get('amountOwed') || 0),
      dueDate: String(form.get('dueDate') || ''),
    };
    try {
      const res = await fetch(
        editing ? `/api/debts/${initial!.id}` : '/api/debts',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      onSuccess?.();
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="customerName" className="label">Customer name</label>
        <input
          id="customerName"
          name="customerName"
          className="input"
          placeholder="e.g. Chidi Okafor"
          defaultValue={initial?.customerName ?? ''}
          required
        />
      </div>
      <div>
        <label htmlFor="phone" className="label">Phone number</label>
        <input
          id="phone"
          name="phone"
          className="input"
          inputMode="tel"
          placeholder="08012345678"
          defaultValue={initial?.phone ?? ''}
          required
        />
      </div>
      <div>
        <label htmlFor="amountOwed" className="label">Amount owed (₦)</label>
        <input
          id="amountOwed"
          name="amountOwed"
          type="number"
          min={1}
          className="input"
          placeholder="e.g. 15000"
          defaultValue={initial?.amountOwed ?? ''}
          required
        />
      </div>
      <div>
        <label htmlFor="dueDate" className="label">Due date (optional)</label>
        <input
          id="dueDate"
          name="dueDate"
          type="date"
          className="input"
          defaultValue={initial?.dueDate ?? ''}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save debt'}
      </button>
    </form>
  );
}
