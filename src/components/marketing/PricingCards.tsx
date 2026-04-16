'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Store, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

type Plan = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
  badge?: string;
};

const SELLER_PLANS: Plan[] = [
  {
    name: 'Free',
    price: '₦0',
    cadence: '/month',
    tagline: 'Test the waters. Track what matters.',
    badge: 'Start here',
    features: [
      'Up to 50 payments / month',
      'Up to 20 active debts',
      'Up to 50 customers',
      'WhatsApp follow-ups',
      '3 saved message templates',
    ],
    cta: { label: 'Start free', href: '/signup?type=seller' },
  },
  {
    name: 'Business',
    price: '₦7,500',
    cadence: '/month',
    tagline: 'The full business OS for serious sellers.',
    badge: 'Most popular',
    features: [
      'Unlimited payments, debts, customers',
      'Bank-alert payment verification',
      'Professional invoices & auto receipts',
      'Product catalog + live inventory',
      'Expenses & real profit reports',
      'Team (up to 3) + time clock',
      'Tasks & checklists',
      'CSV export',
    ],
    cta: { label: 'Start 14-day trial', href: '/signup?type=seller' },
    highlight: true,
  },
  {
    name: 'Business Plus',
    price: '₦15,000',
    cadence: '/month',
    tagline: 'Scale without limits.',
    features: [
      'Everything in Business',
      'Unlimited team members',
      'Custom receipt branding',
      'Priority WhatsApp support',
      'Priority feature updates',
    ],
    cta: { label: 'Choose Plus', href: '/signup?type=seller' },
  },
];

const PROPMGR_PLANS: Plan[] = [
  {
    name: 'Free',
    price: '₦0',
    cadence: '/month',
    tagline: 'Try it with one building.',
    badge: 'Start here',
    features: [
      '1 property · up to 5 tenants',
      'Rent payment tracking',
      'Overdue rent reminders',
      'WhatsApp tenant messaging',
    ],
    cta: { label: 'Start free', href: '/signup?type=property_manager' },
  },
  {
    name: 'Landlord',
    price: '₦8,500',
    cadence: '/month',
    tagline: 'For landlords with multiple tenants.',
    badge: 'Most popular',
    features: [
      'Unlimited properties & tenants',
      'Rent tracker with collection-rate KPI',
      'Auto monthly rent reminders',
      'Bank-alert rent verification',
      'Receipts after every rent payment',
      'Expenses & net profit per property',
      'CSV export',
    ],
    cta: { label: 'Start 14-day trial', href: '/signup?type=property_manager' },
    highlight: true,
  },
  {
    name: 'Estate Manager',
    price: '₦18,000',
    cadence: '/month',
    tagline: 'For agents and managers with portfolios.',
    features: [
      'Everything in Landlord',
      'Team of unlimited staff',
      'Tasks & inspection checklists',
      'Priority WhatsApp support',
      'White-glove onboarding',
    ],
    cta: { label: 'Choose Plus', href: '/signup?type=property_manager' },
  },
];

type IC = 'seller' | 'property_manager';

export function PricingCards() {
  const [ic, setIc] = useState<IC>('seller');
  const plans = ic === 'seller' ? SELLER_PLANS : PROPMGR_PLANS;

  return (
    <div>
      {/* ICP toggle */}
      <div className="mx-auto mb-8 flex max-w-md justify-center">
        <div className="inline-flex rounded-full border border-border bg-white p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setIc('seller')}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 transition',
              ic === 'seller'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-ink',
            )}
          >
            <Store size={15} />
            For sellers
          </button>
          <button
            type="button"
            onClick={() => setIc('property_manager')}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 transition',
              ic === 'property_manager'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-ink',
            )}
          >
            <Home size={15} />
            For property managers
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'card flex h-full flex-col p-6',
              plan.highlight && 'border-brand-500 ring-1 ring-brand-500 shadow-lg',
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
              {plan.badge && (
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                    plan.highlight
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {plan.badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-600">{plan.tagline}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black text-ink">{plan.price}</span>
              <span className="text-sm font-medium text-slate-500">{plan.cadence}</span>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-slate-700">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Check size={11} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link
                href={plan.cta.href}
                className={plan.highlight ? 'btn-primary w-full' : 'btn-secondary w-full'}
              >
                {plan.cta.label}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        All plans include WhatsApp support · No credit card required for Free · Cancel anytime
      </p>
    </div>
  );
}
