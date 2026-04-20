'use client';

import { Suspense } from 'react';
import { BillingCard } from '@/components/billing/BillingCard';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { Download } from 'lucide-react';

export function BillingTab() {
  return (
    <div className="space-y-6">
      {/* Existing BillingCard */}
      <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-slate-100" />}>
        <BillingCard />
      </Suspense>

      {/* Invoice / Data Export Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Download size={18} className="text-slate-400" />
            Export Data
          </h2>
          <p className="text-sm text-slate-500">
            Your records are yours. Download any time as CSV for backup or your accountant.
          </p>
        </div>
        <div className="p-6">
          <div className="grid gap-2 sm:grid-cols-2">
            <ExportLink href="/api/export/payments" label="Payments" />
            <ExportLink href="/api/export/debts" label="Debts" />
            <ExportLink href="/api/export/customers" label="Customers" />
            <ExportLink href="/api/export/expenses" label="Expenses" />
          </div>
        </div>
      </div>

      {/* UpgradeModal */}
      <Suspense fallback={null}>
        <UpgradeModal />
      </Suspense>
    </div>
  );
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-success-400 hover:bg-success-50/40 hover:text-success-700"
    >
      <span>{label} CSV</span>
      <Download size={14} className="text-slate-400 group-hover:text-success-600" />
    </a>
  );
}
