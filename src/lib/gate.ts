import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { limitsFor, PLAN_LABELS, suggestUpgrade, type Limits } from './plan-limits';

/**
 * Ensures the user can perform an action based on their plan's quota.
 * Returns a NextResponse 402 ("Payment Required") when the limit is hit,
 * or `null` when the action is allowed.
 *
 * Counts are fetched inline — keep them narrow so the API stays fast.
 */
export async function enforceQuota(
  user: { id: string; plan: string; businessType: string },
  action:
    | 'create_payment'
    | 'create_debt'
    | 'create_customer'
    | 'create_template'
    | 'create_property'
    | 'create_tenant'
    | 'create_staff',
): Promise<NextResponse | null> {
  const limits = limitsFor(user.plan);
  const upgradeTo = suggestUpgrade(user.plan, user.businessType);

  function deny(message: string) {
    return NextResponse.json(
      {
        error: message,
        upgrade: {
          currentPlan: PLAN_LABELS[user.plan as keyof typeof PLAN_LABELS] ?? user.plan,
          suggestedPlan: PLAN_LABELS[upgradeTo],
          upgradeHref: '/settings?upgrade=1',
        },
      },
      { status: 402 },
    );
  }

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
        return deny(
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
        return deny(
          `Free plan is capped at ${limits.activeDebts} active debts. Close some or upgrade.`,
        );
      }
      return null;
    }
    case 'create_customer': {
      if (limits.customers === null) return null;
      const count = await prisma.customer.count({ where: { userId: user.id } });
      if (count >= limits.customers) {
        return deny(
          `Free plan is capped at ${limits.customers} customers. Upgrade for unlimited.`,
        );
      }
      return null;
    }
    case 'create_template': {
      if (limits.templates === null) return null;
      const count = await prisma.messageTemplate.count({ where: { userId: user.id } });
      if (count >= limits.templates) {
        return deny(
          `Free plan is capped at ${limits.templates} message templates. Upgrade for unlimited.`,
        );
      }
      return null;
    }
    case 'create_property': {
      if (limits.properties === null) return null;
      const count = await prisma.property.count({ where: { userId: user.id } });
      if (count >= limits.properties) {
        return deny(
          `Your plan is capped at ${limits.properties} ${limits.properties === 1 ? 'property' : 'properties'}. Upgrade to manage more.`,
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
        return deny(
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
        return deny(
          `Your plan is capped at ${limits.teamMembers} active team ${limits.teamMembers === 1 ? 'member' : 'members'}. Upgrade for unlimited.`,
        );
      }
      return null;
    }
  }
  return null;
}

/**
 * Gate a feature entirely — returns 403 when the user's plan doesn't include it.
 */
export function requireFeature(
  user: { plan: string },
  feature: keyof Limits,
): NextResponse | null {
  const limits = limitsFor(user.plan);
  const allowed = limits[feature];
  if (typeof allowed === 'boolean' && !allowed) {
    return NextResponse.json(
      {
        error: `This feature requires a paid plan.`,
        upgrade: { upgradeHref: '/settings?upgrade=1' },
      },
      { status: 403 },
    );
  }
  return null;
}
