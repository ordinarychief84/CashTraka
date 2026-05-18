import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth';
import {
  PLAN_LABELS,
  effectivePlan,
  limitsFor,
  type PlanName,
} from '@/lib/plan-limits';
import { SidebarBusinessPlan } from './SidebarBusinessPlan';

/**
 * Self-fetching container for the bottom-of-sidebar plan card.
 *
 * Resolves the principal, computes the effective plan (respects trial
 * expiry / past-due / cancelled), counts active team members against the
 * plan's `teamMembers` limit, and chooses a status pill that matches
 * the real subscription state.
 *
 * Replaces the previous hardcoded stub (`teamUsed=8 / teamMax=20 /
 * storagePct=65 / planLabel='Business Plan'`) that lied to every user.
 *
 * Rendered as a server component, so the data fetch lives next to the
 * presentational `SidebarBusinessPlan` without polluting `AppShell`.
 */
export async function SidebarBusinessPlanContainer() {
  const ctx = await getAuthContext();
  if (!ctx) {
    // No session — render nothing. (AppShell only renders for
    // authenticated principals anyway, but be defensive.)
    return null;
  }
  const { owner } = ctx;

  // Effective plan respects trial expiry and lapsed subscriptions.
  const eff = effectivePlan({
    plan: owner.plan,
    subscriptionStatus: owner.subscriptionStatus,
    trialEndsAt: owner.trialEndsAt,
    currentPeriodEnd: owner.currentPeriodEnd,
  });
  const planLabel = PLAN_LABELS[eff.plan as PlanName] ?? eff.plan;

  // Active staff count (excludes deleted/inactive).
  const staffCount = await prisma.staffMember.count({
    where: { userId: owner.id, status: 'active' },
  });
  // Owner counts as a team member too.
  const teamUsed = staffCount + 1;
  const teamMax = limitsFor(eff.plan).teamMembers; // null = unlimited

  // Trial days remaining (only meaningful when status === 'trialing').
  let trialDaysLeft: number | null = null;
  if (eff.status === 'trialing' && owner.trialEndsAt) {
    const msLeft = owner.trialEndsAt.getTime() - Date.now();
    trialDaysLeft = msLeft > 0 ? Math.ceil(msLeft / (24 * 60 * 60 * 1000)) : 0;
  }

  return (
    <SidebarBusinessPlan
      planLabel={planLabel}
      status={eff.status}
      expired={eff.expired}
      teamUsed={teamUsed}
      teamMax={teamMax}
      trialDaysLeft={trialDaysLeft}
    />
  );
}
