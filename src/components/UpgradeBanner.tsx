'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Sparkles, X } from 'lucide-react';

/**
 * App-wide slim banner at the top of AppShell.
 *
 * Shows only when the user's billing state needs attention:
 *  - `past_due`                 → red, "Renew to keep creating records"
 *  - `trialing` ≤ 3 days left   → amber, "Your trial ends in N days"
 *  - `cancelled` w/ grace       → slate, "Access until X"
 *
 * Dismissal is per-session via sessionStorage so the banner comes back next
 * login — we don't want users silently missing a past-due state for long.
 */

type Status = {
  subscriptionStatus: 'free' | 'trialing' | 'active' | 'past_due' | 'cancelled';
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  plan: string;
};

const DISMISS_KEY = 'cashtraka_billing_banner_dismissed';

export function UpgradeBanner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    }
    fetch('/api/billing/status', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.success) setStatus(j.data);
      })
      .catch(() => {});
  }, []);

  if (!status || dismissed) return null;

  const daysLeft =
    status.subscriptionStatus === 'trialing' && status.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(status.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  let kind: 'past_due' | 'trial_ending' | 'cancelled' | null = null;
  if (status.subscriptionStatus === 'past_due') kind = 'past_due';
  else if (daysLeft !== null && daysLeft <= 3) kind = 'trial_ending';
  else if (status.subscriptionStatus === 'cancelled') kind = 'cancelled';

  if (!kind) return null;

  function close() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  if (kind === 'past_due') {
    return (
      <Banner tone="red" onDismiss={close}>
        <AlertTriangle size={14} />
        <span>
          <strong>Payment failed.</strong> Your account is locked to Free limits until you
          retry.
        </span>
        <Link href="/settings" className="underline font-semibold">
          Retry now
        </Link>
      </Banner>
    );
  }

  if (kind === 'trial_ending') {
    return (
      <Banner tone="amber" onDismiss={close}>
        <Sparkles size={14} />
        <span>
          Your trial ends in <strong>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong>.
          Upgrade to keep premium access.
        </span>
        <Link
          href={`/settings?upgrade=${status.plan}`}
          className="underline font-semibold"
        >
          Upgrade
        </Link>
      </Banner>
    );
  }

  // cancelled with grace
  const until = status.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
      })
    : '';
  return (
    <Banner tone="slate" onDismiss={close}>
      <span>
        Subscription cancelled. Access continues until <strong>{until}</strong>.
      </span>
      <Link href="/settings" className="underline font-semibold">
        Resubscribe
      </Link>
    </Banner>
  );
}

function Banner({
  tone,
  onDismiss,
  children,
}: {
  tone: 'red' | 'amber' | 'slate';
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const bg =
    tone === 'red'
      ? 'bg-red-600 text-white'
      : tone === 'amber'
        ? 'bg-amber-500 text-white'
        : 'bg-slate-800 text-white';
  return (
    <div className={bg + ' sticky top-0 z-40 flex items-center gap-2 px-3 py-2 text-xs font-medium'}>
      <div className="container-app flex items-center gap-2">
        {children}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
      >
        <X size={13} />
      </button>
    </div>
  );
}
