'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EXPENSE_CATEGORIES } from '@/lib/validators';

type Initial = {
  id?: string;
  amount?: number;
  category?: string;
  note?: string;
  incurredOn?: string;
};

type Props = {
  redirectTo?: string;
  initial?: Initial;
};

export function ExpenseForm({ redirectTo = '/expenses', initial }: Props) {
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
      amount: Number(form.get('amount') || 0),
      category: String(form.get('category') || 'Other'),
      note: String(form.get('note') || ''),
      incurredOn: String(form.get('incurredOn') || ''),
    };
    try {
      const res = await fetch(
        editing ? `/api/expenses/${initial!.id}` : '/api/expenses',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="amount" className="label">Amount spent (₦)</label>
        <input
          id="amount"
          name="amount"
          type="number"
          min={1}
          className="input"
          placeholder="e.g. 2000"
          defaultValue={initial?.amount ?? ''}
          required
        />
      </div>
      <div>
        <label htmlFor="category" className="label">Category</label>
        <select
          id="category"
          name="category"
          className="input"
          defaultValue={initial?.category ?? 'Stock'}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="incurredOn" className="label">Date</label>
        <input
          id="incurredOn"
          name="incurredOn"
          type="date"
          className="input"
          defaultValue={initial?.incurredOn ?? today}
        />
      </div>
      <div>
        <label htmlFor="note" className="label">Note (optional)</label>
        <input
          id="note"
          name="note"
          className="input"
          placeholder="e.g. Restocked 5 perfumes"
          defaultValue={initial?.note ?? ''}
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}
      </button>
    </form>
  );
}
