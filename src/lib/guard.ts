import { redirect } from 'next/navigation';
import { getAuthContext } from './auth';
import { billingService } from './services/billing.service';
import type { AccessRole } from './rbac';

/**
 * Require an authenticated principal (owner or staff). Returns a user-like
 * object shaped for existing page consumers (still keyed by OWNER's id so
 * data queries remain owner-scoped) plus RBAC metadata:
 *
 *   - `accessRole`    OWNER | MANAGER | CASHIER | VIEWER — what the logged-in
 *                     principal can do.
 *   - `isOwner`       convenience flag.
 *   - `principalName` name shown in the header (owner's name or staff's name).
 *   - `staffId`       present only when a staff is logged in; used by some
 *                     pages that want to show "signed in as Emeka" etc.
 *
 * Side effects:
 *   - redirects to /login if no session
 *   - redirects to /onboarding if owner hasn't finished onboarding (staff
 *     accept-invite flow bypasses this; staff never have to onboard)
 *   - opportunistically expires stale trials so downstream reads see a
 *     post-downgrade world
 */
export async function guard(options: { requireOnboarded?: boolean } = {}) {
  const { requireOnboarded = true } = options;
  const ctx = await getAuthContext();
  if (!ctx) redirect('/login');
  if (requireOnboarded && ctx.isOwner && !ctx.owner.onboardingCompleted) {
    redirect('/onboarding');
  }

  // Flip stale trials → free before downstream code reads user state.
  const o = ctx.owner;
  if (
    o.subscriptionStatus === 'trialing' &&
    o.trialEndsAt &&
    o.trialEndsAt.getTime() <= Date.now()
  ) {
    await billingService.expireTrialIfNeeded(o);
    o.plan = 'free';
    o.subscriptionStatus = 'free';
  }

  // Expose the owner's fields at the top level for back-compat with pages
  // that read `user.businessName`, `user.businessType`, etc.
  return {
    ...o,
    accessRole: ctx.accessRole as AccessRole,
    isOwner: ctx.isOwner,
    principalName: ctx.principalName,
    staffId: ctx.staff?.id ?? null,
  };
}
