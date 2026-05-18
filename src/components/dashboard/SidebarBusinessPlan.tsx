import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Plan-summary card pinned to the bottom of the sidebar.
 *
 * Renders the principal's REAL plan label, subscription status pill,
 * and team-member usage. Wired by `SidebarBusinessPlanContainer`.
 *
 * Earlier this component shipped with hardcoded placeholders
 * (`teamUsed=8`, `teamMax=20`, `storagePct=65`, `isActive=true`,
 * `planLabel='Business Plan'`) — every user saw the same fake numbers
 * regardless of their actual plan. Those defaults are now gone; every
 * prop is required so the trust hole is closed at the type level.
 *
 * The "Storage" bar was removed entirely (we don't actually track
 * storage usage per tenant). Re-introduce it when a real metric exists.
 */
type Status = 'free' | 'trialing' | 'active' | 'cancelled' | 'past_due';

const STATUS_PILL: Record<
  Status,
  { label: string; tone: string }
> = {
  free: { label: 'Free', tone: 'bg-slate-100 text-slate-600' },
  trialing: { label: 'Trial', tone: 'bg-amber-100 text-amber-800' },
  active: { label: 'Active', tone: 'bg-success-100 text-success-800' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-600' },
  past_due: { label: 'Past due', tone: 'bg-rose-100 text-rose-700' },
};

export function SidebarBusinessPlan({
  planLabel,
  status,
  expired,
  teamUsed,
  teamMax,
  trialDaysLeft,
}: {
  planLabel: string;
  status: Status;
  /** True when the trial / paid period has lapsed and we've dropped them to Free. */
  expired: boolean;
  /** Includes the owner (so a solo seller sees 1, not 0). */
  teamUsed: number;
  /** Null means unlimited (Business plan). */
  teamMax: number | null;
  /** Whole-day countdown shown only for trialing principals. Null otherwise. */
  trialDaysLeft: number | null;
}) {
  // After a trial expires, effectivePlan() already drops the user to
  // Free — but `status` may still read 'trialing' / 'cancelled' until
  // the next billing tick. Show a Past-due/Free pill in those cases so
  // the user understands their access is throttled.
  const effectiveStatus: Status = expired ? 'past_due' : status;
  const pill = STATUS_PILL[effectiveStatus];

  const teamMaxLabel = teamMax == null ? '∞' : String(teamMax);
  // Cap the visual at 100% — over-quota is possible if a plan downgraded.
  const teamPct =
    teamMax == null
      ? 0
      : Math.min(100, Math.round((teamUsed / teamMax) * 100));

  return (
    <div className="m-3 rounded-2xl border border-border bg-white p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold text-ink" title={planLabel}>
          {planLabel}
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            pill.tone,
          )}
        >
          {pill.label}
        </span>
      </div>

      {status === 'trialing' && trialDaysLeft != null && !expired && (
        <p className="mb-3 text-[11px] text-amber-700">
          {trialDaysLeft === 0
            ? 'Trial ends today'
            : `${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} left in trial`}
        </p>
      )}

      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Team members</span>
        <span className="num font-semibold text-ink">
          {teamUsed} / {teamMaxLabel}
        </span>
      </div>

      {teamMax != null && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              teamUsed > teamMax ? 'bg-rose-500' : 'bg-brand-500',
            )}
            style={{ width: `${teamPct}%` }}
          />
        </div>
      )}

      <Link
        href="/billing"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-slate-50"
      >
        <ArrowUpRight size={12} />
        {effectiveStatus === 'active' ? 'Manage plan' : 'Upgrade plan'}
      </Link>
    </div>
  );
}
