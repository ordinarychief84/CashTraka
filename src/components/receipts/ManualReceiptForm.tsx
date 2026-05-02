'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  X,
  Check,
  Loader2,
  ChevronLeft,
  Receipt as ReceiptIcon,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

type Props = {
  sellerVatRegistered: boolean;
  sellerVatRate: number;
  sellerHasTin: boolean;
};

type Item = {
  description: string;
  unitPrice: string;
  quantity: string;
};

function formatNaira(n: number): string {
  return '₦' + n.toLocaleString('en-NG');
}

function emptyItem(): Item {
  return { description: '', unitPrice: '', quantity: '1' };
}

/**
 * Manual sales-order entry. Used when the seller wants to issue a receipt
 * directly (not through the Payments flow). When the seller is VAT-registered,
 * the form pre-checks "Apply VAT" and exposes the rate; the totals update
 * live so the seller sees the VAT-inclusive amount before saving.
 *
 * On submit we POST /api/receipts/manual which creates a Payment(PAID), an
 * auto-Receipt, and (when VAT applies) a tax Invoice that's immediately
 * submittable to FIRS from the invoice detail page.
 */
export function ManualReceiptForm({
  sellerVatRegistered,
  sellerVatRate,
  sellerHasTin,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [buyerTin, setBuyerTin] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [applyVat, setApplyVat] = useState(sellerVatRegistered);
  const [vatRate, setVatRate] = useState(sellerVatRate);
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, it) => {
    const price = parseInt(it.unitPrice, 10) || 0;
    const qty = parseInt(it.quantity, 10) || 0;
    return s + price * qty;
  }, 0);
  const vatAmount = applyVat ? Math.round((subtotal * vatRate) / 100) : 0;
  const total = subtotal + vatAmount;

  const canSave =
    customerName.trim().length > 0 &&
    items.some((it) => it.description.trim() && parseInt(it.unitPrice, 10) > 0);

  function setItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }
  function removeItem(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim() || undefined,
        buyerTin: buyerTin.trim() || undefined,
        buyerEmail: buyerEmail.trim() || undefined,
        applyVat,
        vatRate: applyVat ? vatRate : undefined,
        note: note.trim() || undefined,
        items: items
          .filter((it) => it.description.trim() && parseInt(it.unitPrice, 10) > 0)
          .map((it) => ({
            description: it.description.trim(),
            unitPrice: parseInt(it.unitPrice, 10),
            quantity: parseInt(it.quantity, 10) || 1,
          })),
      };
      const res = await fetch('/api/receipts/manual', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        data?: { receiptId?: string; invoiceId?: string };
      };
      if (!res.ok) {
        setError(json.error ?? 'Could not create receipt.');
        setSaving(false);
        return;
      }
      const receiptId = json.data?.receiptId;
      if (receiptId) {
        startTransition(() => router.push(`/receipts/${receiptId}`));
      } else {
        startTransition(() => router.push('/receipts'));
      }
    } catch {
      setError('Network error.');
      setSaving(false);
    }
  }

  return (
    <div className="pb-32 md:pb-24">
      <div className="mb-3">
        <Link
          href="/receipts"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
        >
          <ChevronLeft size={14} /> Receipts
        </Link>
      </div>

      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <ReceiptIcon size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">New receipt</h1>
          <p className="text-sm text-slate-500">
            Enter a sales order. We will save the payment, generate the receipt,
            {applyVat ? ' issue a tax invoice (FIRS-ready)' : ''}, and link them
            together.
          </p>
        </div>
      </div>

      {/* TIN warning when VAT is on but no TIN */}
      {applyVat && !sellerHasTin ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            You have VAT enabled but no <strong>TIN</strong> on file. The tax invoice
            will save, but FIRS will reject any submission until your TIN is set.
            <Link
              href="/settings?tab=tax"
              className="ml-1 font-semibold text-brand-700 hover:underline"
            >
              Set TIN now.
            </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* LEFT */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <Label>Customer</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Name"
                required
                value={customerName}
                onChange={setCustomerName}
                placeholder="e.g. Chinedu Okeke"
                maxLength={120}
              />
              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
                placeholder="08012345678"
                maxLength={20}
                type="tel"
              />
            </div>

            {applyVat ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Buyer TIN (B2B)"
                  value={buyerTin}
                  onChange={setBuyerTin}
                  placeholder="e.g. 12345678-0001"
                  maxLength={20}
                  mono
                />
                <Field
                  label="Buyer email"
                  value={buyerEmail}
                  onChange={setBuyerEmail}
                  placeholder="optional"
                  maxLength={120}
                  type="email"
                />
              </div>
            ) : null}
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <Label className="m-0">Items</Label>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600"
              >
                <Plus size={12} /> Add item
              </button>
            </div>

            <ul className="space-y-2">
              {items.map((it, i) => {
                const lineTotal =
                  (parseInt(it.unitPrice, 10) || 0) * (parseInt(it.quantity, 10) || 0);
                return (
                  <li
                    key={i}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_88px_72px_auto]"
                  >
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => setItem(i, { description: e.target.value })}
                      placeholder="Description"
                      maxLength={120}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={it.unitPrice}
                      onChange={(e) => setItem(i, { unitPrice: e.target.value })}
                      placeholder="₦ price"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                      placeholder="Qty"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <span className="num ml-auto text-sm font-semibold text-ink sm:ml-0">
                        {formatNaira(lineTotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        title="Remove"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* VAT */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <Label>Tax</Label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300">
              <input
                type="checkbox"
                checked={applyVat}
                onChange={(e) => setApplyVat(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <ShieldCheck size={14} />
                  Apply VAT
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {sellerVatRegistered
                    ? 'Default ON because you are VAT-registered with FIRS. Uncheck per receipt if needed.'
                    : 'Default OFF because you are not VAT-registered. Turn on if this sale needs VAT.'}
                </div>

                {applyVat ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Rate
                    </label>
                    <input
                      type="number"
                      step={0.5}
                      min={0}
                      max={50}
                      value={vatRate}
                      onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">% (Nigerian standard 7.5%)</span>
                  </div>
                ) : null}
              </div>
            </label>
          </div>

          {/* Note */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <Label>Note (optional)</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Anything you want on the receipt or invoice."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* RIGHT: live totals */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Receipt summary
            </div>
            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatNaira(subtotal)} />
              {applyVat ? (
                <Row label={`VAT (${vatRate}%)`} value={formatNaira(vatAmount)} />
              ) : null}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </span>
                <span className="num text-xl font-bold text-ink">
                  {formatNaira(total)}
                </span>
              </div>
            </div>

            {applyVat ? (
              <div className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-[11px] text-brand-800">
                A tax invoice will be created and linked to this receipt. You can submit
                it to FIRS from the invoice detail page.
              </div>
            ) : null}
          </div>
        </aside>
      </form>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link
            href="/receipts"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-ink"
          >
            <ChevronLeft size={14} /> Cancel
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-500 sm:inline">
              Total: <span className="num font-semibold text-ink">{formatNaira(total)}</span>
            </span>
            <button
              type="submit"
              onClick={submit}
              disabled={!canSave || saving || pending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving || pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Generate receipt
            </button>
          </div>
        </div>
        {error ? (
          <div className="mt-2 text-center text-xs text-red-700">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ' +
        (className || '')
      }
    >
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  maxLength,
  type,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className={
          'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none ' +
          (mono ? 'font-mono' : '')
        }
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-600">
      <span>{label}</span>
      <span className="num font-semibold text-ink">{value}</span>
    </div>
  );
}
