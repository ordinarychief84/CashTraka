'use client';

import { Suspense } from 'react';
import { BillingCard } from '@/components/billing/BillingCard';
import { UpgradeModal } from '@/components/billing/UpgradeModal';

export function BillingTab() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-slate-100" />}>
        <BillingCard />
      </Suspense>

      <Suspense fallback={null}>
        <UpgradeModal />
      </Suspense>
    </div>
  );
}
