'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { CheckCircle2, CreditCard, Sparkles, X } from 'lucide-react';
import {
  PLAN_PRICING,
  formatPriceNaira,
  isPaidPlan,
  getPlanPricing,
  FREQUENCY_DESCRIPTIONS,
  type PaidPlanKey,
} from '@/lib/billing/pricing';

/**
 * Upgrade modal.
 *
 * Opens when the URL has `?upgrade=<plan>`. Shows the plan summary + amount
 * and offers two paths:
 *   - "Start 7-day free trial" → POST /api/billing/trial
 *   - "Pay with Paystack"      → POST /api/billing/subscribe → redirect
 *
 * After a successful trial start we refresh the page so the Billing card and
 * any gated UI reflect the new plan. For paid checkout we hand off to
 * Paystack; the `/billing/callback` page handles the return trip.
 */

type TrialEligibility = {
  canTrial: boolean;
  reason?: string;
};

const STARTER_BENEFITS: string[] = [
  'Unlimited payments, debts & customers',
  'Payment links & Promise to Pay',
  'Auto-debit installment plans',
  'Smart Collection Queue',
  'Webhook-verified bank payments',
  'Auto receipts & professional invoices',
  'Expenses & real profit reports',
  'Daily Pulse WhatsApp digest',
];

export function UpgradeModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('upgrade');

  const [trialEligibility, setTrialEligibility] = useState<TrialEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = isPaidPlan(planParam);
  const pricing = useMemo(() => (open ? getPlanPricing(planParam!) : null), [open, planParam]);

  // Fetch current subscription state to decide whether to offer the trial.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/billing/status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.success) return;
        const s = j.data;
        // Trial allowed only if no subscription yet AND no trial has ever run.
        if (s.subscriptionStatus === 'free' && !s.trialEndsAt) {
          setTrialEligibility({ canTrial: true });
        } else {
          setTrialEligibility({
            canTrial: false,
            reason:
              s.subscriptionStatus === 'trialing'
                ? 'You are already on a trial.'
                : 'Trial already used.',
          });
        }
      })
      .catch(() => setTrialEligibility({ canTrial: false, reason: 'Could not load status.' }));
    return () => {
      cancelled = true;
    };
  }, [open]);

  function close() {
    // Strip the `upgrade` query param and also any `billing` flag that might
    // be sitting alongside, leaving other params intact.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('upgrade');
    params.delete('billing');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setError(null);
  }

  async function handleTrial() {
    if (!planParam) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/trial', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planParam }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not start trial');
      }
      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start trial');
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    if (!planParam) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planParam }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not start checkout');
      }
      // Hand off to Paystack's hosted page.
      window.location.href = data.data.authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout');
      setLoading(false);
    }
  }

  if (!open || !pricing) return null;
  const freqDesc = FREQUENCY_DESCRIPTIONS[pricing.frequency] ?? '';
  const trialDays = pricing.trialDays ?? 7;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 md:items-center md:p-4"
      onClick={close}
    >
      <div
        className="card relative w-full max-w-md overflow-hidden rounded-t-2xl p-0 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-brand-600 to-brand-500 px-6 py-7 text-white">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/90">
            <Sparkles size={14} />
            Upgrade
          </div>
          <div className="mt-2 text-2xl font-black">{pricing.label}</div>
          <div className="mt-1 text-xs font-medium text-white/70">{freqDesc}</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black">
              {formatPriceNaira(pricing.perMonthKobo)}
            </span>
            <span className="text-sm font-medium text-white/80">/month</span>
          </div>
          {pricing.savingsPercent > 0 && (
            <span className="mt-1 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
              Save {pricing.savingsPercent}%
            </span>
          )}
          <div className="mt-1 text-xs text-white/60">
            {formatPriceNaira(pricing.amountKobo)} total
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          <ul className="space-y-2.5 text-sm">
            {STARTER_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-2 pt-2">
            {trialEligibility?.canTrial && (
              <button
                type="button"
                onClick={handleTrial}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Starting…' : `Start ${trialDays}-day free trial`}
              </button>
            )}
            <button
              type="button"
              onClick={handlePay}
              disabled={loading}
              className={
                trialEligibility?.canTrial
                  ? 'btn-secondary w-full'
                  : 'btn-primary w-full'
              }
            >
              <CreditCard size={16} />
              {loading ? 'Please wait…' : 'Pay with Paystack'}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={loading}
              className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:text-ink"
            >
              Maybe later
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-500">
            {trialEligibility?.canTrial
              ? 'No card needed for the trial · Cancel anytime'
              : 'Cancel anytime · Secure checkout by Paystack'}
          </p>
        </div>
      </div>
    </div>
  );
}
