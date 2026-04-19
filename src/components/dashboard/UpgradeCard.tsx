import Link from 'next/link';
import { Sparkles } from 'lucide-react';

type Props = {
  plan: string;
  businessType: string;
};

/**
 * "Go Premium" / "Go Business" upgrade CTA card — dark bg, lime button,
 * sized to match the top-row cards in the reference design.
 */
export function UpgradeCard({ plan, businessType }: Props) {
  // Only show if on a free plan.
  if (plan !== 'free') {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-md">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-lime-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-lime-300">
            Unlocked
          </span>
        </div>
        <div className="mt-2 text-lg font-bold">You're on a paid plan</div>
        <p className="mt-1 text-xs text-white/80">
          Unlimited everything. Priority support when you need it.
        </p>
      </div>
    );
  }

  const isPm = businessType === 'property_manager';
  const targetPlan = isPm ? 'Landlord' : 'Business';
  const subtitle = isPm
    ? 'Unlimited properties, tenants, auto-reminders & receipts'
    : 'Unlimited payments, invoices, products, team & verification';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-5 text-white shadow-md">
      {/* Decorative blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-lime-400/20 blur-2xl"
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <Sparkles size={14} className="text-lime-300" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
            CashTraka
          </span>
        </div>
        <div className="mt-3 text-xl font-black leading-tight">
          Go {targetPlan}
        </div>
        <p className="mt-1.5 text-xs text-white/70">{subtitle}</p>
        <Link
          href="/settings?upgrade=1"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-lime-400 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-lime-300"
        >
          Get access
        </Link>
      </div>
    </div>
  );
}
