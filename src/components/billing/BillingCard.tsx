'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  CreditCard,
  Sparkles,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
} from 'lucide-react';
import { formatPriceNaira } from '@/lib/billing/pricing';

/**
 * Billing card shown at the top of /settings. It adapts to the user's
 * subscription state:
 *   - free          → "Upgrade" CTA (opens UpgradeModal via ?upgrade=<plan>)
 *   - trialing      → trial-countdown + "Upgrade now" / "Cancel trial"
 *   - active        → "Active, renews on X" + "Change plan" / "Cancel"
 *   - past_due      → red banner + "Retry payment"
 *   - cancelled     → "Access until Y" + "Resubscribe"
 *
 * Also listens for `?billing=success` / `?billing=failed` that the callback
 * page tacks on, so it can show a toast inline.
 */

type Status = {
  plan: string;
  planLabel: string;
  businessType: string;
  subscriptionStatus: 'free' | 'trialing' | 'active' | 'past_due' | 'cancelled';
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  pendingPlan: string | null;
  suggested: {
    plan: string;
    label: string;
    amountKobo: number | null;
  };
};

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function BillingCard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/status', { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) setStatus(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Surface any ?billing=success|failed the callback page set.
  useEffect(() => {
    const flag = searchParams.get('billing');
    if (!flag) return;
    if (flag === 'success') {
      setToast({ kind: 'ok', text: 'Payment confirmed, your plan is now active.' });
    } else if (flag === 'failed') {
      setToast({
        kind: 'err',
        text: 'Payment was not completed. You have not been charged.',
      });
    }
    // Clean the param so refreshing doesn't show the toast again.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('billing');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, pathname, router]);

  function openUpgrade(plan: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('upgrade', plan);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function doCancel() {
    if (!confirm('Cancel your subscription? You will keep access until the current period ends.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not cancel');
      }
      setToast({ kind: 'ok', text: 'Subscription cancelled.' });
      await load();
    } catch (e) {
      setToast({
        kind: 'err',
        text: e instanceof Error ? e.message : 'Could not cancel',
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="card p-5">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-6 w-40 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (!status) return null;

  const trialDaysLeft =
    status.subscriptionStatus === 'trialing' ? daysUntil(status.trialEndsAt) : null;
  const renewsOn = fmtDate(status.currentPeriodEnd);
  const trialEndsOnLabel = fmtDate(status.trialEndsAt);

  return (
    <div className="card overflow-hidden p-0">
      {/* Status strip */}
      {toast && (
        <div
          className={
            'flex items-center gap-2 px-5 py-2 text-xs font-semibold ' +
            (toast.kind === 'ok'
              ? 'bg-brand-50 text-brand-700'
              : 'bg-red-50 text-red-700')
          }
        >
          {toast.kind === 'ok' ? (
            <CheckCircle2 size={14} />
          ) : (
            <XCircle size={14} />
          )}
          {toast.text}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <CreditCard size={14} />
          Billing
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-ink">{status.planLabel}</div>
            <BillingSummary status={status} trialDaysLeft={trialDaysLeft} />
          </div>
          <PlanPill status={status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {status.subscriptionStatus === 'free' && status.suggested.plan !== 'free' && (
            <button
              type="button"
              onClick={() => openUpgrade(status.suggested.plan)}
              className="btn-primary"
            >
              <Sparkles size={16} />
              Upgrade to {status.suggested.label}
              {status.suggested.amountKobo !== null && (
                <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                  {formatPriceNaira(status.suggested.amountKobo)}/mo
                </span>
              )}
            </button>
          )}

          {status.subscriptionStatus === 'trialing' && (
            <>
              <button
                type="button"
                onClick={() => openUpgrade(status.plan)}
                className="btn-primary"
              >
                <ArrowUpRight size={16} />
                Upgrade now
              </button>
              <button
                type="button"
                onClick={doCancel}
                disabled={busy}
                className="btn-secondary text-red-600"
              >
                Cancel trial
              </button>
            </>
          )}

          {status.subscriptionStatus === 'active' && (
            <>
              {status.suggested.plan !== status.plan && (
                <button
                  type="button"
                  onClick={() => openUpgrade(status.suggested.plan)}
                  className="btn-primary"
                >
                  <ArrowUpRight size={16} />
                  Change plan
                </button>
              )}
              <button
                type="button"
                onClick={doCancel}
                disabled={busy}
                className="btn-secondary text-red-600"
              >
                Cancel subscription
              </button>
            </>
          )}

          {status.subscriptionStatus === 'past_due' && (
            <button
              type="button"
              onClick={() => openUpgrade(status.plan)}
              className="btn-primary bg-red-600 hover:bg-red-700"
            >
              <CreditCard size={16} />
              Retry payment
            </button>
          )}

          {status.subscriptionStatus === 'cancelled' && (
            <button
              type="button"
              onClick={() => openUpgrade(status.plan)}
              className="btn-primary"
            >
              <Sparkles size={16} />
              Resubscribe
            </button>
          )}
        </div>

        {/* Helper text */}
        {status.subscriptionStatus === 'trialing' && (
          <p className="mt-3 text-xs text-slate-500">
            Your trial ends on <strong>{trialEndsOnLabel}</strong>. You will not be charged
           , add a payment to keep premium access.
          </p>
        )}
        {status.subscriptionStatus === 'active' && renewsOn && (
          <p className="mt-3 text-xs text-slate-500">
            Your plan renews on <strong>{renewsOn}</strong>.
          </p>
        )}
        {status.subscriptionStatus === 'cancelled' && renewsOn && (
          <p className="mt-3 text-xs text-slate-500">
            You have premium access until <strong>{renewsOn}</strong>. After that your
            account will switch to Free.
          </p>
        )}
        {status.subscriptionStatus === 'past_due' && (
          <p className="mt-3 text-xs text-red-600">
            We could not charge your last renewal. Your account is currently locked to Free
            limits until you retry.
          </p>
        )}
      </div>
    </div>
  );
}

function BillingSummary({
  status,
  trialDaysLeft,
}: {
  status: Status;
  trialDaysLeft: number | null;
}) {
  if (status.subscriptionStatus === 'trialing' && trialDaysLeft !== null) {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
        <Clock3 size={12} />
        Trial, {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left
      </div>
    );
  }
  if (status.subscriptionStatus === 'active') {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-brand-700">
        <CheckCircle2 size={12} />
        Active
      </div>
    );
  }
  if (status.subscriptionStatus === 'past_due') {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
        <AlertTriangle size={12} />
        Payment failed
      </div>
    );
  }
  if (status.subscriptionStatus === 'cancelled') {
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
        <XCircle size={12} />
        Cancelled, access continues until period end
      </div>
    );
  }
  return (
    <div className="mt-1 text-xs text-slate-600">
      You are on the free plan.
    </div>
  );
}

function PlanPill({ status }: { status: Status }) {
  const kind = status.subscriptionStatus;
  const tone =
    kind === 'active' || kind === 'trialing'
      ? 'bg-brand-50 text-brand-700'
      : kind === 'past_due'
        ? 'bg-red-50 text-red-700'
        : kind === 'cancelled'
          ? 'bg-owed-50 text-owed-700'
          : 'bg-slate-100 text-slate-600';
  const label =
    kind === 'free'
      ? 'Free'
      : kind === 'trialing'
        ? 'Trialing'
        : kind === 'active'
          ? 'Active'
          : kind === 'past_due'
            ? 'Past due'
            : 'Cancelled';
  return (
    <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ' + tone}>
      {label}
    </span>
  );
}
