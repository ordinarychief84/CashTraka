'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Receipt as ReceiptIcon,
  Send,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Sparkles,
} from 'lucide-react';
import { waLink } from '@/lib/whatsapp';
import { formatNaira } from '@/lib/format';

/**
 * "Quick receipt" — create a receipt for a customer who isn't in the system yet.
 *
 * Fills a small form (name / phone / amount / optional note), creates a PAID
 * Payment under the hood (which auto-generates the receipt via payment.service),
 * then reveals the success state with WhatsApp send / view online / download.
 *
 * Why not a pure receipt with no payment record?
 *   - The seller's revenue + customer totals would drift from reality.
 *   - The PAID Payment ensures the transaction appears in reports, and the
 *     customer is auto-upserted for future follow-ups.
 * This flow is equivalent to "Add PAID payment + send receipt" done in one
 * dialog instead of two pages.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  businessName: string;
  /** Default prefilled name — optional (e.g., if user came from a customer page). */
  defaultCustomer?: { name?: string; phone?: string | null };
};

type CreateResult = {
  id: string; // payment id
  referenceCode: string | null;
  receiptId: string | null;
  receiptNumber: string | null;
};

type LineItem = { description: string; quantity: string; unitPrice: string };
const emptyItem = (): LineItem => ({ description: '', quantity: '1', unitPrice: '' });

export function CreateReceiptDialog({
  open,
  onClose,
  businessName,
  defaultCustomer,
}: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<'form' | 'success' | 'error'>('form');
  const [name, setName] = useState(defaultCustomer?.name ?? '');
  const [phone, setPhone] = useState(defaultCustomer?.phone ?? '');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

  // Compute total from line items
  const totalAmount = items.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  if (!open) return null;

  function reset() {
    setStage('form');
    setName(defaultCustomer?.name ?? '');
    setPhone(defaultCustomer?.phone ?? '');
    setItems([emptyItem()]);
    setError(null);
    setResult(null);
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function close() {
    reset();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!name.trim()) return setError('Customer name is required');
    if (!phone.trim()) return setError('Phone is required so you can send the receipt');

    // Validate items
    const validItems = items.filter((it) => it.description.trim());
    if (validItems.length === 0) return setError('Add at least one item');
    for (const it of validItems) {
      const q = Number(it.quantity);
      const p = Number(it.unitPrice);
      if (!q || q <= 0) return setError(`Quantity for "${it.description}" must be at least 1`);
      if (!p || p <= 0) return setError(`Price for "${it.description}" must be greater than zero`);
    }

    const n = totalAmount;
    if (n <= 0) return setError('Total amount must be greater than zero');

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        customerName: name.trim(),
        phone: phone.trim(),
        amount: n,
        status: 'PAID',
        items: validItems.map((it) => ({
          productId: null,
          description: it.description.trim(),
          unitPrice: Number(it.unitPrice),
          quantity: Number(it.quantity),
        })),
      };
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create receipt');

      // Response envelope is either { success, data } or legacy top-level.
      const out: CreateResult = {
        id: data?.data?.id ?? data?.id ?? '',
        referenceCode: data?.data?.referenceCode ?? data?.referenceCode ?? null,
        receiptId: data?.data?.receiptId ?? data?.receiptId ?? null,
        receiptNumber: data?.data?.receiptNumber ?? data?.receiptNumber ?? null,
      };

      if (!out.id) throw new Error('Could not determine payment id');
      setResult(out);
      setStage('success');
      // Background refresh so payments list + dashboard pick up the new row.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStage('error');
    } finally {
      setSubmitting(false);
    }
  }

  function shareOnWa() {
    if (!result) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/r/${result.id}`;
    const msg = `Hi ${name}, here is your receipt from ${businessName} for ${formatNaira(totalAmount)}${
      result.receiptNumber ? ' (' + result.receiptNumber + ')' : ''
    }: ${url}\nThank you for your patronage!`;
    window.open(waLink(phone, msg), '_blank');
  }

  function viewOnline() {
    if (!result || typeof window === 'undefined') return;
    window.open(`/r/${result.id}`, '_blank');
  }

  function downloadPdf() {
    if (!result?.receiptId || typeof window === 'undefined') return;
    const a = document.createElement('a');
    a.href = `/api/receipts/${result.receiptId}`;
    a.download = `${result.receiptNumber ?? 'receipt'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 md:items-center md:p-4"
      onClick={close}
    >
      <div
        className="card w-full max-w-md overflow-hidden rounded-t-2xl p-0 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-brand-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <ReceiptIcon size={18} />
            <span className="text-base font-bold">
              {stage === 'success' ? 'Receipt ready' : 'Quick receipt'}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={14} />
          </button>
        </div>

        {/* ─── Form stage ─── */}
        {stage === 'form' && (
          <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <p className="text-xs text-slate-600">
              Enter the customer&apos;s details. We&apos;ll record this as a paid
              transaction and generate their receipt instantly.
            </p>

            <div>
              <label htmlFor="cr-name" className="label">
                Customer name
              </label>
              <input
                id="cr-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amaka Nwosu"
                required
              />
            </div>

            <div>
              <label htmlFor="cr-phone" className="label">
                Phone
              </label>
              <input
                id="cr-phone"
                className="input"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08012345678"
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Used to send the receipt on WhatsApp.
              </p>
            </div>

            {/* ─── Line items ─── */}
            <div>
              <label className="label">Items</label>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="flex-[3]">
                      {idx === 0 && <span className="mb-1 block text-[10px] text-slate-400">Item name</span>}
                      <input
                        className="input text-sm"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="e.g. Rose perfume"
                        required
                      />
                    </div>
                    <div className="flex-[1]">
                      {idx === 0 && <span className="mb-1 block text-[10px] text-slate-400">Qty</span>}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        className="input text-sm text-center"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="flex-[2]">
                      {idx === 0 && <span className="mb-1 block text-[10px] text-slate-400">Price (₦)</span>}
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        className="input num text-sm"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                        aria-label="Remove item"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                + Add another item
              </button>
            </div>

            {/* Total preview */}
            {totalAmount > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-500">TOTAL</span>
                <span className="text-lg font-bold text-ink">{formatNaira(totalAmount)}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                <Sparkles size={16} />
                {submitting ? 'Generating…' : 'Generate receipt'}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={submitting}
                className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ─── Success stage ─── */}
        {stage === 'success' && result && (
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
              <CheckCircle2 size={28} className="shrink-0 text-brand-600" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-ink">Payment recorded</div>
                <div className="mt-0.5 truncate text-xs text-slate-600">
                  {result.receiptNumber ? (
                    <>
                      <span className="font-mono font-semibold">
                        {result.receiptNumber}
                      </span>{' '}
                      · {name} · {formatNaira(totalAmount)}
                    </>
                  ) : (
                    <>
                      {name} · {formatNaira(totalAmount)}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={shareOnWa}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#1fbd5b]"
              >
                <Send size={16} />
                Send on WhatsApp to {name.split(' ')[0] || 'customer'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={viewOnline} className="btn-secondary">
                  <Eye size={14} />
                  View online
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={!result.receiptId}
                  className="btn-secondary"
                >
                  <Download size={14} />
                  Download PDF
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={reset} className="btn-secondary">
                  New receipt
                </button>
                <button type="button" onClick={close} className="btn-secondary">
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Error stage ─── */}
        {stage === 'error' && (
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <div className="text-sm font-bold text-red-700">Could not create receipt</div>
                <div className="mt-0.5 text-xs text-red-700">{error}</div>
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStage('form')}
                className="btn-primary w-full"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
