'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ShoppingBag, Check } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  trackStock: boolean;
};

type LineItem = {
  key: string;
  productId: string;
  description: string;
  unitPrice: number;
  quantity: number;
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'POS', label: 'POS' },
  { value: 'CARD', label: 'Card' },
];

export function RecordSaleForm() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<LineItem[]>([
    { key: crypto.randomUUID(), productId: '', description: '', unitPrice: 0, quantity: 1 },
  ]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState('');
  const [sendReceipt, setSendReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ saleNumber: string; total: number } | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => null);
  }, []);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: crypto.randomUUID(), productId: '', description: '', unitPrice: 0, quantity: 1 },
    ]);
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.key !== key)));
  }

  function updateItem(key: string, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = { ...item, [field]: value };
        // When a product is selected, fill in description and price
        if (field === 'productId' && value) {
          const product = products.find((p) => p.id === value);
          if (product) {
            updated.description = product.name;
            updated.unitPrice = product.price;
          }
        }
        return updated;
      }),
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const hasValidItems = items.some((i) => i.description.trim() && i.unitPrice > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasValidItems) {
      setError('Add at least one item with a name and price.');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        paymentMethod,
        discount,
        note: note.trim() || undefined,
        sendReceipt: sendReceipt && !!customerEmail.trim(),
        items: items
          .filter((i) => i.description.trim() && i.unitPrice > 0)
          .map((i) => ({
            productId: i.productId || undefined,
            description: i.description,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to record sale');
        return;
      }

      setSuccess({ saleNumber: json.saleNumber, total: json.total });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="mx-auto max-w-md text-center py-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
          <Check size={32} className="text-success-600" />
        </div>
        <h2 className="text-xl font-bold text-ink">Sale Recorded!</h2>
        <p className="mt-2 text-sm text-slate-500">
          {success.saleNumber} — {formatNaira(success.total)}
        </p>
        {sendReceipt && customerEmail && (
          <p className="mt-1 text-xs text-brand-600">Receipt sent to {customerEmail}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setSuccess(null);
              setItems([{ key: crypto.randomUUID(), productId: '', description: '', unitPrice: 0, quantity: 1 }]);
              setCustomerName('');
              setCustomerPhone('');
              setCustomerEmail('');
              setDiscount(0);
              setNote('');
              setSendReceipt(false);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Record Another
          </button>
          <button onClick={() => router.push('/sales')} className="btn-secondary">
            View All Sales
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Line items */}
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold text-ink">Items Sold</h3>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.key} className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  {/* Product selector */}
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(item.key, 'productId', e.target.value)}
                    className="input flex-1"
                  >
                    <option value="">Select product or type manually</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatNaira(p.price)}{p.trackStock ? ` (${p.stock} left)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.description}
                    onChange={(e) => updateItem(item.key, 'description', e.target.value)}
                    className="input flex-1"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(item.key, 'unitPrice', parseInt(e.target.value) || 0)}
                    className="input w-28"
                    min={0}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.key, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="input w-16"
                    min={1}
                  />
                </div>
                {item.unitPrice > 0 && item.quantity > 0 && (
                  <div className="text-xs text-slate-500 num">
                    Line total: {formatNaira(item.unitPrice * item.quantity)}
                  </div>
                )}
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="mt-2 p-1 text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <Plus size={16} /> Add another item
        </button>
      </div>

      {/* Customer info */}
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold text-ink">Customer (optional)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="08012345678"
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@email.com"
              className="input"
            />
          </div>
        </div>
        {customerEmail && (
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={sendReceipt}
              onChange={(e) => setSendReceipt(e.target.checked)}
              className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
            />
            Send receipt to this email
          </label>
        )}
      </div>

      {/* Payment method & extras */}
      <div className="card p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Payment method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    paymentMethod === m.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-border bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Discount (₦)</label>
            <input
              type="number"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="input"
              min={0}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="label">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any notes about this sale..."
            className="input"
            rows={2}
          />
        </div>
      </div>

      {/* Summary & submit */}
      <div className="card p-5">
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal ({items.filter(i => i.description && i.unitPrice > 0).length} items)</span>
            <span className="num">{formatNaira(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-owed-600">
              <span>Discount</span>
              <span className="num">-{formatNaira(discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-xl font-bold text-ink">
            <span>Total</span>
            <span className="num">{formatNaira(total)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !hasValidItems}
          className="btn-primary mt-4 w-full justify-center disabled:opacity-50"
        >
          <ShoppingBag size={18} />
          {submitting ? 'Recording...' : 'Complete Sale'}
        </button>
      </div>
    </form>
  );
}
