'use client';

import { useState, useTransition } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Credit-limit setter — drops onto Customer detail.
 *
 * Server-side, debtService.create refuses to push the customer's
 * totalOwedKobo above the limit. This card lets the owner set / change
 * / clear that limit, and surfaces a "near limit" warning when the
 * current owed amount is within 25% of the cap.
 *
 * Values are entered in naira but stored as kobo. Empty input clears
 * the limit (no cap).
 */
export function CreditLimitCard({
  customerId,
  currentLimitKobo,
  totalOwedKobo,
}: {
  customerId: string;
  currentLimitKobo: number | null;
  totalOwedKobo: number;
}) {
  const [value, setValue] = useState<string>(
    currentLimitKobo != null ? String(Math.round(currentLimitKobo / 100)) : '',
  );
  const [savedLimitKobo, setSavedLimitKobo] = useState<number | null>(currentLimitKobo);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    const trimmed = value.trim();
    const naira = trimmed.length > 0 ? Number(trimmed.replace(/,/g, '')) : null;
    if (trimmed.length > 0 && (!Number.isFinite(naira) || naira! < 0)) {
      setError('Enter a positive number or leave blank to clear the limit.');
      return;
    }
    const creditLimitKobo = naira != null ? Math.round(naira * 100) : null;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/customers/${customerId}/credit-limit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creditLimitKobo }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || 'Could not save credit limit.');
          return;
        }
        setSavedLimitKobo(creditLimitKobo);
        setOkMsg(creditLimitKobo == null ? 'Credit limit cleared.' : 'Credit limit saved.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error.');
      }
    });
  }

  const owedPct =
    savedLimitKobo != null && savedLimitKobo > 0
      ? Math.round((totalOwedKobo / savedLimitKobo) * 100)
      : null;
  const overLimit = savedLimitKobo != null && totalOwedKobo > savedLimitKobo;
  const nearLimit = !overLimit && owedPct !== null && owedPct >= 75;

  return (
    <section className="card p-5">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
          <ShieldCheck size={14} className="text-brand-700" />
          Credit limit
        </h2>
        {savedLimitKobo != null && (
          <span className="num text-xs text-slate-500">
            ₦{Math.round(savedLimitKobo / 100).toLocaleString('en-NG')} cap
          </span>
        )}
      </header>

      {(overLimit || nearLimit) && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-xl border p-2.5 text-xs ${
            overLimit
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-owed-200 bg-owed-50 text-owed-800'
          }`}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            {overLimit
              ? `Over limit by ₦${Math.round((totalOwedKobo - savedLimitKobo!) / 100).toLocaleString('en-NG')}. New debts will be blocked.`
              : `At ${owedPct}% of cap. New debts may push over the limit.`}
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Max outstanding (₦)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="No limit"
            className="num w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            style={{ minHeight: 'auto' }}
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-brand-400 disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
        {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
        {okMsg && !error && <p className="text-xs font-semibold text-success-700">{okMsg}</p>}
        <p className="text-[11px] text-slate-500">
          New debts that push this customer's owed amount over the cap will be refused. Leave
          blank to remove the limit entirely.
        </p>
      </form>
    </section>
  );
}
