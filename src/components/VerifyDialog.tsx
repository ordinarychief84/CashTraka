'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Shield, Check, AlertTriangle, MessageCircle, Send } from 'lucide-react';
import { formatNaira } from '@/lib/format';
import { waLink } from '@/lib/whatsapp';

type Props = {
  open: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amount: number;
    referenceCode: string | null;
    customerName: string;
    phone?: string;
  };
};

type Result =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'matched'; method: string; parsed: { amount: number; sender?: string; bank?: string; ref?: string }; receiptUrl?: string }
  | { kind: 'mismatched'; reason: string; parsed?: { amount: number; sender?: string; bank?: string; ref?: string } }
  | { kind: 'unreadable'; error: string };

export function VerifyDialog({ open, onClose, payment }: Props) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle' });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  if (!open) return null;

  async function submit() {
    setResult({ kind: 'parsing' });
    try {
      const res = await fetch(`/api/payments/${payment.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'BANK_ALERT', text }),
      });
      const data = await res.json();
      if (res.status === 422) {
        setResult({ kind: 'unreadable', error: data.error || 'Unreadable' });
        return;
      }
      if (res.status >= 400 && res.status !== 422) {
        setResult({ kind: 'unreadable', error: data.error || 'Failed' });
        return;
      }
      if (data.ok) {
        setResult({ kind: 'matched', method: data.method, parsed: data.parsed, receiptUrl: data.receiptUrl });
        // Don't auto-close — let the user see the "Send receipt" option.
        router.refresh();
      } else {
        setResult({ kind: 'mismatched', reason: data.reason, parsed: data.parsed });
      }
    } catch {
      setResult({ kind: 'unreadable', error: 'Network error' });
    }
  }

  async function confirmManually() {
    setManualSubmitting(true);
    try {
      await fetch(`/api/payments/${payment.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'MANUAL' }),
      });
      router.refresh();
      onClose();
    } finally {
      setManualSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
        >
          <X size={18} />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <Shield size={20} className="text-brand-600" />
          <h2 className="text-lg font-bold text-ink">Verify this payment</h2>
        </div>
        <p className="text-sm text-slate-600">
          Paste your real bank SMS or email credit alert. We&rsquo;ll match it against this
          payment&rsquo;s amount and reference code.
        </p>

        <div className="mt-4 rounded-lg border border-border bg-slate-50 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Expecting from {payment.customerName}</span>
            <span className="num text-sm text-ink">{formatNaira(payment.amount)}</span>
          </div>
          {payment.referenceCode && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-slate-600">Reference</span>
              <code className="font-mono font-bold text-ink">{payment.referenceCode}</code>
            </div>
          )}
        </div>

        <div className="mt-4">
          <label htmlFor="alert" className="label">
            Paste bank alert SMS or email
          </label>
          <textarea
            id="alert"
            rows={5}
            className="input font-mono text-xs"
            placeholder="e.g. Credit Alert: Your GTBank account ...1234 has been credited with NGN5,000.00 from AMAKA NWOSU on 15-Apr-2026. Ref: CT-A7F21..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Must be from your own bank, not a screenshot from the customer.
          </p>
        </div>

        {result.kind === 'matched' && (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-success-500/40 bg-success-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-success-700">
                <Check size={16} />
                Match confirmed{result.method === 'REFERENCE_MATCH' ? ' — reference code matched' : ' — sender name matched'}
              </div>
              {result.parsed && (
                <div className="mt-1 text-xs text-success-700/90">
                  {formatNaira(result.parsed.amount)}
                  {result.parsed.bank ? ` · ${result.parsed.bank}` : ''}
                  {result.parsed.sender ? ` · from ${result.parsed.sender}` : ''}
                </div>
              )}
            </div>
            {/* Auto-receipt: send the receipt to customer via WhatsApp */}
            {result.receiptUrl && payment.phone && (
              <a
                href={(() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  const receiptFullUrl = `${origin}${result.receiptUrl}`;
                  return waLink(
                    payment.phone,
                    `Hi ${payment.customerName}, your payment of ${formatNaira(payment.amount)} has been confirmed. Here is your receipt: ${receiptFullUrl}\nThank you!`,
                  );
                })()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-wa w-full"
              >
                <Send size={16} />
                Send receipt to {payment.customerName} on WhatsApp
              </a>
            )}
            <button type="button" onClick={onClose} className="btn-ghost w-full text-sm">
              Done
            </button>
          </div>
        )}

        {result.kind === 'mismatched' && (
          <div className="mt-3 rounded-lg border border-owed-500/40 bg-owed-50 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-owed-700">
              <AlertTriangle size={16} />
              No match
            </div>
            <div className="mt-1 text-xs text-owed-700/90">{result.reason}</div>
            {result.parsed && (
              <div className="mt-2 rounded-md bg-white px-2 py-1.5 text-[11px] text-slate-600">
                We read: {formatNaira(result.parsed.amount)}
                {result.parsed.sender ? ` · from ${result.parsed.sender}` : ''}
                {result.parsed.ref ? ` · ref “${result.parsed.ref}”` : ''}
              </div>
            )}
          </div>
        )}

        {result.kind === 'unreadable' && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {result.error}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!text.trim() || result.kind === 'parsing'}
            onClick={submit}
            className="btn-primary flex-1"
          >
            {result.kind === 'parsing' ? 'Checking…' : 'Verify'}
          </button>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-slate-500">
            Received the money and not using a bank alert?
          </p>
          <button
            type="button"
            onClick={confirmManually}
            disabled={manualSubmitting}
            className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {manualSubmitting ? 'Confirming…' : 'Manually confirm (I already saw the money)'}
          </button>
          <p className="mt-1.5 text-[11px] text-slate-500">
            This will mark the payment as confirmed, but it won&rsquo;t carry the
            &ldquo;Bank-verified&rdquo; badge.
          </p>
        </div>
      </div>
    </div>
  );
}
