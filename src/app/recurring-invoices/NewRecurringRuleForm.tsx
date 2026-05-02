'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

type Item = {
  description: string;
  unitPrice: number;
  quantity: number;
};

/**
 * Lightweight v1 form to create a recurring invoice rule. The full
 * line-item editor lives in the regular invoice form; here we keep
 * things minimal and focus on cadence + autoSend.
 */
export function NewRecurringRuleForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [autoSend, setAutoSend] = useState(false);
  const [items, setItems] = useState<Item[]>([
    { description: '', unitPrice: 0, quantity: 1 },
  ]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addRow() {
    setItems((prev) => [...prev, { description: '', unitPrice: 0, quantity: 1 }]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const validItems = items.filter(
      (it) => it.description.trim() && it.unitPrice > 0,
    );
    if (validItems.length === 0) {
      setError('Add at least one line item');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/recurring-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          frequency,
          startDate,
          autoSend,
          items: validItems,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save');
      setOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setItems([{ description: '', unitPrice: 0, quantity: 1 }]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary inline-flex items-center gap-2"
      >
        <Plus size={16} />
        New recurring rule
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-white p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label">Customer name</label>
          <input
            className="input"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            className="input"
            inputMode="tel"
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email (optional)</label>
          <input
            type="email"
            className="input"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Frequency</label>
          <select
            className="input"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as typeof frequency)}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <div>
          <label className="label">Start date</label>
          <input
            type="date"
            className="input"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoSend}
            onChange={(e) => setAutoSend(e.target.checked)}
          />
          Auto-send when generated
        </label>
      </div>

      <div className="rounded-lg border border-border bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Line items</span>
          <button
            type="button"
            onClick={addRow}
            className="flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={12} />
            Row
          </button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="mt-2 grid grid-cols-12 gap-2 rounded-lg border border-border bg-white p-2">
            <input
              placeholder="Description"
              className="col-span-6 rounded-md border-0 bg-transparent p-1 text-sm outline-none"
              value={it.description}
              onChange={(e) => updateItem(i, { description: e.target.value })}
            />
            <input
              type="number"
              inputMode="decimal"
              min={1}
              className="col-span-2 rounded-md border-0 bg-transparent p-1 text-sm outline-none"
              value={it.quantity}
              onChange={(e) =>
                updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })
              }
            />
            <input
              type="number"
              inputMode="decimal"
              min={0}
              className="col-span-4 rounded-md border-0 bg-transparent p-1 text-sm outline-none"
              placeholder="Unit price"
              value={it.unitPrice || ''}
              onChange={(e) =>
                updateItem(i, { unitPrice: Math.max(0, Number(e.target.value)) })
              }
            />
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving
            </>
          ) : (
            'Save rule'
          )}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
