import { redirect } from 'next/navigation';
import { getAuthContext } from './auth';
import { billingService } from './services/billing.service';
import type { AccessRole } from './rbac';

/**
 * Require an authenticated principal (owner or staff). Returns a user-like
 * object shaped for existing page consumers.
 *
 * Side effects:
 *   - redirects to /login if no session
 *   - redirects to /verify-email if owner hasn't verified email yet
 *   - redirects to /onboarding if owner hasn't finished onboarding
 *   - opportunistically expires stale trials
 */
export async function guard(options: {
  requireOnboarded?: boolean;
  requireVerified?: boolean;
} = {}) {
  const { requireOnboarded = true, requireVerified = true } = options;
  const ctx = await getAuthContext();
  if (\!ctx) redirect('/login');

  // Email verification gate — owners must verify before proceeding.
  // Staff skip this since they were invited by a verified owner.
  if (requireVerified && ctx.isOwner && \!ctx.owner.emailVerified) {
    redirect('/verify-email');
  }

  if (requireOnboarded && ctx.isOwner && \!ctx.owner.onboardingCompleted) {
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

  return {
    ...o,
    accessRole: ctx.accessRole as AccessRole,
    isOwner: ctx.isOwner,
    principalName: ctx.principalName,
    staffId: ctx.staff?.id ?? null,
  };
}
