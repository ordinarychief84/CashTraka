import { redirect } from 'next/navigation';
import { guard } from './guard';
import { can, type Permission } from './rbac';
import { effectivePlan, limitsFor, type Limits } from './plan-limits';
import { canAccess } from './business-type';

/**
 * Page-level RBAC guard. Use inside a server component to block pages that
 * require a specific permission:
 *
 *   const user = await guardWithPermission('settings.write');
 *
 * Behaviour:
 *   - runs the normal `guard()` first (redirects to /login if unauth)
 *   - if the principal doesn't have the permission, redirects to /dashboard
 *     with ?denied=<permission> so the destination page can surface a toast.
 */
export async function guardWithPermission(action: Permission) {
  const user = await guard();
  if (!can(user.accessRole, action)) {
    redirect(`/dashboard?denied=${encodeURIComponent(action)}`);
  }
  return user;
}

/**
 * Page-level plan-feature guard. Use for pages where any role can view as
 * long as the owner's subscription includes the feature (e.g. /reports on
 * Business). Redirects to /dashboard?denied=feature:<name> so the destination
 * can show an upgrade prompt.
 *
 * Only boolean feature flags are supported (paymentsPerMonth etc. use
 * `enforceQuota`, not page gating).
 */
type BooleanFeature = {
  [K in keyof Limits]: Limits[K] extends boolean ? K : never;
}[keyof Limits];

export async function guardWithFeature(feature: BooleanFeature) {
  const user = await guard();
  const eff = effectivePlan(user);
  const limits = limitsFor(eff.plan);
  if (!limits[feature]) {
    redirect(`/dashboard?denied=feature:${encodeURIComponent(feature)}`);
  }
  return user;
}

/**
 * Page-level business-type guard. Use for pages that are only relevant to
 * a specific ICP (e.g. /products is seller-only, /properties is PM-only).
 *
 * Redirects to /dashboard if the user's businessType doesn't match.
 */
export async function guardForBusinessType(feature: string) {
  const user = await guard();
  if (!canAccess(feature, user.businessType)) {
    redirect('/dashboard');
  }
  return user;
}
