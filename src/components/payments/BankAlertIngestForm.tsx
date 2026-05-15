'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, MessageSquareText, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Paste-an-SMS form. Owner pastes the raw bank alert from their phone;
 * we POST to /api/bank-alerts/ingest which parses + creates an unverified
 * Payment row. On success the owner is bounced to the new Payment's
 * detail page so they can confirm or edit it.
 *
 * Lives client-side because we want optimistic feedback while parsing.
 */
export function BankAlertIngestForm() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    amount: string;
    payer: string | null;
    bank: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPreview(null);
    const rawText = text.trim();
    if (rawText.length < 12) {
      setError('Paste the full SMS — needs at least 12 characters.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/bank-alerts/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Could not parse the SMS.');
          return;
        }
        const p = data?.data?.parsed;
        if (p) {
          setPreview({
            amount: '₦' + (p.amountKobo / 100).toLocaleString('en-NG'),
            payer: p.payerName,
            bank: p.bank,
          });
        }
        // Small pause so the success preview is visible before navigation.
        const paymentId = data?.data?.paymentId;
        if (paymentId) {
          setTimeout(() => router.push(`/payments/${paymentId}`), 800);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error.');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MessageSquareText size={14} className="text-brand-700" />
          Paste the bank SMS
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Example: GTBank Alert: NGN15,000.00 CR Acct: 0123456789. From ADAEZE OKAFOR. Bal: NGN42,300.00. Ref: 1234567890"
          rows={5}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-mono focus:border-brand-500 focus:outline-none"
          style={{ minHeight: 'auto' }}
        />
        <p className="mt-1.5 text-[11px] text-slate-500">
          Works with GTBank, UBA, Access, Zenith, First Bank, FCMB, Kuda, Opay, Palmpay, Moniepoint and others.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <div className="flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 p-3 text-xs text-success-800">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Parsed successfully — opening payment…</div>
            <div className="mt-0.5">
              <span className="num font-bold">{preview.amount}</span>
              {preview.payer ? ` from ${preview.payer}` : ' (no payer name found)'} · {preview.bank}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-400 disabled:opacity-60"
      >
        <Banknote size={16} />
        {pending ? 'Parsing SMS…' : 'Confirm payment from alert'}
      </button>
    </form>
  );
}
