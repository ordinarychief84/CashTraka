'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Banknote,
  MessageSquareText,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
} from 'lucide-react';

/**
 * Paste-an-SMS form (Decision 1 of 5).
 *
 * Three UI states drive off the typed parser result:
 *
 *   STATE A (success): parser found amount + sender → server creates the
 *     Payment immediately and we bounce to its detail page. The owner
 *     sees a brief success preview while the navigation runs.
 *
 *   STATE B (partial): parser found the amount but not the sender → we
 *     pre-fill the amount and prompt for the sender inline. On submit
 *     we re-POST with `manualSender` and the server creates the Payment
 *     with parseSource='PARTIAL'.
 *
 *   STATE C (failed): parser couldn't read the SMS → we render a full
 *     manual-entry form (amount, sender, date). The Payment is created
 *     with parseSource='MANUAL_ENTERED'. Owner still confirms; the
 *     downstream verification flow is unchanged.
 *
 * No state is ever an error toast that leaves the owner stranded. Every
 * failure is recoverable from this single page.
 */

type ApiOk =
  | { status: 'success'; paymentId: string; parseSource: 'AUTO' | 'PARTIAL' | 'MANUAL_ENTERED' }
  | { status: 'partial'; amountKobo: number; bank: string; reference: string | null }
  | { status: 'failed' };

type Step =
  | { kind: 'idle' }
  | { kind: 'partial'; amountKobo: number; bank: string; reference: string | null }
  | { kind: 'failed' }
  | { kind: 'success'; amount: string; sender: string };

function naira(kobo: number): string {
  return '₦' + Math.round(kobo / 100).toLocaleString('en-NG');
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function BankAlertIngestForm() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [partialSender, setPartialSender] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualSender, setManualSender] = useState('');
  const [manualDate, setManualDate] = useState(todayIso());
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep({ kind: 'idle' });
    setError(null);
    setPartialSender('');
    setManualAmount('');
    setManualSender('');
    setManualDate(todayIso());
  }

  async function post(body: Record<string, unknown>): Promise<void> {
    setError(null);
    const res = await fetch('/api/bank-alerts/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({} as { success?: boolean; data?: unknown; error?: string }));

    if (!res.ok) {
      setError((json as { error?: string })?.error || 'Could not parse the SMS.');
      return;
    }

    const data = (json as { data?: ApiOk })?.data;
    if (!data) {
      setError('Unexpected server response.');
      return;
    }

    if ('paymentId' in data) {
      // STATE A or STATE B-after-submit or STATE C-after-submit — Payment created.
      const amountKobo =
        body.manualAmountKobo && typeof body.manualAmountKobo === 'number'
          ? body.manualAmountKobo
          : 0;
      const sender =
        (typeof body.manualSender === 'string' && body.manualSender) ||
        'payment';
      setStep({
        kind: 'success',
        amount: amountKobo > 0 ? naira(amountKobo) : 'Payment',
        sender,
      });
      setTimeout(() => router.push(`/payments/${data.paymentId}`), 700);
      return;
    }

    if (data.status === 'partial') {
      setStep({
        kind: 'partial',
        amountKobo: data.amountKobo,
        bank: data.bank,
        reference: data.reference,
      });
      return;
    }

    if (data.status === 'failed') {
      setStep({ kind: 'failed' });
      return;
    }

    setError('Unexpected server response.');
  }

  function onPasteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const rawText = text.trim();
    if (rawText.length < 12) {
      setError('Paste the full SMS — needs at least 12 characters.');
      return;
    }
    startTransition(() => {
      void post({ rawText });
    });
  }

  function onPartialSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step.kind !== 'partial') return;
    const sender = partialSender.trim();
    if (!sender) {
      setError('Type the sender name or account number.');
      return;
    }
    startTransition(() => {
      void post({
        rawText: text.trim(),
        manualSender: sender,
        manualAmountKobo: step.amountKobo,
      });
    });
  }

  function onManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amountNaira = Number(manualAmount.replace(/[,\s]/g, ''));
    if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
      setError('Type the amount received in naira.');
      return;
    }
    const sender = manualSender.trim();
    if (!sender) {
      setError('Type the sender name.');
      return;
    }
    const amountKobo = Math.round(amountNaira * 100);
    startTransition(() => {
      void post({
        rawText: text.trim(),
        manualAmountKobo: amountKobo,
        manualSender: sender,
        manualDate: manualDate || todayIso(),
      });
    });
  }

  /* ─────────────────── STATE A · success preview ─────────────────── */
  if (step.kind === 'success') {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 p-3 text-xs text-success-800">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">Payment recorded — opening it now…</div>
          <div className="mt-0.5">
            <span className="num font-bold">{step.amount}</span> from {step.sender}
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────── STATE B · partial: sender prompt ──────────── */
  if (step.kind === 'partial') {
    return (
      <form onSubmit={onPartialSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">
                We read the amount but couldn't find the sender.
              </div>
              <div className="mt-0.5">
                Amount: <span className="num font-bold">{naira(step.amountKobo)}</span>
                {step.bank && step.bank !== 'Unknown' ? <> · Bank: {step.bank}</> : null}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <User size={14} className="text-brand-700" />
            Who sent this?
          </label>
          <input
            type="text"
            value={partialSender}
            onChange={(e) => setPartialSender(e.target.value)}
            autoFocus
            placeholder="Name or account number"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-400 disabled:opacity-60"
          >
            <Banknote size={16} />
            {pending ? 'Recording…' : 'Record payment'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Start over
          </button>
        </div>
      </form>
    );
  }

  /* ─────────────────── STATE C · failed: full manual entry ───────── */
  if (step.kind === 'failed') {
    return (
      <form onSubmit={onManualSubmit} className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">
                We couldn't read this alert automatically.
              </div>
              <div className="mt-0.5">Enter the payment details manually below.</div>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Banknote size={14} className="text-brand-700" />
            Amount received (₦)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            autoFocus
            placeholder="e.g. 15000"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <User size={14} className="text-brand-700" />
            Sender name
          </label>
          <input
            type="text"
            value={manualSender}
            onChange={(e) => setManualSender(e.target.value)}
            placeholder="Name or account number"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Calendar size={14} className="text-brand-700" />
            Date
          </label>
          <input
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-400 disabled:opacity-60"
          >
            <Banknote size={16} />
            {pending ? 'Recording…' : 'Record payment'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Start over
          </button>
        </div>
      </form>
    );
  }

  /* ─────────────────── Idle · paste SMS ────────────────────────────── */
  return (
    <form onSubmit={onPasteSubmit} className="space-y-4">
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
          Works with GTBank, UBA, Access, Zenith, First Bank, FCMB, Kuda, Opay, Palmpay, Moniepoint and others. If we can't read it, you'll get a manual entry form on the next step.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-400 disabled:opacity-60"
      >
        <Banknote size={16} />
        {pending ? 'Reading SMS…' : 'Read the SMS'}
      </button>
    </form>
  );
}
