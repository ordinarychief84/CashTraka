'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GripVertical } from 'lucide-react';

type Props = { redirectTo?: string };

const CATEGORIES = [
  { value: 'daily_opening', label: 'Daily opening' },
  { value: 'delivery', label: 'Delivery / packing' },
  { value: 'inspection', label: 'Property inspection' },
  { value: 'custom', label: 'Custom' },
];

export function ChecklistForm({ redirectTo = '/checklists' }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() { setItems((prev) => [...prev, '']); }
  function updateItem(i: number, val: string) {
    setItems((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const validItems = items.map((s) => s.trim()).filter(Boolean);
    if (validItems.length === 0) {
      setError('Add at least one checklist item');
      return;
    }
    setSubmitting(true);
    const payload = {
      name: String(form.get('name') || ''),
      description: String(form.get('description') || ''),
      category: String(form.get('category') || 'custom'),
      items: validItems.map((label) => ({ label })),
    };
    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
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
        <label htmlFor="name" className="label">Checklist name</label>
        <input id="name" name="name" className="input" required placeholder="e.g. Daily opening" />
      </div>
      <div>
        <label htmlFor="description" className="label">Description (optional)</label>
        <input id="description" name="description" className="input" placeholder="e.g. Run this every morning before first customer" />
      </div>
      <div>
        <label htmlFor="category" className="label">Category</label>
        <select id="category" name="category" className="input" defaultValue="custom">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Items</span>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={13} />
            Add item
          </button>
        </div>
        {items.length === 0 && (
          <p className="text-xs text-slate-500">No items yet. Add at least one.</p>
        )}
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <GripVertical size={14} className="shrink-0 text-slate-300" />
              <span className="shrink-0 text-xs font-bold text-slate-400">{i + 1}.</span>
              <input
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`Step ${i + 1}, e.g. Check stock levels`}
                className="flex-1 rounded-md border border-border bg-white px-2 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating…' : 'Create checklist'}
      </button>
    </form>
  );
}
