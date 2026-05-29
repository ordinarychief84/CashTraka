'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Search,
  Package,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ProductOpt = {
  id: string;
  name: string;
  sku?: string | null;
  priceKobo: number;
  stock?: number | null;
};
type CustomerOpt = { id: string; name: string; phone: string };

type Line = {
  productId: string;
  description: string;
  quantity: number;
  unitPriceNaira: number;
};

/* ── Inline product search combobox ─────────────────────────────── */
function ProductCombobox({
  products,
  value,
  productId,
  onChange,
}: {
  products: ProductOpt[];
  value: string;
  productId: string;
  onChange: (patch: { productId: string; description: string; unitPriceNaira: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [value, products]);

  const selectedProduct = products.find((p) => p.id === productId);

  if (selectedProduct) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {selectedProduct.name}
        </span>
        <button
          type="button"
          onClick={() => onChange({ productId: '', description: '', unitPriceNaira: 0 })}
          className="shrink-0 text-slate-400 hover:text-rose-500"
          title="Change product"
        >
          <ChevronDown size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <Search size={12} className="shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) =>
            onChange({ productId: '', description: e.target.value, unitPriceNaira: 0 })
          }
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full bg-transparent py-0.5 text-sm text-ink outline-none placeholder:text-slate-400"
          placeholder="Search product or type name…"
        />
      </div>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-white shadow-xl">
          {products.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No catalog products —{' '}
              <a href="/products/new" className="font-semibold text-brand-600 hover:underline">
                add one →
              </a>
            </div>
          ) : matches.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No match — keep typing to use as a custom item.
            </div>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange({
                        productId: p.id,
                        description: p.name,
                        unitPriceNaira: p.priceKobo / 100,
                      });
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Package size={12} className="shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                      {p.name}
                      {p.sku && <span className="ml-1 text-slate-400">{p.sku}</span>}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-success-700">
                      ₦{(p.priceKobo / 100).toLocaleString('en-NG')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main form ───────────────────────────────────────────────────── */
export function CustomerOrderForm({
  products,
  customers,
}: {
  products: ProductOpt[];
  customers: CustomerOpt[];
}) {
  const router = useRouter();

  /* core fields */
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [dueAt, setDueAt] = useState('');

  /* notes */
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  /* additional */
  const [packagingMethod, setPackagingMethod] = useState('');
  const [shippingInfo, setShippingInfo] = useState('');
  const [customerPickup, setCustomerPickup] = useState(false);
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [source, setSource] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PART_PAID' | 'PAID'>('UNPAID');
  const [showAdditional, setShowAdditional] = useState(false);

  /* line items */
  const [items, setItems] = useState<Line[]>([
    { productId: '', description: '', quantity: 1, unitPriceNaira: 0 },
  ]);

  /* ui state */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* customer typeahead */
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

  /* line item helpers */
  function updateItemCombo(
    i: number,
    patch: { productId: string; description: string; unitPriceNaira: number },
  ) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function updateItem(i: number, patch: Partial<Line>) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  const lastLine = items[items.length - 1];
  const lastLineEmpty = !lastLine?.productId && !lastLine?.description.trim();

  function addLine() {
    if (lastLineEmpty) return;
    setItems((prev) => [
      ...prev,
      { productId: '', description: '', quantity: 1, unitPriceNaira: 0 },
    ]);
  }

  function removeLine(i: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  /* derived values */
  const totalKobo = items.reduce(
    (sum, it) => sum + Math.round(it.unitPriceNaira * 100) * it.quantity,
    0,
  );
  const lineCount = items.filter((it) => it.description.trim() || it.productId).length;
  const productLookup = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  /* submit */
  async function submit(stay: boolean) {
    if (!customerName.trim()) {
      setError('Client name is required.');
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
        const msg = body?.error ?? 'Failed to create order';
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
      className="pb-28"
    >
      <div className="card overflow-hidden">
        {/* ── Row 1: Client | External order ID | Due date ── */}
        <div className="grid grid-cols-1 divide-y divide-border border-b border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {/* Client */}
          <div className="relative p-4">
            <FieldLabel required>Client</FieldLabel>
            <input
              className="mt-1 w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-slate-400"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setCustomerId('');
              }}
              placeholder="Search or type name"
              autoComplete="off"
            />
            {customerId && (
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-success-700">
                <CheckCircle2 size={10} />
                Existing client · {customerPhone}
              </div>
            )}
            {customerSuggestions.length > 0 && (
              <ul className="absolute left-4 right-4 top-[calc(100%-4px)] z-10 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
                {customerSuggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickCustomer(c);
                      }}
                      className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <div className="text-sm font-semibold text-ink">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.phone}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* External order ID */}
          <div className="p-4">
            <FieldLabel>External order ID</FieldLabel>
            <input
              className="mt-1 w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder="e.g. ZN-9123456"
            />
          </div>

          {/* Due date */}
          <div className="p-4">
            <FieldLabel>Due date</FieldLabel>
            <input
              type="date"
              className="mt-1 w-full bg-transparent text-sm text-ink outline-none"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>
        </div>

        {/* ── Line items table ── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="w-10 px-4 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5 text-left">Product / Item</th>
                <th className="w-[90px] px-3 py-2.5 text-center">Qty</th>
                <th className="w-[120px] px-3 py-2.5 text-right">Unit price (₦)</th>
                <th className="w-[110px] px-3 py-2.5 text-right">Net</th>
                <th className="w-[90px] px-3 py-2.5 text-center">Inventory</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {items.map((it, i) => {
                const subtotalKobo = Math.round(it.unitPriceNaira * 100) * (it.quantity || 0);
                const catalogProduct = productLookup.get(it.productId);
                const stockQty = catalogProduct?.stock ?? null;
                const inStock = stockQty !== null ? stockQty >= it.quantity : null;

                return (
                  <tr key={i} className="group hover:bg-slate-50/50">
                    {/* Row # */}
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-mono text-xs text-slate-400">{i + 1}</span>
                    </td>

                    {/* Product combobox */}
                    <td className="px-3 py-2">
                      <ProductCombobox
                        products={products}
                        value={it.description}
                        productId={it.productId}
                        onChange={(patch) => updateItemCombo(i, patch)}
                      />
                    </td>

                    {/* Qty */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: Math.max(1, Number(e.target.value || 1)) })
                        }
                        className="w-full bg-transparent text-center text-sm font-semibold text-ink outline-none"
                      />
                    </td>

                    {/* Unit price */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unitPriceNaira || ''}
                        onChange={(e) =>
                          updateItem(i, { unitPriceNaira: Number(e.target.value || 0) })
                        }
                        className="w-full bg-transparent text-right text-sm text-ink outline-none placeholder:text-slate-400"
                        placeholder="0.00"
                      />
                    </td>

                    {/* Net */}
                    <td className="px-3 py-2 text-right">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          subtotalKobo === 0 ? 'text-slate-400' : 'text-ink',
                        )}
                      >
                        {subtotalKobo === 0
                          ? '—'
                          : `₦${(subtotalKobo / 100).toLocaleString('en-NG')}`}
                      </span>
                    </td>

                    {/* Inventory status */}
                    <td className="px-3 py-2 text-center">
                      {inStock === null ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : inStock ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-bold text-success-700">
                          <CheckCircle2 size={9} />
                          {stockQty}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          <AlertCircle size={9} />
                          Low
                        </span>
                      )}
                    </td>

                    {/* Remove */}
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={items.length === 1}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-20"
                        aria-label="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ADD ITEM */}
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={addLine}
            disabled={lastLineEmpty}
            title={lastLineEmpty ? 'Fill in the current item first' : 'Add item'}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-wide transition',
              lastLineEmpty
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-brand-500 text-white hover:bg-brand-600',
            )}
          >
            <Plus size={13} />
            Add item
          </button>
        </div>

        {/* ── Notes + Additional order fields ── */}
        <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {/* Notes */}
          <div className="space-y-3 p-4">
            <div>
              <FieldLabel>Notes for all</FieldLabel>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full resize-none rounded-lg border border-border bg-slate-50/60 px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:bg-white placeholder:text-slate-400"
                placeholder="Visible to everyone working on this order"
              />
            </div>
            <div>
              <FieldLabel>Notes hidden from production</FieldLabel>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="mt-1 w-full resize-none rounded-lg border border-border bg-slate-50/60 px-3 py-2 text-sm text-ink outline-none focus:border-brand-400 focus:bg-white placeholder:text-slate-400"
                placeholder="Pricing context, internal flags, etc."
              />
            </div>
          </div>

          {/* Additional fields */}
          <div className="p-4">
            {/* Payment status — always visible */}
            <div className="mb-4">
              <FieldLabel>Payment status</FieldLabel>
              <div className="mt-1 flex gap-1">
                {(['UNPAID', 'PART_PAID', 'PAID'] as const).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setPaymentStatus(s)}
                    className={cn(
                      'flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition',
                      paymentStatus === s
                        ? s === 'PAID'
                          ? 'bg-success-600 text-white'
                          : s === 'PART_PAID'
                            ? 'bg-owed-500 text-white'
                            : 'bg-slate-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                    )}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Expandable additional fields */}
            <button
              type="button"
              onClick={() => setShowAdditional((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-ink"
            >
              {showAdditional ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              Additional order fields
            </button>

            {showAdditional && (
              <div className="mt-3 space-y-3">
                {/* Priority */}
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <div className="mt-1 flex flex-wrap gap-1">
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
                                ? 'bg-owed-500 text-white'
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

                {/* Source */}
                <div>
                  <FieldLabel>Source</FieldLabel>
                  <select
                    className="input mt-1 w-full"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="">Where did this order come from?</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="WALK_IN">Walk-in</option>
                    <option value="INSTAGRAM">Instagram</option>
                    <option value="WEBSITE">Website</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Packing + Shipping */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel>Packing method</FieldLabel>
                    <input
                      className="input mt-1 w-full"
                      value={packagingMethod}
                      onChange={(e) => setPackagingMethod(e.target.value)}
                      placeholder="e.g. Carton × 12"
                    />
                  </div>
                  <div>
                    <FieldLabel>Shipping</FieldLabel>
                    <input
                      className="input mt-1 w-full"
                      value={shippingInfo}
                      onChange={(e) => setShippingInfo(e.target.value)}
                      placeholder="e.g. GIG Lagos"
                    />
                  </div>
                </div>

                {/* Delivery method */}
                <div>
                  <FieldLabel>Delivery method</FieldLabel>
                  <select
                    className="input mt-1 w-full"
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="PICKUP">Customer pickup</option>
                    <option value="DELIVERY">We deliver</option>
                    <option value="DISPATCH">Dispatch rider</option>
                    <option value="THIRD_PARTY">Third-party courier</option>
                  </select>
                </div>

                {(deliveryMethod === 'DELIVERY' ||
                  deliveryMethod === 'DISPATCH' ||
                  deliveryMethod === 'THIRD_PARTY') && (
                  <div>
                    <FieldLabel>Delivery address</FieldLabel>
                    <input
                      className="input mt-1 w-full"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Street, city"
                    />
                  </div>
                )}

                {/* Customer pickup checkbox */}
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={customerPickup}
                    onChange={(e) => setCustomerPickup(e.target.checked)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  <span className="font-medium text-ink">Customer pickup</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* ── Order total footer ── */}
        <div className="flex items-center justify-between border-t border-border bg-owed-50/60 px-4 py-3">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-ink">{lineCount}</span>{' '}
            {lineCount === 1 ? 'item' : 'items'}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Order total
            </div>
            <div className="text-xl font-black text-ink">
              ₦{Math.round(totalKobo / 100).toLocaleString('en-NG')}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      {/* ── Sticky footer ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur md:pl-60">
        <div className="container-app flex items-center gap-4 py-3">
          <div className="hidden flex-1 text-xs text-slate-600 sm:block">
            {lineCount} {lineCount === 1 ? 'item' : 'items'} ·{' '}
            <span className="font-bold text-ink">
              ₦{Math.round(totalKobo / 100).toLocaleString('en-NG')}
            </span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="btn-pill-ghost"
            >
              Save and stay
            </button>
            <button type="submit" disabled={submitting} className="btn-pill-primary">
              {submitting ? 'Saving…' : 'Save order'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ── Shared label ──────────────────────────────────────────────────── */
function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </div>
  );
}
