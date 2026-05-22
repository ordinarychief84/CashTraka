'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Calendar,
  User,
  Hash,
  Package,
  FileText,
  StickyNote,
  Save,
  Search,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ProductOpt = {
  id: string;
  name: string;
  sku?: string | null;
  priceKobo: number;
};
type CustomerOpt = { id: string; name: string; phone: string };

type Line = {
  productId: string;
  description: string;
  quantity: number;
  unitPriceNaira: number;
};

/**
 * ProductCombobox — single-input search that finds products from catalog
 * OR lets the user type a free-text custom item.
 *
 * Replaces the old confusing (select + text-input) two-field combo.
 */
function ProductCombobox({
  products,
  value,
  productId,
  onChange,
  placeholder,
}: {
  products: ProductOpt[];
  value: string;
  productId: string;
  onChange: (patch: { productId: string; description: string; unitPriceNaira: number }) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return products.slice(0, 8); // show first 8 when empty/focused
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [value, products]);

  function selectProduct(p: ProductOpt) {
    onChange({
      productId: p.id,
      description: p.name,
      unitPriceNaira: p.priceKobo / 100,
    });
    setOpen(false);
    inputRef.current?.blur();
  }

  function clearProduct() {
    onChange({ productId: '', description: '', unitPriceNaira: 0 });
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="relative">
      {selectedProduct ? (
        /* ── Selected state: show chip + price, allow clearing ──── */
        <div className="flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2">
          <Package size={13} className="shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-800">
            {selectedProduct.name}
          </span>
          <span className="shrink-0 text-xs font-bold text-brand-700">
            ₦{(selectedProduct.priceKobo / 100).toLocaleString('en-NG')}
          </span>
          <button
            type="button"
            onClick={clearProduct}
            className="ml-1 shrink-0 rounded p-0.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
            title="Change product"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      ) : (
        /* ── Search state ────────────────────────────────────────── */
        <>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              value={value}
              onChange={(e) =>
                onChange({ productId: '', description: e.target.value, unitPriceNaira: 0 })
              }
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              className="input w-full pl-8"
              placeholder={
                placeholder ??
                (products.length > 0
                  ? 'Search products or type item name…'
                  : 'Type item name (e.g. "Lip gloss × 10")')
              }
            />
          </div>

          {open && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-white shadow-xl">
              {products.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500">
                  No products in catalog yet.{' '}
                  <a href="/products/new" className="font-semibold text-brand-600 hover:underline">
                    Add a product →
                  </a>
                </div>
              ) : matches.length === 0 ? (
                <div className="px-3 py-2.5 text-xs text-slate-500">
                  No matching products — keep typing to use as a custom item.
                </div>
              ) : (
                <ul className="max-h-56 overflow-y-auto py-1">
                  {matches.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectProduct(p);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                      >
                        <Package size={13} className="shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                          {p.name}
                          {p.sku && (
                            <span className="ml-1.5 text-xs text-slate-400">
                              {p.sku}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-emerald-700">
                          ₦{(p.priceKobo / 100).toLocaleString('en-NG')}
                        </span>
                      </button>
                    </li>
                  ))}
                  {value.trim() && !matches.find((p) => p.name.toLowerCase() === value.trim().toLowerCase()) && (
                    <li className="border-t border-border">
                      <div className="px-3 py-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">"{value}"</span> will be saved as a custom item.
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Prodio-inspired two-column add-order form.
 *
 * Left column carries the meta + product line items — the bulk of the
 * intake work. Right column is the meta sidebar (due date, customer
 * pickup, totals). The sticky footer holds Save / Save and stay so the
 * user can rapid-enter multiple orders without scrolling.
 */
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
  const [externalRef, setExternalRef] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [packagingMethod, setPackagingMethod] = useState('');
  const [shippingInfo, setShippingInfo] = useState('');
  const [customerPickup, setCustomerPickup] = useState(false);

  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [source, setSource] = useState<
    '' | 'WHATSAPP' | 'WALK_IN' | 'INSTAGRAM' | 'WEBSITE' | 'REFERRAL' | 'OTHER'
  >('');
  const [deliveryMethod, setDeliveryMethod] = useState<
    '' | 'PICKUP' | 'DELIVERY' | 'DISPATCH' | 'THIRD_PARTY'
  >('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PART_PAID' | 'PAID'>('UNPAID');

  const [items, setItems] = useState<Line[]>([
    { productId: '', description: '', quantity: 1, unitPriceNaira: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerSuggestions = useMemo(() => {
    if (!customerName.trim() || customerId) return [];
    const q = customerName.trim().toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [customerName, customers, customerId]);

  function pickCustomer(c: CustomerOpt) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
  }

  function updateItemCombo(
    i: number,
    patch: { productId: string; description: string; unitPriceNaira: number },
  ) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
  }

  function updateItem(i: number, patch: Partial<Line>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  /* Disable "Add item" if the last line is still empty (no product + no description) */
  const lastLine = items[items.length - 1];
  const lastLineEmpty = !lastLine?.productId && !lastLine?.description.trim();

  function addLine() {
    if (lastLineEmpty) return; // guard: don't stack empty rows
    setItems((prev) => [
      ...prev,
      { productId: '', description: '', quantity: 1, unitPriceNaira: 0 },
    ]);
  }

  function removeLine(i: number) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i),
    );
  }

  const totalKobo = items.reduce(
    (sum, it) => sum + Math.round(it.unitPriceNaira * 100) * it.quantity,
    0,
  );
  const lineCount = items.filter((it) => it.description.trim() || it.productId).length;

  async function submit(stay: boolean) {
    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (lineCount === 0) {
      setError('Add at least one item to this order.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const composedNotes = [
        notes.trim(),
        externalRef.trim() ? `Ref: ${externalRef.trim()}` : '',
        packagingMethod.trim() ? `Packaging: ${packagingMethod.trim()}` : '',
        shippingInfo.trim() ? `Shipping: ${shippingInfo.trim()}` : '',
        customerPickup ? 'Customer pickup' : '',
        internalNotes.trim() ? `(Internal) ${internalNotes.trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const res = await fetch('/api/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          dueAt: dueAt || undefined,
          priority,
          source: source || undefined,
          deliveryMethod: deliveryMethod || (customerPickup ? 'PICKUP' : undefined),
          deliveryAddress: deliveryAddress.trim() || undefined,
          paymentStatus,
          notes: composedNotes || undefined,
          items: items
            .filter((it) => it.description.trim() || it.productId)
            .map((it) => ({
              productId: it.productId || undefined,
              description: it.description.trim() || '(item)',
              quantity: it.quantity,
              unitPriceKobo: Math.round(it.unitPriceNaira * 100),
            })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        const msg = body?.error || 'Failed to create order';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('Order saved');
      if (stay) {
        setItems([{ productId: '', description: '', quantity: 1, unitPriceNaira: 0 }]);
        setNotes('');
        setExternalRef('');
        setDueAt('');
        setSubmitting(false);
        router.refresh();
      } else {
        router.push(`/orders/${body.data.id}`);
        router.refresh();
      }
    } catch (e: any) {
      const msg = e?.message ?? 'Network error';
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="space-y-4 pb-24"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column — main */}
        <div className="space-y-4 lg:col-span-2">
          {/* Customer + ref + due */}
          <section className="card p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative sm:col-span-1">
                <Field icon={User} label="Client" />
                <input
                  className="input"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerId('');
                  }}
                  placeholder="Search or type a name"
                  required
                />
                {customerSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                    {customerSuggestions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            pickCustomer(c);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <div className="font-semibold text-ink">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.phone}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Field icon={Hash} label="External order ID" />
                <input
                  className="input"
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder="e.g. ZN-9123456"
                />
              </div>
              <div>
                <Field icon={Calendar} label="Due date" required />
                <input
                  type="date"
                  className="input"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
              <div>
                <Field icon={User} label="Customer phone" />
                <input
                  className="input"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0801…"
                />
              </div>
            </div>
          </section>

          {/* Operational meta — priority + source + delivery + payment */}
          <section className="card p-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Operational details
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Field icon={Package} label="Priority" />
                <div className="flex flex-wrap gap-1">
                  {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition',
                        priority === p
                          ? p === 'URGENT'
                            ? 'bg-rose-600 text-white'
                            : p === 'HIGH'
                              ? 'bg-amber-500 text-white'
                              : p === 'LOW'
                                ? 'bg-slate-400 text-white'
                                : 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Field icon={StickyNote} label="Source" />
                <select
                  className="input"
                  value={source}
                  onChange={(e) => setSource(e.target.value as typeof source)}
                >
                  <option value="">Where did this order come in?</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="WEBSITE">Website</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Field icon={Package} label="Delivery method" />
                <select
                  className="input"
                  value={deliveryMethod}
                  onChange={(e) =>
                    setDeliveryMethod(e.target.value as typeof deliveryMethod)
                  }
                >
                  <option value="">—</option>
                  <option value="PICKUP">Customer pickup</option>
                  <option value="DELIVERY">We deliver</option>
                  <option value="DISPATCH">Dispatch rider</option>
                  <option value="THIRD_PARTY">Third-party courier</option>
                </select>
              </div>
              <div>
                <Field icon={StickyNote} label="Payment status" />
                <div className="flex gap-1">
                  {(['UNPAID', 'PART_PAID', 'PAID'] as const).map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setPaymentStatus(s)}
                      className={cn(
                        'flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition',
                        paymentStatus === s
                          ? s === 'PAID'
                            ? 'bg-emerald-600 text-white'
                            : s === 'PART_PAID'
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                      )}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              {(deliveryMethod === 'DELIVERY' ||
                deliveryMethod === 'DISPATCH' ||
                deliveryMethod === 'THIRD_PARTY') && (
                <div className="sm:col-span-2">
                  <Field icon={Package} label="Delivery address" />
                  <input
                    className="input"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street, city — what the courier needs"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Items */}
          <section className="card overflow-hidden">
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                <Package size={14} />
                Items
                {lineCount > 0 && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                    {lineCount}
                  </span>
                )}
              </div>
              {products.length === 0 && (
                <a
                  href="/products/new"
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  + Add products to catalog
                </a>
              )}
            </header>

            {/* Column headers (desktop) */}
            <div className="hidden grid-cols-12 gap-2 border-b border-border bg-slate-50/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Product / Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Unit price (₦)</div>
              <div className="col-span-1 text-right">Subtotal</div>
              <div className="col-span-1" />
            </div>

            <ul className="divide-y divide-border">
              {items.map((it, i) => {
                const subtotalKobo =
                  Math.round(it.unitPriceNaira * 100) * (it.quantity || 0);
                return (
                  <li key={i} className="p-3 sm:px-4 sm:py-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-start">
                      {/* Row number */}
                      <div className="hidden sm:col-span-1 sm:flex sm:items-center sm:pt-2.5">
                        <span className="text-xs font-mono text-slate-400">{i + 1}</span>
                      </div>

                      {/* Product / Item combobox */}
                      <div className="sm:col-span-5">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:hidden">
                          Product / Item
                        </label>
                        <ProductCombobox
                          products={products}
                          value={it.description}
                          productId={it.productId}
                          onChange={(patch) => updateItemCombo(i, patch)}
                        />
                      </div>

                      {/* Qty + Unit price */}
                      <div className="grid grid-cols-2 gap-2 sm:col-span-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) =>
                              updateItem(i, {
                                quantity: Math.max(1, Number(e.target.value || 1)),
                              })
                            }
                            className="input text-center"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            ₦ / unit
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.unitPriceNaira}
                            onChange={(e) =>
                              updateItem(i, {
                                unitPriceNaira: Number(e.target.value || 0),
                              })
                            }
                            className="input text-right"
                          />
                        </div>
                      </div>

                      {/* Subtotal + remove */}
                      <div className="flex items-center justify-between sm:col-span-2 sm:flex-col sm:items-end sm:gap-1 sm:pt-2">
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            subtotalKobo === 0 ? 'text-slate-400' : 'text-ink',
                          )}
                        >
                          ₦{(subtotalKobo / 100).toLocaleString('en-NG')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          disabled={items.length === 1}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                          aria-label="Remove line"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={addLine}
                disabled={lastLineEmpty}
                title={lastLineEmpty ? 'Fill in the current item first' : 'Add another item'}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition',
                  lastLineEmpty
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-amber-500 text-white hover:bg-amber-600',
                )}
              >
                <Plus size={12} />
                Add another item
              </button>
              {lastLineEmpty && items.length > 1 && (
                <span className="ml-3 text-xs text-slate-500">
                  Fill in item {items.length} first
                </span>
              )}
            </div>
          </section>

          {/* Notes + additional fields */}
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <Field icon={StickyNote} label="Notes for all" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="input"
                placeholder="Visible to anyone working on this order"
              />
            </div>
            <div>
              <Field icon={FileText} label="Notes hidden from production" />
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                className="input"
                placeholder="Pricing context, internal flags, etc."
              />
            </div>
            <div>
              <Field icon={Package} label="Packaging method" />
              <input
                value={packagingMethod}
                onChange={(e) => setPackagingMethod(e.target.value)}
                className="input"
                placeholder="e.g. Carton of 12"
              />
            </div>
            <div>
              <Field icon={FileText} label="Shipping" />
              <input
                value={shippingInfo}
                onChange={(e) => setShippingInfo(e.target.value)}
                className="input"
                placeholder="e.g. GIG Lagos → Ibadan"
              />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 self-end pb-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={customerPickup}
                onChange={(e) => setCustomerPickup(e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              <span className="font-medium text-ink">Customer pickup</span>
            </label>
          </section>
        </div>

        {/* Right column — sticky summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Order Summary
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Items</dt>
                <dd className="font-semibold text-ink">{lineCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Net</dt>
                <dd className="num font-semibold text-ink">
                  ₦{Math.round(totalKobo / 100).toLocaleString('en-NG')}
                </dd>
              </div>
              <div className="my-2 border-t border-dashed border-border" />
              <div className="flex items-center justify-between">
                <dt className="font-bold text-ink">Total</dt>
                <dd className="num text-xl font-black text-emerald-700">
                  ₦{Math.round(totalKobo / 100).toLocaleString('en-NG')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card p-5 text-xs text-slate-500">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              How it works
            </div>
            <ol className="list-decimal space-y-1.5 pl-4 leading-relaxed">
              <li>Save → order created in <strong>New</strong> status.</li>
              <li>Confirm → goes to production planning.</li>
              <li>Production complete → auto-invoice + receipt.</li>
            </ol>
          </div>
        </aside>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur md:pl-56">
        <div className="container-app flex items-center justify-end gap-2 py-3">
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={submitting}
            className="btn-pill-ghost"
          >
            <Save size={14} />
            Save and stay
          </button>
          <button type="submit" disabled={submitting} className="btn-pill-primary">
            {submitting ? 'Saving…' : 'Save order'}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  required,
}: {
  icon: LucideIcon;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      <Icon size={12} className="text-slate-400" />
      {label}
      {required ? <span className="text-rose-500">*</span> : null}
    </label>
  );
}
