'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

/**
 * Client half of the Paystack callback page.
 *
 * Takes the `?reference=` query string that Paystack appends on redirect,
 * hits /api/billing/verify to finalise the upgrade atomically (the webhook
 * may have beaten us here — the verify route is idempotent), then bounces
 * the user back to Settings with either `?billing=success` or `?billing=failed`.
 *
 * We wait a beat so users see the confirmation state before the redirect.
 */
export function BillingCallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const reference = params.get('reference') || params.get('trxref');

  const [state, setState] = useState<'loading' | 'success' | 'failed' | 'missing'>(
    reference ? 'loading' : 'missing',
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    fetch(`/api/billing/verify?reference=${encodeURIComponent(reference)}`, {
      credentials: 'include',
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && data?.success && data.data?.status === 'success') {
          setState('success');
          setTimeout(() => {
            router.replace('/settings?billing=success');
          }, 1400);
        } else {
          setState('failed');
          setError(
            data?.error ||
              (data?.data?.status === 'pending'
                ? 'Payment is still being processed. We will update your plan as soon as Paystack confirms.'
                : 'Payment was not completed.'),
          );
          setTimeout(() => {
            router.replace('/settings?billing=failed');
          }, 2200);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState('failed');
        setError('Could not reach billing service.');
        setTimeout(() => {
          router.replace('/settings?billing=failed');
        }, 2200);
      });
    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  if (state === 'missing') {
    return (
      <div className="mt-8">
        <XCircle size={40} className="mx-auto text-red-500" />
        <h1 className="mt-3 text-xl font-bold text-ink">No payment reference</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page is only reached after completing a Paystack checkout.
        </p>
        <a href="/settings" className="btn-primary mt-5 inline-flex">
          Back to settings
        </a>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="mt-8">
        <Loader2 size={40} className="mx-auto animate-spin text-brand-500" />
        <h1 className="mt-3 text-xl font-bold text-ink">Confirming your payment…</h1>
        <p className="mt-2 text-sm text-slate-600">
          Hang tight — we are verifying with Paystack.
        </p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="mt-8">
        <CheckCircle2 size={48} className="mx-auto text-brand-600" />
        <h1 className="mt-3 text-xl font-bold text-ink">Payment confirmed</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your plan is now active. Taking you back to settings…
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <XCircle size={48} className="mx-auto text-red-500" />
      <h1 className="mt-3 text-xl font-bold text-ink">Payment not completed</h1>
      <p className="mt-2 text-sm text-slate-600">{error}</p>
      <p className="mt-1 text-xs text-slate-500">Redirecting you back to settings…</p>
    </div>
  );
}
