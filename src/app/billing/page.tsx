import Link from 'next/link';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { effectivePlan, PLAN_LABELS } from '@/lib/plan-limits';
import { FEATURE_LABELS } from '@/lib/gate';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SP = { feature?: string };

type PlanCard = {
  id: string;
  label: string;
  priceLabel: string;
  priceSub: string;
  features: string[];
  highlight?: boolean;
  ctaLabel: string;
};

const PLANS: PlanCard[] = [
  {
    id: 'free',
    // Stay aligned with `PLAN_LABELS['free']` and the sidebar plan card.
    // Earlier this card showed "Starter" while the header pill said
    // "Free" on the same screen — confusing.  "Starter" is reserved
    // for the paid starter_* tiers in `PLAN_LABELS`.
    label: 'Free',
    priceLabel: '₦0',
    priceSub: '/month · always free',
    features: [
      'Up to 50 customers',
      '50 payments per month',
      'Manual invoices & receipts',
      'WhatsApp share',
      '1 team member',
    ],
    ctaLabel: 'Current plan',
  },
  {
    id: 'pro_monthly',
    label: 'Pro',
    priceLabel: '₦12,000',
    priceSub: '/month · 30 days free',
    highlight: true,
    features: [
      'Production orders, recipes & batch costing',
      'Lead-time aware shortage alerts',
      'Auto-drafted purchase orders',
      'Recurring production templates',
      'Daily 7pm operational recap',
      'Bank-SMS payment ingest',
      'FIRS tax-invoice submission',
      'Batch cost & margin per run',
      'Up to 3 team members',
    ],
    ctaLabel: 'Upgrade to Pro',
  },
  {
    id: 'business_monthly',
    label: 'Business',
    priceLabel: '₦35,000',
    priceSub: '/month · 30 days free',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Multi-user audit + accountant role',
      'Custom branding on PDFs',
      'Automated VAT returns',
      'Priority support',
    ],
    ctaLabel: 'Upgrade to Business',
  },
];

export default async function BillingPage({ searchParams }: { searchParams: SP }) {
  const user = await guard();
  const { plan: currentPlan } = effectivePlan(user);

  const featureLabel =
    searchParams.feature && (FEATURE_LABELS as Record<string, string>)[searchParams.feature]
      ? (FEATURE_LABELS as Record<string, string>)[searchParams.feature]
      : null;

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="page-title">Billing &amp; plans</h1>
          <p className="page-subtitle">
            One subscription. Every new account gets 30 days of Pro free — no card required.
          </p>
        </div>
        <div className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          Current plan ·{' '}
          <span className="text-brand-700">
            {PLAN_LABELS[currentPlan as keyof typeof PLAN_LABELS] ?? currentPlan}
          </span>
        </div>
      </div>

      {/* Deep-linked feature explainer when the user lands here from an
         UpgradeChip elsewhere in the app. */}
      {featureLabel && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-bold text-brand-800">
              {featureLabel} is included on Pro
            </div>
            <p className="mt-0.5 text-xs text-brand-700/80">
              Upgrade once — get every operational feature, not just this one.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                'flex flex-col rounded-2xl border bg-white p-6 shadow-xs',
                p.highlight ? 'border-brand-500 ring-2 ring-brand-100' : 'border-border',
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-ink">{p.label}</h3>
                {p.highlight && (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Recommended
                  </span>
                )}
              </div>
              <div className="mt-4">
                <span className="num text-3xl font-black tracking-tight text-ink">
                  {p.priceLabel}
                </span>
                <span className="ml-1 text-xs text-slate-500">{p.priceSub}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
                      <Check size={10} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/settings/edit"
                className={cn(
                  'mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition',
                  isCurrent
                    ? 'cursor-default border border-border bg-slate-50 text-slate-500'
                    : p.highlight
                      ? 'bg-brand-500 text-white hover:bg-brand-400'
                      : 'border border-border bg-white text-slate-700 hover:bg-slate-50',
                )}
                aria-disabled={isCurrent}
              >
                {isCurrent ? 'Current plan' : p.ctaLabel}
                {!isCurrent && <ArrowRight size={14} />}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Pay via card or bank transfer. Cancel any time — your data stays.
      </p>
    </AppShell>
  );
}
