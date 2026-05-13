'use client';

import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRICING_PLANS, type PricingPlan } from '@/lib/marketing-content';

/**
 * Marketing pricing section after the ops pivot.
 *
 * Three plans:
 *   - Starter   ₦0/mo   — get organized
 *   - Pro       ₦12,000/mo — full production planning + shortage alerts
 *   - Business  ₦35,000/mo — teams, barcode, priority support
 *
 * The middle plan carries the "Most popular" badge and is visually
 * elevated. The Starter and Business plans use a calmer treatment so
 * the eye lands on Pro.
 */

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PRICING_PLANS.map((plan) => (
        <PricingCard key={plan.key} plan={plan} />
      ))}
    </div>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  const isFeatured = plan.key === 'pro';

  return (
    <div
      className={cn(
        'card relative overflow-hidden p-7 flex flex-col',
        isFeatured
          ? 'border-brand-500 ring-1 ring-brand-500 shadow-xl md:-translate-y-2'
          : 'border-border',
      )}
    >
      {isFeatured && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl"
        />
      )}

      {plan.badge && (
        <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-bold text-white">
          <Sparkles size={11} />
          {plan.badge}
        </span>
      )}

      <div className="relative">
        <h3 className="text-xl font-black text-ink">{plan.name}</h3>
        <p className="mt-1 text-sm text-slate-500">{plan.blurb}</p>

        <div className="mt-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-ink">{plan.priceLabel}</span>
            {plan.priceKobo > 0 && (
              <span className="text-sm font-medium text-slate-500">/month</span>
            )}
          </div>
          {plan.priceKobo === 0 && (
            <p className="mt-1 text-sm text-slate-500">No card required. Free forever.</p>
          )}
        </div>

        <ul className="mt-6 space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                  isFeatured
                    ? 'bg-brand-50 text-brand-600'
                    : 'bg-slate-100 text-slate-600',
                )}
              >
                <Check size={12} strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-8">
        <Link
          href={plan.cta.href}
          className={cn(
            'inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition',
            isFeatured
              ? 'bg-brand-500 text-white hover:bg-brand-400'
              : 'border border-brand-500 bg-white text-brand-700 hover:bg-brand-50',
          )}
        >
          {plan.cta.label}
        </Link>
      </div>
    </div>
  );
}
