import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import {
  PLAN_LABELS,
  limitsFor,
  suggestUpgrade,
  effectivePlan,
  isSubscriptionLapsed,
  type Limits,
} from './plan-limits';
import { getEffectiveLimits } from './services/user-override.service';

/* ─── UI-side helpers (no DB lookups, no NextResponse) ──────────────────
 * These are for React server components and client components that need
 * to decide whether to render an action button vs. an upgrade chip. They
 * intentionally ignore per-user UserOverride rows because UI rendering
 * happens often and we can't afford a DB call per check; quotas and
 * feature flags get re-validated by `requireFeature` / `enforceQuota`
 * server-side before the action actually runs.
 */

type FeatureUser = {
  plan: string;
  businessType?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
};

/** Boolean feature check for UI rendering. */
export function hasFeature(user: FeatureUser, feature: keyof Limits): boolean {
  const { plan } = effectivePlan(user);
  return Boolean(limitsFor(plan)[feature]);
}

/** Effective limits row for the user — useful for "X of Y remaining" UI. */
export function planLimitsFor(user: FeatureUser): Limits {
  const { plan } = effectivePlan(user);
  return limitsFor(plan);
}

/** Resolves the suggested upgrade plan label, ready to drop into UI. */
export function suggestedUpgradeFor(user: FeatureUser): {
  currentPlan: string;
  currentPlanLabel: string;
  suggestedPlan: string;
  suggestedPlanLabel: string;
} {
  const { plan } = effectivePlan(user);
  const suggested = suggestUpgrade(plan, user.businessType ?? 'seller');
  return {
    currentPlan: plan,
    currentPlanLabel: PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan,
    suggestedPlan: suggested,
    suggestedPlanLabel: PLAN_LABELS[suggested] ?? suggested,
  };
}

/** Human-readable label for one capability. Used in upgrade prompts. */
export const FEATURE_LABELS: Partial<Record<keyof Limits, string>> = {
  invoices: 'Invoices',
  recurringInvoices: 'Recurring invoices',
  firsCompliance: 'FIRS tax-invoice submission',
  electronicXml: 'XML / e-invoicing',
  multiUserAudit: 'Multi-user audit + accountant role',
  dailySummary: 'Daily WhatsApp summary email',
  autoPurchaseOrders: 'Auto-drafted purchase orders',
  autoReminders: 'Automatic payment reminders',
  paymentReminders: 'Invoice reminder cadences',
  creditNotes: 'Credit notes',
  deliveryNotes: 'Delivery notes',
  offers: 'Quotes / offers',
  customBranding: 'Custom branding on PDFs',
  attendance: 'Attendance tracking',
  payroll: 'Payroll',
  checklists: 'Checklists',
  behaviorTracking: 'Customer behaviour tags',
  collectionScore: 'Collection score',
  suggestions: 'Smart suggestions',
  documentAudit: 'Per-document audit trail',
  paystackPay: 'Paystack public-pay button',
  vatReturns: 'Automated VAT returns',
  yearEndPack: 'Year-end accountant pack',
  bankSync: 'Bank sync',
};


/**
 * Feature/quota enforcement. All checks route through `effectivePlan()` so
 * subscription lifecycle (trial expiry, past-due, cancelled-grace) is
 * respected in one place. Limits are then merged with any per-user override
 * stored on `UserOverride` so ops can comp specific features or quotas.
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

/** Effective limits + lifecycle awareness, merged with per-user overrides. */
async function resolveLimits(user: GateUser): Promise<{ limits: Limits }> {
  const eff = effectivePlan(user);
  const limits = await getEffectiveLimits(user.id, eff.plan);
  return { limits };
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
  const { limits } = await resolveLimits(user);

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
    case 'create_property':
    case 'create_tenant':
      // Landlord vertical removed — these gate actions no longer exist
      // but the case labels stay so any in-flight callers compile.
      return null;
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
 *     can prompt them to retry payment, not a permanent block)
 *   - 403 if the feature is simply not in their current plan (upgrade path)
 */
export async function requireFeature(
  user: GateUser,
  feature: keyof Limits,
): Promise<NextResponse | null> {
  const { limits } = await resolveLimits(user);
  const allowed = limits[feature];
  if (typeof allowed === 'boolean' && !allowed) {
    const status = isSubscriptionLapsed(user) ? 402 : 403;
    return denyQuota(user, 'This feature requires a paid plan.', status);
  }
  return null;
}
