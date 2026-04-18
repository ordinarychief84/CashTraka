import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import {
  limitsFor,
  PLAN_LABELS,
  suggestUpgrade,
  effectivePlan,
  isSubscriptionLapsed,
  type Limits,
} from './plan-limits';

/**
 * Feature/quota enforcement. All checks route through `effectivePlan()` so
 * subscription lifecycle (trial expiry, past-due, cancelled-grace) is
 * respected in one place.
 *
 * Returns a NextResponse (402 for quota, 403 for feature) if the action is
 * blocked, or null if it's allowed.
 */

type GateUser = {
  id: string;
  plan: string;
  businessType: string;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
};

function denyQuota(
  user: GateUser,
  message: string,
  status = 402,
): NextResponse {
  const upgradeTo = suggestUpgrade(user.plan, user.businessType);
  const lapsed = isSubscriptionLapsed(user);
  return NextResponse.json(
    {
      error: lapsed
        ? 'Your subscription has lapsed. Renew to keep creating records.'
        : message,
      upgrade: {
        currentPlan:
          PLAN_LABELS[user.plan as keyof typeof PLAN_LABELS] ?? user.plan,
        suggestedPlan: PLAN_LABELS[upgradeTo],
        upgradeHref: '/settings?upgrade=' + upgradeTo,
        reason: lapsed ? 'lapsed' : 'quota',
      },
    },
    { status },
  );
}

/** Effective limits + whether a previously-paid subscription has lapsed. */
function resolveLimits(user: GateUser): { limits: Limits } {
  const eff = effectivePlan(user);
  return { limits: limitsFor(eff.plan) };
}

export async function enforceQuota(
  user: GateUser,
  action:
    | 'create_payment'
    | 'create_debt'
    | 'create_customer'
    | 'create_template'
    | 'create_property'
    | 'create_tenant'
    | 'create_staff',
): Promise<NextResponse | null> {
  const { limits } = resolveLimits(user);

  switch (action) {
    case 'create_payment': {
      if (limits.paymentsPerMonth === null) return null;
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const count = await prisma.payment.count({
        where: { userId: user.id, createdAt: { gte: start } },
      });
      if (count >= limits.paymentsPerMonth) {
        return denyQuota(
          user,
          `Free plan is capped at ${limits.paymentsPerMonth} payments per month. Upgrade for unlimited.`,
        );
      }
      return null;
    }
    case 'create_debt': {
      if (limits.activeDebts === null) return null;
      const count = await prisma.debt.count({
        where: { userId: user.id, status: 'OPEN' },
      });
      if (count >= limits.activeDebts) {
        return denyQuota(
          user,
          `Free plan is capped at ${limits.activeDebts} active debts. Close some or upgrade.`,
        );
      }
      return null;
    }
    case 'create_customer': {
      if (limits.customers === null) return null;
      const count = await prisma.customer.count({ where: { userId: user.id } });
      if (count >= limits.customers) {
        return denyQuota(
          user,
          `Free plan is capped at ${limits.customers} customers. Upgrade for unlimited.`,
        );
      }
      return null;
    }
    case 'create_template': {
      if (limits.templates === null) return null;
      const count = await prisma.messageTemplate.count({
        where: { userId: user.id },
      });
      if (count >= limits.templates) {
        return denyQuota(
          user,
          `Free plan is capped at ${limits.templates} message templates. Upgrade for unlimited.`,
        );
      }
      return null;
    }
    case 'create_property': {
      if (limits.properties === null) return null;
      const count = await prisma.property.count({ where: { userId: user.id } });
      if (count >= limits.properties) {
        return denyQuota(
          user,
          `Your plan is capped at ${limits.properties} ${
            limits.properties === 1 ? 'property' : 'properties'
          }. Upgrade to manage more.`,
        );
      }
      return null;
    }
    case 'create_tenant': {
      if (limits.tenants === null) return null;
      const count = await prisma.tenant.count({
        where: { userId: user.id, status: 'active' },
      });
      if (count >= limits.tenants) {
        return denyQuota(
          user,
          `Your plan is capped at ${limits.tenants} active tenants. Upgrade to add more.`,
        );
      }
      return null;
    }
    case 'create_staff': {
      if (limits.teamMembers === null) return null;
      const count = await prisma.staffMember.count({
        where: { userId: user.id, status: 'active' },
      });
      if (count >= limits.teamMembers) {
        return denyQuota(
          user,
          `Your plan is capped at ${limits.teamMembers} active team ${
            limits.teamMembers === 1 ? 'member' : 'members'
          }. Upgrade for unlimited.`,
        );
      }
      return null;
    }
  }
  return null;
}

/**
 * Feature flag check.
 *
 * Returns:
 *   - 402 if the user *had* access but their subscription lapsed (so the UI
 *     can prompt them to retry payment — not a permanent block)
 *   - 403 if the feature is simply not in their current plan (upgrade path)
 */
export function requireFeature(
  user: GateUser,
  feature: keyof Limits,
): NextResponse | null {
  const { limits } = resolveLimits(user);
  const allowed = limits[feature];
  if (typeof allowed === 'boolean' && \!allowed) {
    const status = isSubscriptionLapsed(user) ? 402 : 403;
    return denyQuota(user, 'This feature requires a paid plan.', status);
  }
  return null;
}
