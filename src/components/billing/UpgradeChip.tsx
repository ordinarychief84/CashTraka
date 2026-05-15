import Link from 'next/link';
import { Sparkles, Lock } from 'lucide-react';
import type { Limits } from '@/lib/plan-limits';
import { FEATURE_LABELS } from '@/lib/gate';

/**
 * Small "Upgrade to unlock" chip rendered next to (or inside) a gated
 * action. Two flavours:
 *
 *   `inline`  — sits beside the disabled CTA, leaves the button visible
 *               but unclickable so the user sees what they would do.
 *   `block`   — replaces the CTA with a full upgrade card. Use this for
 *               settings panels and detail pages where the feature is
 *               the page's main job.
 *
 * The chip always carries a deep-link to /billing with the feature
 * preselected so the upgrade flow can highlight what the user is
 * paying for.
 */
export function UpgradeChip({
  feature,
  suggestedPlanLabel,
  variant = 'inline',
}: {
  feature: keyof Limits;
  suggestedPlanLabel: string;
  variant?: 'inline' | 'block';
}) {
  const featureLabel = FEATURE_LABELS[feature] ?? String(feature);
  const href = `/billing?feature=${encodeURIComponent(String(feature))}`;

  if (variant === 'block') {
    return (
      <Link
        href={href}
        className="group flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 transition hover:bg-brand-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-brand-800">
            {featureLabel} is on {suggestedPlanLabel}
          </div>
          <p className="mt-0.5 text-xs text-brand-700/80">
            Upgrade to unlock — manage your plan in Billing.
          </p>
        </div>
        <span className="shrink-0 self-center text-xs font-bold uppercase tracking-wide text-brand-700 group-hover:text-brand-800">
          Upgrade →
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700 transition hover:bg-brand-100"
      title={`${featureLabel} requires ${suggestedPlanLabel}`}
    >
      <Lock size={11} />
      Upgrade
    </Link>
  );
}
