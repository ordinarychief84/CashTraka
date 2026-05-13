'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

type MaterialOption = { id: string; name: string; unit: string; unitCostKobo: number };
type RecipeItemInitial = { materialId: string; quantity: number; notes?: string | null };
type RecipeInitial = {
  yieldQty: number;
  notes?: string | null;
  items: RecipeItemInitial[];
};

export function RecipeEditor({
  productId,
  productName,
  materials,
  initial,
}: {
  productId: string;
  productName: string;
  materials: MaterialOption[];
  initial: RecipeInitial | null;
}) {
  const router = useRouter();
  const [yieldQty, setYieldQty] = useState<number>(initial?.yieldQty ?? 1);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [items, setItems] = useState<RecipeItemInitial[]>(
    initial?.items?.length
      ? initial.items
      : [{ materialId: materials[0]?.id ?? '', quantity: 1, notes: '' }],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setItem(i: number, patch: Partial<RecipeItemInitial>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() {
    const usedIds = new Set(items.map((i) => i.materialId));
    const next = materials.find((m) => !usedIds.has(m.id));
    setItems((prev) => [...prev, { materialId: next?.id ?? '', quantity: 1, notes: '' }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const batchCostKobo = items.reduce((sum, it) => {
    const m = materials.find((x) => x.id === it.materialId);
    return sum + (m?.unitCostKobo ?? 0) * it.quantity;
  }, 0);
  const unitCostNaira = yieldQty > 0 ? Math.round(batchCostKobo / 100 / yieldQty) : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (items.length === 0) {
      setError('Add at least one material.');
      return;
    }
    if (new Set(items.map((i) => i.materialId)).size !== items.length) {
      setError('Each material can only appear once.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/recipes/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yieldQty,
          notes: notes || undefined,
          items: items.map((it) => ({
            materialId: it.materialId,
            quantity: it.quantity,
            notes: it.notes || undefined,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body?.error || 'Failed to save');
        setSubmitting(false);
        return;
      }
      router.push(`/recipes/${productId}`);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Batch yield</label>
          <input
            type="number"
            min={1}
            value={yieldQty}
            onChange={(e) => setYieldQty(Math.max(1, Number(e.target.value)))}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">One batch produces this many units of {productName}.</p>
        </div>
        <div className="flex items-end">
          <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Estimated unit cost</p>
            <p className="mt-1 text-xl font-black text-emerald-900">₦{unitCostNaira.toLocaleString('en-NG')}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Materials</h3>
          <button type="button" onClick={addItem} className="btn-secondary inline-flex items-center gap-1 text-xs">
            <Plus size={14} /> Add material
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((it, i) => {
            const m = materials.find((x) => x.id === it.materialId);
            return (
              <li key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-6">
                    <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Material
                    </label>
                    <select
                      value={it.materialId}
                      onChange={(e) => setItem(i, { materialId: e.target.value })}
                      className="input"
                    >
                      <option value="">— Select —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: Math.max(1, Number(e.target.value)) })}
                      className="input"
                    />
                    {m && <p className="mt-1 text-xs text-slate-400">{m.unit} per batch</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Line cost
                    </label>
                    <p className="pt-2 text-sm font-bold text-slate-700">
                      ₦{(m ? Math.round((m.unitCostKobo * it.quantity) / 100) : 0).toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div className="sm:col-span-1 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Recipe notes</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Mixing instructions, temperatures, anything worth remembering"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : 'Save recipe'}
        </button>
      </div>
    </form>
  );
}
