'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

type ProductOption = { id: string; name: string };

const CADENCES = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
] as const;

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

/**
 * Create-template form. Pick products + quantities, choose cadence, save.
 *
 * Inline form (not a separate /new route) so the owner stays in context
 * with their existing templates above. Same pattern as
 * /recurring-invoices new-rule form.
 */
export function NewTemplateForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [hourOfDay, setHourOfDay] = useState<number>(9);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id ?? '', quantity: 50 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateItem(i: number, patch: Partial<{ productId: string; quantity: number }>) {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((cur) => [...cur, { productId: products[0]?.id ?? '', quantity: 1 }]);
  }
  function removeItem(i: number) {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 2) {
      setError('Give the template a name (e.g. "Weekly black soap batch").');
      return;
    }
    if (items.length === 0 || items.some((it) => !it.productId || it.quantity < 1)) {
      setError('Each item needs a product and a positive quantity.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/production-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            cadence,
            dayOfWeek: cadence === 'monthly' ? null : dayOfWeek,
            dayOfMonth: cadence === 'monthly' ? dayOfMonth : null,
            hourOfDay,
            notes: notes.trim() || null,
            items,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Could not save the template.');
          return;
        }
        // Reset + refresh.
        setTitle('');
        setNotes('');
        setItems([{ productId: products[0]?.id ?? '', quantity: 50 }]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error.');
      }
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
        <p className="text-sm text-slate-600">
          Add at least one product before you can create a recurring production template.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-white p-5 shadow-xs"
    >
      <h2 className="mb-3 text-sm font-bold text-ink">New recurring template</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Template name
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g. "Weekly black soap batch"'
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            style={{ minHeight: 'auto' }}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Products</label>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2">
                <select
                  value={it.productId}
                  onChange={(e) => updateItem(i, { productId: e.target.value })}
                  className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) =>
                    updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })
                  }
                  className="num w-24 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  style={{ minHeight: 'auto' }}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                    aria-label="Remove item"
                  >
                    <X size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            <Plus size={12} />
            Add another product
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Cadence</label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as typeof cadence)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {CADENCES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {cadence === 'monthly' ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Day of month
              </label>
              <input
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(28, Number(e.target.value))))}
                className="num w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                style={{ minHeight: 'auto' }}
              />
              <p className="mt-1 text-[10px] text-slate-500">Capped at 28 so February never skips.</p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Day of week</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Start time</label>
            <select
              value={hourOfDay}
              onChange={(e) => setHourOfDay(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder='Copied into every spawned production order. e.g. "Use lavender oil from the new batch."'
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            style={{ minHeight: 'auto' }}
          />
        </div>

        {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-400 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Create template'}
        </button>
      </div>
    </form>
  );
}
