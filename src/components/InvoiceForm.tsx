'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type LineItem = {
  productId: string | null;
  description: string;
  unitPrice: number;
  quantity: number;
};

type ProductOption = { id: string; name: string; price: number };

type Props = { redirectTo?: string };

export function InvoiceForm({ redirectTo = '/invoices' }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<LineItem[]>([
    { productId: null, description: '', unitPrice: 0, quantity: 1 },
  ]);
  const [tax, setTax] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => {});
  }, []);

  const subtotal = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const total = subtotal + tax;

  function addBlankRow() {
    setItems((prev) => [...prev, { productId: null, description: '', unitPrice: 0, quantity: 1 }]);
  }
  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (p) setItems((prev) => [...prev, { productId: p.id, description: p.name, unitPrice: p.price, quantity: 1 }]);
  }
  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const validItems = items.filter((it) => it.description.trim() && it.unitPrice > 0);
    if (validItems.length === 0) {
      setError('Add at least one line item');
      setSubmitting(false);
      return;
    }
    const payload = {
      customerName: String(form.get('customerName') || ''),
      customerPhone: String(form.get('customerPhone') || ''),
      customerEmail: String(form.get('customerEmail') || ''),
      dueDate: String(form.get('dueDate') || ''),
      note: String(form.get('note') || ''),
      tax,
      items: validItems.map((it) => ({
        productId: it.productId,
        description: it.description,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
    };
    try {
      const res = await fetch('/api/invoices', {
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
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="customerName" className="label">Customer name</label>
          <input id="customerName" name="customerName" className="input" required placeholder="e.g. Fatima Bello" />
        </div>
        <div>
          <label htmlFor="customerPhone" className="label">Phone</label>
          <input id="customerPhone" name="customerPhone" className="input" inputMode="tel" required placeholder="08012345678" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="customerEmail" className="label">Email (optional)</label>
          <input id="customerEmail" name="customerEmail" type="email" className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="dueDate" className="label">Due date (optional)</label>
          <input id="dueDate" name="dueDate" type="date" className="input" />
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border border-border bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Line items</span>
          <div className="flex gap-2">
            {products.length > 0 && (
              <select
                className="h-8 rounded-md border border-border bg-white px-2 text-xs"
                value=""
                onChange={(e) => { if (e.target.value) addProduct(e.target.value); e.target.value = ''; }}
              >
                <option value="">+ From catalog</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {formatNaira(p.price)}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={addBlankRow} className="flex h-8 items-center gap-1 rounded-md border border-border bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Plus size={13} />
              Row
            </button>
          </div>
        </div>
        {items.map((it, i) => (
          <div key={i} className="mt-2 grid grid-cols-12 gap-2 rounded-lg border border-border bg-white p-2">
            <div className="col-span-5">
              <input
                placeholder="Description"
                className="w-full rounded-md border-0 bg-transparent p-1 text-sm outline-none placeholder:text-slate-400"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <input
                type="number"
                min={1}
                placeholder="Qty"
                className="w-full rounded-md border-0 bg-transparent p-1 text-sm outline-none"
                value={it.quantity}
                onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })}
              />
            </div>
            <div className="col-span-3">
              <input
                type="number"
                min={0}
                placeholder="₦ Price"
                className="w-full rounded-md border-0 bg-transparent p-1 text-sm outline-none"
                value={it.unitPrice || ''}
                onChange={(e) => updateItem(i, { unitPrice: Math.max(0, Number(e.target.value)) })}
              />
            </div>
            <div className="col-span-1 num flex items-center justify-end text-xs text-ink">
              {formatNaira(it.unitPrice * it.quantity)}
            </div>
            <button type="button" onClick={() => removeItem(i)} className="col-span-1 flex items-center justify-center text-slate-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="tax" className="label">Tax / VAT (₦)</label>
          <input id="tax" type="number" min={0} className="input" value={tax || ''} onChange={(e) => setTax(Math.max(0, Number(e.target.value)))} />
        </div>
        <div>
          <label htmlFor="note" className="label">Note (optional)</label>
          <input id="note" name="note" className="input" placeholder="e.g. Payment terms: 7 days" />
        </div>
      </div>

      <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3">
        <div className="flex justify-between text-xs text-slate-600">
          <span>Subtotal</span><span className="num">{formatNaira(subtotal)}</span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-xs text-slate-600">
            <span>Tax</span><span className="num">{formatNaira(tax)}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-brand-100 pt-2 text-sm font-bold text-ink">
          <span>Total</span><span className="num text-lg text-brand-700">{formatNaira(total)}</span>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating…' : 'Create invoice'}
      </button>
    </form>
  );
}
