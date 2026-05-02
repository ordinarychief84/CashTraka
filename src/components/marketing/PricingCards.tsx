'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLAN_PRICING,
  BILLING_FREQUENCIES,
  FREQUENCY_LABELS,
  FREQUENCY_DESCRIPTIONS,
  formatPriceNaira,
  type BillingFrequency,
  type PaidPlanKey,
} from '@/lib/billing/pricing';

/**
 * Marketing pricing section.
 *
 * Single plan (Starter) with three billing frequencies:
 * - Quarterly
 * - Biannually (save 17%)
 * - Yearly (save 25%)
 *
 * Each includes a 7-day free trial.
 */

const STARTER_FEATURES: string[] = [
  'Unlimited invoices and public pay links',
  'Recurring invoices for retainer clients',
  'Credit notes, delivery notes, and offers',
  'FIRS-ready tax invoices with IRN and QR',
  'Auto receipts on every paid invoice',
  'Bank alert verification for transfers',
  'Smart Collection Queue with WhatsApp reminders',
  'Customers, debts, expenses, and P&L reports',
  'Team, attendance, payroll, and custom branding',
  'Property and tenant management for landlords',
];

export function PricingCards() {
  const [freq, setFreq] = useState<BillingFrequency>('yearly');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const plan = PLAN_PRICING[`starter_${freq}` as PaidPlanKey];

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => !cancelled && setIsLoggedIn(r.ok))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function hrefFor(): string {
    if (isLoggedIn) return `/settings?upgrade=starter_${freq}`;
    return `/signup?plan=starter_${freq}`;
  }

  return (
    <div>
      {/* Frequency toggle */}
      <div className="mx-auto mb-8 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-white p-1 text-sm font-semibold">
          {BILLING_FREQUENCIES.map((f) => {
            const isActive = freq === f;
            const planForFreq = PLAN_PRICING[`starter_${f}` as PaidPlanKey];
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFreq(f)}
                className={cn(
                  'relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 transition',
                  isActive
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-ink',
                )}
              >
                {FREQUENCY_LABELS[f]}
                {planForFreq.savingsPercent > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-success-50 text-success-700',
                    )}
                  >
                    -{planForFreq.savingsPercent}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Single plan card */}
      <div className="mx-auto max-w-lg">
        <div className="card relative overflow-hidden border-brand-500 p-8 ring-1 ring-brand-500 shadow-xl">
          {/* Corner accent */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl"
          />

          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
                  <Zap size={18} />
                </span>
                <h3 className="text-xl font-black text-ink">Starter</h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold text-white">
                <Sparkles size={11} />
                7-day free trial
              </span>
            </div>

            {/* Price */}
            <div className="mt-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-ink">
                  {formatPriceNaira(plan.perMonthKobo)}
                </span>
                <span className="text-sm font-medium text-slate-500">/month</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {FREQUENCY_DESCRIPTIONS[freq]} · {formatPriceNaira(plan.amountKobo)} total
              </p>
            </div>

            {/* Features */}
            <ul className="mt-6 space-y-3">
              {STARTER_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-8">
              <Link
                href={hrefFor()}
                className="btn-primary w-full text-center"
              >
                Start 7-day free trial
              </Link>
              <p className="mt-3 text-center text-xs text-slate-500">
                No card to start. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust line */}
      <p className="mt-8 text-center text-xs text-slate-500">
        WhatsApp support · Same features on every cycle · Change cycle whenever you like
      </p>
    </div>
  );
}
