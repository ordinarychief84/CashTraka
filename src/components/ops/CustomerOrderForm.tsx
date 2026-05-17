'use client';

import { useMemo, useState } from 'react';
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

  // Bundle B additions — priority / source / delivery / payment status.
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>(
    'NORMAL',
  );
  const [source, setSource] = useState<
    '' | 'WHATSAPP' | 'WALK_IN' | 'INSTAGRAM' | 'WEBSITE' | 'REFERRAL' | 'OTHER'
  >('');
  const [deliveryMethod, setDeliveryMethod] = useState<
    '' | 'PICKUP' | 'DELIVERY' | 'DISPATCH' | 'THIRD_PARTY'
  >('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<
    'UNPAID' | 'PART_PAID' | 'PAID'
  >('UNPAID');

  const [items, setItems] = useState<Line[]>([
    { productId: '', description: '', quantity: 1, unitPriceNaira: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerSuggestions = useMemo(() => {
    if (!customerName.trim() || customerId) return [];
    const q = customerName.trim().toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [customerName, customers, customerId]);

  function pickCustomer(c: CustomerOpt) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
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

  function updateItem(i: number, patch: Partial<Line>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function addLine() {
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
  const lineCount = items.filter((it) => it.description.trim()).length;

  async function submit(stay: boolean) {
    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (lineCount === 0) {
      setError('Add at least one item.');
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
        const msg = body?.error || 'Failed to create order';
        setError(msg);
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('Order saved');
      if (stay) {
        // Reset for next order — keep customer fields, clear items.
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
              </div>
              <div className="text-xs text-slate-500">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </div>
            </header>

            {/* Header row (desktop) */}
            <div className="hidden grid-cols-12 gap-2 border-b border-border bg-slate-50/50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:grid">
              <div className="col-span-1">No.</div>
              <div className="col-span-5">Product</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Unit price (₦)</div>
              <div className="col-span-1 text-right">Subtotal</div>
              <div className="col-span-1" />
            </div>

            <ul className="divide-y divide-border">
              {items.map((it, i) => {
                const subtotalKobo =
                  Math.round(it.unitPriceNaira * 100) * (it.quantity || 0);
                return (
                  <li key={i} className="p-3 sm:px-4 sm:py-2.5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                      <div className="hidden sm:col-span-1 sm:block text-xs font-mono text-slate-400">
                        {i + 1}
                      </div>
                      <div className="sm:col-span-5">
                        <div className="flex gap-2">
                          <select
                            value={it.productId}
                            onChange={(e) => pickProduct(i, e.target.value)}
                            className="input min-w-0 flex-1 sm:w-40 sm:flex-none"
                          >
                            <option value="">Custom</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <input
                            value={it.description}
                            onChange={(e) =>
                              updateItem(i, { description: e.target.value })
                            }
                            className="input min-w-0 flex-1"
                            placeholder="Search product or describe"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:col-span-5 sm:grid-cols-2">
                        <div className="sm:hidden col-span-1 self-center text-[10px] font-bold uppercase text-slate-500">
                          Qty
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(i, {
                              quantity: Math.max(1, Number(e.target.value || 1)),
                            })
                          }
                          className="input col-span-2 text-right sm:col-span-1"
                        />
                        <div className="sm:hidden col-span-1 self-center text-[10px] font-bold uppercase text-slate-500">
                          ₦
                        </div>
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
                          className="input col-span-2 text-right sm:col-span-1"
                        />
                      </div>
                      <div
                        className={cn(
                          'sm:col-span-1 text-right text-sm font-semibold text-ink',
                          subtotalKobo === 0 && 'text-slate-400',
                        )}
                      >
                        ₦{(subtotalKobo / 100).toLocaleString('en-NG')}
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
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

            <div className="border-t border-border px-4 py-2">
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
              >
                <Plus size={12} />
                Add item
              </button>
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
              Summary
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
            <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              How it flows
            </div>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Save creates the customer order in <strong>NEW</strong>.</li>
              <li>Confirm to send to production planning.</li>
              <li>Production complete → invoice + receipt.</li>
            </ol>
          </div>
        </aside>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Sticky bottom action bar — Save / Save and stay (Prodio pattern) */}
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
            {submitting ? 'Saving…' : 'Save'}
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
