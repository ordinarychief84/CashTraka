'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

type SupplierOpt = { id: string; name: string };
type MaterialOpt = { id: string; name: string; unit: string; unitCostKobo: number };
type Line = { materialId: string; quantity: number; unitCostNaira: number };

export function PurchaseOrderForm({
  suppliers,
  materials,
  initialSupplierId,
  initialMaterialId,
  initialMaterialQty,
}: {
  suppliers: SupplierOpt[];
  materials: MaterialOpt[];
  initialSupplierId?: string;
  initialMaterialId?: string;
  initialMaterialQty?: number;
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<string>(initialSupplierId ?? '');
  const [expectedAt, setExpectedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Line[]>(() => {
    if (initialMaterialId) {
      const m = materials.find((x) => x.id === initialMaterialId);
      return [
        {
          materialId: initialMaterialId,
          quantity: initialMaterialQty ?? 1,
          unitCostNaira: m ? m.unitCostKobo / 100 : 0,
        },
      ];
    }
    return [{ materialId: materials[0]?.id ?? '', quantity: 1, unitCostNaira: materials[0] ? materials[0].unitCostKobo / 100 : 0 }];
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickMaterial(i: number, materialId: string) {
    const m = materials.find((x) => x.id === materialId);
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i ? { ...it, materialId, unitCostNaira: m ? m.unitCostKobo / 100 : it.unitCostNaira } : it,
      ),
    );
  }

  const totalKobo = items.reduce(
    (sum, it) => sum + Math.round(it.unitCostNaira * 100) * it.quantity,
    0,
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supplierId) {
      setError('Pick a supplier.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one line.');
      return;
    }
    if (new Set(items.map((i) => i.materialId)).size !== items.length) {
      setError('Each material can only appear once.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          expectedAt: expectedAt || undefined,
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            materialId: it.materialId,
            quantity: it.quantity,
            unitCostKobo: Math.round(it.unitCostNaira * 100),
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('Purchase order created');
      router.push(`/purchase-orders/${body.data.id}`);
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Supplier <span className="text-rose-500">*</span>
          </label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input" required>
            <option value="">— Select —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Expected by</label>
          <input value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} type="date" className="input" />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Materials</h3>
          <button
            type="button"
            onClick={() =>
              setItems((prev) => {
                const used = new Set(prev.map((p) => p.materialId));
                const next = materials.find((m) => !used.has(m.id));
                return [
                  ...prev,
                  {
                    materialId: next?.id ?? '',
                    quantity: 1,
                    unitCostNaira: next ? next.unitCostKobo / 100 : 0,
                  },
                ];
              })
            }
            className="btn-secondary inline-flex items-center gap-1 text-xs"
          >
            <Plus size={14} /> Add material
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((it, i) => {
            const m = materials.find((x) => x.id === it.materialId);
            return (
              <li key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Material
                    </label>
                    <select value={it.materialId} onChange={(e) => pickMaterial(i, e.target.value)} className="input">
                      <option value="">— Select —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Qty
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={it.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x,
                          ),
                        )
                      }
                      className="input"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unit cost (₦)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.unitCostNaira}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, unitCostNaira: Number(e.target.value) } : x,
                          ),
                        )
                      }
                      className="input"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Total</label>
                    <p className="pt-2 text-sm font-bold text-slate-700">
                      ₦{Math.round(it.unitCostNaira * it.quantity).toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div className="sm:col-span-1 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
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
        <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Delivery instructions, payment terms…"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <span className="text-sm font-semibold text-emerald-700">PO total</span>
        <span className="text-xl font-black text-emerald-900">
          ₦{Math.round(totalKobo / 100).toLocaleString('en-NG')}
        </span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Creating…' : 'Create purchase order'}
        </button>
      </div>
    </form>
  );
}
