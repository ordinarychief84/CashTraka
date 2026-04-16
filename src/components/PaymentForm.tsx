'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Package } from 'lucide-react';
import { formatNaira } from '@/lib/format';

type Initial = {
  id?: string;
  customerName?: string;
  phone?: string;
  amount?: number;
  status?: 'PAID' | 'PENDING';
};

type LineItem = {
  productId: string | null;
  description: string;
  unitPrice: number;
  quantity: number;
  maxStock?: number | null;
};

type ProductOption = {
  id: string;
  name: string;
  price: number;
  stock: number;
  trackStock: boolean;
};

type Props = {
  redirectTo?: string;
  onSuccess?: () => void;
  /** If present, the form edits the record at /api/payments/{id} via PATCH. */
  initial?: Initial;
  /** When true, the new-payment form shows an optional product line-item picker. */
  enableLineItems?: boolean;
};

export function PaymentForm({
  redirectTo = '/payments',
  onSuccess,
  initial,
  enableLineItems = false,
}: Props) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [items, setItems] = useState<LineItem[]>([]);
  const [manualAmount, setManualAmount] = useState<string>(
    initial?.amount ? String(initial.amount) : '',
  );

  // Load products lazily if line items are enabled.
  useEffect(() => {
    if (!enableLineItems) return;
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(() => {});
  }, [enableLineItems]);

  const computedTotal = useMemo(
    () => items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
    [items],
  );

  const effectiveAmount =
    items.length > 0 ? computedTotal : Number(manualAmount) || 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      customerName: String(form.get('customerName') || ''),
      phone: String(form.get('phone') || ''),
      amount: effectiveAmount,
      status: String(form.get('status') || 'PAID'),
    };
    if (enableLineItems && items.length > 0) {
      payload.items = items.map((it) => ({
        productId: it.productId,
        description: it.description,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      }));
    }
    try {
      const res = await fetch(
        editing ? `/api/payments/${initial!.id}` : '/api/payments',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save');
      onSuccess?.();
      // If the save produced a PAID payment the API also auto-generated a
      // receipt. Hint the destination page to open the receipt dialog right
      // away so the owner can send it without an extra click.
      const paymentId = editing ? initial!.id : data?.data?.id || data?.id;
      const opened = paymentId && payload.status === 'PAID' ? `?openReceipt=${paymentId}` : '';
      router.push(redirectTo + opened);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  function addProduct(productId: string) {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        description: prod.name,
        unitPrice: prod.price,
        quantity: 1,
        maxStock: prod.trackStock ? prod.stock : null,
      },
    ]);
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        name="customerName"
        label="Customer name"
        placeholder="e.g. Amaka Nwosu"
        defaultValue={initial?.customerName}
        required
      />
      <Field
        name="phone"
        label="Phone number"
        placeholder="08012345678"
        inputMode="tel"
        defaultValue={initial?.phone}
        required
      />

      {enableLineItems && (
        <div className="rounded-lg border border-border bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Package size={16} className="text-brand-600" />
              Products sold (optional)
            </div>
            {items.length > 0 && (
              <span className="text-xs text-slate-500">Auto-decrements stock</span>
            )}
          </div>

          {items.length === 0 && products.length === 0 && (
            <p className="text-xs text-slate-600">
              No products in your catalog yet. Type the amount below, or add a product first.
            </p>
          )}

          {products.length > 0 && (
            <div>
              <select
                className="input"
                value=""
                onChange={(e) => {
                  if (e.target.value) addProduct(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">+ Add product from catalog…</option>
                {products.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={p.trackStock && p.stock <= 0}
                  >
                    {p.name} — {formatNaira(p.price)}
                    {p.trackStock ? ` · ${p.stock} in stock` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {items.length > 0 && (
            <ul className="mt-3 space-y-2">
              {items.map((it, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">
                        {it.description}
                      </div>
                      {typeof it.maxStock === 'number' && (
                        <div className="text-xs text-slate-500">
                          {it.maxStock} in stock
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label="Remove"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Qty</label>
                      <input
                        type="number"
                        min={1}
                        max={it.maxStock ?? undefined}
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Unit ₦</label>
                      <input
                        type="number"
                        min={0}
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(i, { unitPrice: Math.max(0, Number(e.target.value)) })
                        }
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Line</label>
                      <div className="input num flex items-center bg-slate-50 text-ink">
                        {formatNaira(it.unitPrice * it.quantity)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-3">
          <span className="text-sm font-semibold text-ink">Total</span>
          <span className="num text-xl text-brand-700">{formatNaira(computedTotal)}</span>
        </div>
      ) : (
        <div>
          <label htmlFor="amount" className="label">Amount (₦)</label>
          <input
            id="amount"
            name="amount"
            type="number"
            min={1}
            placeholder="e.g. 5000"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            className="input"
            required
          />
        </div>
      )}

      <div>
        <label className="label">Status</label>
        <div className="grid grid-cols-2 gap-3">
          <StatusRadio
            name="status"
            value="PAID"
            label="Paid"
            defaultChecked={(initial?.status ?? 'PAID') === 'PAID'}
          />
          <StatusRadio
            name="status"
            value="PENDING"
            label="Pending"
            defaultChecked={initial?.status === 'PENDING'}
          />
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Save payment'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  ...rest
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input
        id={name}
        name={name}
        className="input"
        defaultValue={defaultValue ?? ''}
        {...rest}
      />
    </div>
  );
}

function StatusRadio({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-3 text-sm font-medium has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-brand-500"
      />
      {label}
    </label>
  );
}
