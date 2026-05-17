'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BarcodeScanButton } from './BarcodeScanButton';

type Initial = {
  id?: string;
  name?: string;
  sku?: string | null;
  unit?: string | null;
  stock?: number;
  reorderLevel?: number;
  unitCostKobo?: number;
  supplierId?: string | null;
  expiresAt?: Date | string | null;
  notes?: string | null;
};

type SupplierOption = { id: string; name: string };

const UNITS = ['unit', 'pack', 'kg', 'g', 'l', 'ml', 'm', 'box', 'roll'];

export function RawMaterialForm({
  initial,
  suppliers,
}: {
  initial?: Initial;
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState<string>(initial?.sku ?? '');
  const isEdit = Boolean(initial?.id);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: String(fd.get('name') ?? '').trim(),
      sku: sku.trim() || undefined,
      unit: String(fd.get('unit') ?? '').trim() || undefined,
      reorderLevel: Number(fd.get('reorderLevel') ?? 0),
      unitCostKobo: Math.round(Number(fd.get('unitCostNaira') ?? 0) * 100),
      supplierId: (String(fd.get('supplierId') ?? '') || undefined),
      expiresAt: String(fd.get('expiresAt') ?? '') || undefined,
      notes: String(fd.get('notes') ?? '').trim() || undefined,
    };
    if (!isEdit) {
      payload.stock = Number(fd.get('stock') ?? 0);
    }
    try {
      const res = await fetch(
        isEdit ? `/api/raw-materials/${initial!.id}` : '/api/raw-materials',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed to save';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success(isEdit ? 'Material updated' : 'Material saved');
      router.push(isEdit ? `/materials/${initial!.id}` : `/materials/${body.data.id}`);
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const expiresAtValue = initial?.expiresAt
    ? new Date(initial.expiresAt).toISOString().slice(0, 10)
    : '';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Material name <span className="text-rose-500">*</span>
        </label>
        <input
          name="name"
          required
          defaultValue={initial?.name ?? ''}
          className="input"
          placeholder="e.g. Shea butter"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">SKU</label>
          <div className="flex gap-2">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="input flex-1"
              placeholder="Optional"
            />
            <BarcodeScanButton label="Scan" onScan={(text) => setSku(text)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Unit</label>
          <select name="unit" defaultValue={initial?.unit ?? 'unit'} className="input">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        {!isEdit && (
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Starting stock</label>
            <input
              name="stock"
              type="number"
              min={0}
              defaultValue={initial?.stock ?? 0}
              className="input"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Reorder level</label>
          <input
            name="reorderLevel"
            type="number"
            min={0}
            defaultValue={initial?.reorderLevel ?? 0}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">Get warned when stock dips to this number.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Unit cost (₦)</label>
          <input
            name="unitCostNaira"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial?.unitCostKobo != null ? initial.unitCostKobo / 100 : 0}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">Used for production-costing.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Supplier</label>
          <select name="supplierId" defaultValue={initial?.supplierId ?? ''} className="input">
            <option value="">— None —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Expires on</label>
          <input
            name="expiresAt"
            type="date"
            defaultValue={expiresAtValue}
            className="input"
          />
          <p className="mt-1 text-xs text-slate-500">For perishable materials only.</p>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initial?.notes ?? ''}
          className="input"
          placeholder="Storage conditions, supplier lead time, anything worth remembering"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add material'}
        </button>
      </div>
    </form>
  );
}
