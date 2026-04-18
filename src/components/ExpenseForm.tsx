'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, User } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/lib/validators';
import { cn } from '@/lib/utils';

type Kind = 'business' | 'personal';

type Initial = {
  id?: string;
  amount?: number;
  category?: string;
  note?: string;
  incurredOn?: string;
  kind?: Kind;
};

type Props = {
  redirectTo?: string;
  initial?: Initial;
};

/**
 * Expense form — now captures whether the spend is BUSINESS (affects P&L)
 * or PERSONAL (owner's out-of-pocket, tracked for budgeting only).
 * Personal expenses never roll into profit reports.
 */
export function ExpenseForm({ redirectTo = '/expenses', initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>(initial?.kind ?? 'business');

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
      kind,
    };
    try {
      const res = await fetch(
        editing ? `/api/expenses/${initial\!.id}` : '/api/expenses',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (\!res.ok) throw new Error(data.error || 'Could not save');
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
      {/* ── Kind picker — top of the form, sets the mental mode ── */}
      <div>
        <span className="label">Type of expense</span>
        <div className="grid grid-cols-2 gap-2">
          <KindButton
            active={kind === 'business'}
            onClick={() => setKind('business')}
            icon={<Briefcase size={16} />}
            label="Business"
            sub="Stock, rent, fuel, salary…"
          />
          <KindButton
            active={kind === 'personal'}
            onClick={() => setKind('personal')}
            icon={<User size={16} />}
            label="Personal"
            sub="Out-of-pocket, not the business"
          />
        </div>
      </div>

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
            <option key={c} value={c}>
              {c}
            </option>
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
          placeholder={
            kind === 'personal'
              ? 'e.g. Lunch, fuel, phone top-up'
              : 'e.g. Restocked 5 perfumes'
          }
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

function KindButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition',
        active
          ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
          : 'border-border bg-white hover:border-brand-300',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md',
          active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600',
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          'text-sm font-semibold',
          active ? 'text-brand-700' : 'text-ink',
        )}
      >
        {label}
      </span>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </button>
  );
}
