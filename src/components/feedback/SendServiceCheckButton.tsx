'use client';

import { useState } from 'react';
import { Heart, Copy, Check, Loader2, MessageCircle } from 'lucide-react';

type Props = {
  /** Existing Feedback row id, when one is already attached. */
  feedbackId?: string;
  /** Existing publicToken when one is attached, used to build the url. */
  publicToken?: string;
  /** Optional customer phone. When present, primary action is wa.me. */
  phone?: string;
  customerName?: string;
  /** Source document refs, passed to /api/feedback/create when minting. */
  receiptId?: string;
  paymentId?: string;
  invoiceId?: string;
  customerId?: string;
  /** 'RECEIPT' | 'PAYMENT' | 'INVOICE' | 'TRANSACTION' | 'MANUAL'. */
  source: 'RECEIPT' | 'PAYMENT' | 'INVOICE' | 'TRANSACTION' | 'MANUAL';
  /** Visual variant. */
  size?: 'sm' | 'md';
};

/**
 * "Send Service Check" button. Opens a wa.me link prefilled with the public
 * feedback URL. If no link exists yet, lazily creates one via
 * /api/feedback/create. When phone is missing, opens a popover with a
 * copy-to-clipboard button.
 */
export function SendServiceCheckButton({
  feedbackId: _initialFeedbackId,
  publicToken,
  phone,
  customerName,
  receiptId,
  paymentId,
  invoiceId,
  customerId,
  source,
  size = 'md',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popUrl, setPopUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function buildUrl(token: string) {
    return `${window.location.origin}/feedback/${token}`;
  }

  function buildMessage(url: string) {
    const name = customerName || 'there';
    return `Hi ${name}, thank you for your business. Please rate your experience: ${url}`;
  }

  async function ensureToken(): Promise<string | null> {
    if (publicToken) return publicToken;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          receiptId,
          paymentId,
          invoiceId,
          customerId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not create feedback link.');
        return null;
      }
      return data?.data?.publicToken ?? null;
    } finally {
      setBusy(false);
    }
  }

  async function onClick() {
    const token = await ensureToken();
    if (!token) return;
    const url = buildUrl(token);
    if (phone) {
      const wa = `https://wa.me/${phone.replace(/\D+/g, '')}?text=${encodeURIComponent(buildMessage(url))}`;
      window.open(wa, '_blank', 'noopener,noreferrer');
      return;
    }
    setPopUrl(url);
  }

  async function copy() {
    if (!popUrl) return;
    try {
      await navigator.clipboard.writeText(popUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy. Long-press the link to copy manually.');
    }
  }

  const cls =
    size === 'sm'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-700'
      : 'inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-400 hover:text-brand-700';

  return (
    <div className="relative inline-block">
      <button type="button" onClick={onClick} disabled={busy} className={cls}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
        {phone ? 'Ask for feedback' : 'Service Check'}
      </button>

      {error ? (
        <div className="mt-1 text-[11px] text-red-600">{error}</div>
      ) : null}

      {popUrl ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Feedback link
          </div>
          <div className="mt-1 break-all rounded-md bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
            {popUrl}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(buildMessage(popUrl))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-400"
            >
              <MessageCircle size={12} />
              WhatsApp
            </a>
          </div>
          <button
            type="button"
            onClick={() => setPopUrl(null)}
            className="mt-2 block w-full text-center text-[11px] text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
