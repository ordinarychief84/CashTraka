import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { BillingCallbackClient } from './client';

export const dynamic = 'force-dynamic';

/**
 * Paystack redirects here with `?reference=<paystackRef>` after the user
 * completes (or abandons) checkout. The client component below hits
 * `/api/billing/verify` which performs the authoritative check against
 * Paystack's API, whichever arrives first (webhook or this) wins, the
 * other is a no-op.
 */
export default function BillingCallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="container-app py-16">
        <div className="mx-auto max-w-md text-center">
          <Logo size="lg" />
          <Suspense
            fallback={
              <p className="mt-8 text-sm text-slate-600">Finalising your payment…</p>
            }
          >
            <BillingCallbackClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
