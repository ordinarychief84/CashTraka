'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

type ProductOpt = { id: string; name: string; sku?: string | null; priceKobo: number };
type CustomerOpt = { id: string; name: string; phone: string };

type Line = {
  productId: string;
  description: string;
  quantity: number;
  unitPriceNaira: number;
};

export function CustomerOrderForm({
  products,
  customers,
}: {
  products: ProductOpt[];
  customers: CustomerOpt[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Line[]>([
    { productId: '', description: '', quantity: 1, unitPriceNaira: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
    }
  }

  function pickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? {
              ...it,
              productId,
              description: p?.name ?? it.description,
              unitPriceNaira: p ? p.priceKobo / 100 : it.unitPriceNaira,
            }
          : it,
      ),
    );
  }

  const totalKobo = items.reduce(
    (sum, it) => sum + Math.round(it.unitPriceNaira * 100) * it.quantity,
    0,
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (items.length === 0 || items.every((it) => !it.description.trim())) {
      setError('Add at least one item.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          dueAt: dueAt || undefined,
          notes: notes.trim() || undefined,
          items: items
            .filter((it) => it.description.trim())
            .map((it) => ({
              productId: it.productId || undefined,
              description: it.description.trim(),
              quantity: it.quantity,
              unitPriceKobo: Math.round(it.unitPriceNaira * 100),
            })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body?.error || 'Failed to create order');
        setSubmitting(false);
        return;
      }
      router.push(`/orders/${body.data.id}`);
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
          <label className="mb-1 block text-sm font-semibold text-slate-700">Customer (existing)</label>
          <select
            value={customerId}
            onChange={(e) => pickCustomer(e.target.value)}
            className="input"
          >
            <option value="">— Walk-in / new —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Customer name <span className="text-rose-500">*</span>
          </label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Phone</label>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="input"
            placeholder="0801…"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Due / pickup date</label>
          <input
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            type="date"
            className="input"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Items</h3>
          <button
            type="button"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                { productId: '', description: '', quantity: 1, unitPriceNaira: 0 },
              ])
            }
            className="btn-secondary inline-flex items-center gap-1 text-xs"
          >
            <Plus size={14} /> Add line
          </button>
        </div>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Product
                  </label>
                  <select
                    value={it.productId}
                    onChange={(e) => pickProduct(i, e.target.value)}
                    className="input"
                  >
                    <option value="">— Custom —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </label>
                  <input
                    value={it.description}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)),
                      )
                    }
                    className="input"
                    placeholder="What was ordered?"
                  />
                </div>
                <div className="sm:col-span-1">
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
                <div className="sm:col-span-2">
                  <label className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unit price (₦)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.unitPriceNaira}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x, idx) =>
                          idx === i ? { ...x, unitPriceNaira: Number(e.target.value) } : x,
                        ),
                      )
                    }
                    className="input"
                  />
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
          ))}
        </ul>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">Notes</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
          placeholder="Anything we should remember about this order"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <span className="text-sm font-semibold text-emerald-700">Total</span>
        <span className="text-xl font-black text-emerald-900">
          ₦{Math.round(totalKobo / 100).toLocaleString('en-NG')}
        </span>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Creating…' : 'Create order'}
        </button>
      </div>
    </form>
  );
}
