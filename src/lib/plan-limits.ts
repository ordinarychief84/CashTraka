/**
 * Plan-tier limits, enforced server-side on write APIs.
 *
 * - `free` sellers: 50 payments/month, 20 active debts, 50 customers, 3 templates.
 * - `free` property managers: 1 property, 5 tenants.
 * - Paid plans: unlimited (represented as `null`).
 *
 * This file is the single source of truth. If a limit needs adjusting for
 * billing, change it here.
 *
 * `User.plan` stores the tier (e.g. "business"); `User.subscriptionStatus`
 * stores the lifecycle state (e.g. "trialing", "past_due"). The product has
 * access when lifecycle is one of:
 *
 *   "trialing"  → full access to their plan's features (trial not expired)
 *   "active"    → full access; currentPeriodEnd > now
 *   "cancelled" → full access until currentPeriodEnd, then downgrade to Free
 *   "past_due"  → DOWNGRADE to Free (writes freeze, data intact)
 *   "free"      → Free limits
 */

export type PlanName =
  | 'free'
  | 'starter_quarterly'
  | 'starter_biannually'
  | 'starter_yearly'
  // Legacy keys — kept for existing DB rows
  | 'business'
  | 'business_plus'
  | 'landlord'
  | 'estate_manager';

export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled';

export type Limits = {
  paymentsPerMonth: number | null;
  activeDebts: number | null;
  customers: number | null;
  templates: number | null;
  properties: number | null;
  tenants: number | null;
  teamMembers: number | null;
  bankVerification: boolean;
  invoices: boolean;
  products: boolean;
  expenses: boolean;
  reports: boolean;
  csvExport: boolean;
  checklists: boolean;
  tasks: boolean;
  /** Mark daily attendance per staff. Paid feature. */
  attendance: boolean;
  /** Log staff payments (salary / advance / bonus / etc). Paid feature. */
  payroll: boolean;
  /** Custom receipt branding (logo, footer) — Plus-tier only. */
  customBranding: boolean;
  prioritySupport: boolean;
  /** Phase 2 — automatic follow-up reminders. */
  autoReminders: boolean;
  /** Phase 2 — max active reminder rules (null = unlimited). */
  maxReminderRules: number | null;
  /** Phase 4 — customer behavior tagging & analytics. */
  behaviorTracking: boolean;
  /** Phase 4 — collection performance score. */
  collectionScore: boolean;
  /** Phase 4 — smart action suggestions. */
  suggestions: boolean;
  /** Issue credit notes against existing invoices. */
  creditNotes: boolean;
  /** Recurring invoice rules + cron-driven generation. */
  recurringInvoices: boolean;
  /** FIRS submission + retry on tax invoices. */
  firsCompliance: boolean;
  /** XML download / e-invoicing wire format. */
  electronicXml: boolean;
  /** Delivery note creation + convert-to-invoice. */
  deliveryNotes: boolean;
  /** Quote / offer creation + convert-to-invoice or order. */
  offers: boolean;
  /** Per-document audit trail viewer for the seller. */
  documentAudit: boolean;
  /** Public-pay button on invoices via Paystack. */
  paystackPay: boolean;
  /** Manual + automated invoice reminders (FRIENDLY/OVERDUE/FINAL). */
  paymentReminders: boolean;
};

const FREE: Limits = {
  paymentsPerMonth: 50,
  activeDebts: 20,
  customers: 50,
  templates: 3,
  properties: 1,
  tenants: 5,
  teamMembers: 1,
  bankVerification: true,
  invoices: false,
  products: true,
  expenses: true,
  reports: true,
  csvExport: true,
  checklists: false,
  tasks: true,
  attendance: false,
  payroll: false,
  customBranding: false,
  prioritySupport: false,
  autoReminders: false,
  maxReminderRules: 2,
  behaviorTracking: false,
  collectionScore: false,
  suggestions: false,
  creditNotes: false,
  recurringInvoices: false,
  firsCompliance: false,
  electronicXml: false,
  deliveryNotes: false,
  offers: false,
  documentAudit: false,
  paystackPay: false,
  paymentReminders: false,
};

const BUSINESS: Limits = {
  paymentsPerMonth: null,
  activeDebts: null,
  customers: null,
  templates: null,
  properties: 1,
  tenants: 5,
  teamMembers: 3,
  bankVerification: true,
  invoices: true,
  products: true,
  expenses: true,
  reports: true,
  csvExport: true,
  checklists: true,
  tasks: true,
  attendance: true,
  payroll: true,
  customBranding: false,
  prioritySupport: false,
  autoReminders: true,
  maxReminderRules: 10,
  behaviorTracking: true,
  collectionScore: true,
  suggestions: true,
  creditNotes: true,
  recurringInvoices: true,
  firsCompliance: true,
  electronicXml: true,
  deliveryNotes: true,
  offers: true,
  documentAudit: true,
  paystackPay: true,
  paymentReminders: true,
};

const BUSINESS_PLUS: Limits = {
  ...BUSINESS,
  teamMembers: null,
  customBranding: true,
  prioritySupport: true,
  maxReminderRules: null,
};

const LANDLORD: Limits = {
  ...BUSINESS,
  properties: null,
  tenants: null,
  products: false,
  checklists: false,
  suggestions: false,
};

const ESTATE_MANAGER: Limits = {
  ...LANDLORD,
  teamMembers: null,
  checklists: true,
  tasks: true,
  customBranding: true,
  prioritySupport: true,
};

/** Starter plan — full access to everything */
const STARTER: Limits = {
  ...BUSINESS_PLUS,
  properties: null,
  tenants: null,
};

const PLAN_LIMITS: Record<PlanName, Limits> = {
  free: FREE,
  starter_quarterly: STARTER,
  starter_biannually: STARTER,
  starter_yearly: STARTER,
  // Legacy plans — kept for existing DB rows
  business: BUSINESS,
  business_plus: BUSINESS_PLUS,
  landlord: LANDLORD,
  estate_manager: ESTATE_MANAGER,
};

export function limitsFor(plan: string | null | undefined): Limits {
  return PLAN_LIMITS[(plan as PlanName) ?? 'free'] ?? FREE;
}

export const PLAN_LABELS: Record<PlanName, string> = {
  free: 'Free',
  starter_quarterly: 'Starter (Quarterly)',
  starter_biannually: 'Starter (Biannual)',
  starter_yearly: 'Starter (Yearly)',
  // Legacy
  business: 'Business',
  business_plus: 'Business Plus',
  landlord: 'Landlord',
  estate_manager: 'Estate Manager',
};

export function suggestUpgrade(plan: string, _businessType: string): PlanName {
  // All free users are suggested the quarterly starter plan.
  // Already-paid users on a shorter cycle get suggested yearly for savings.
  if (plan === 'free') return 'starter_quarterly';
  if (plan === 'starter_quarterly') return 'starter_yearly';
  if (plan === 'starter_biannually') return 'starter_yearly';
  // Legacy plans → suggest starter quarterly (they'll migrate on next payment)
  return 'starter_quarterly';
}

// ───────────────────────── effective plan ─────────────────────────

type UserLike = {
  plan: string;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
};

export function effectivePlan(user: UserLike): {
  plan: string;
  status: SubscriptionStatus;
  expired: boolean;
} {
  const now = Date.now();
  const status = (user.subscriptionStatus ??
    (user.plan === 'free' ? 'free' : 'active')) as SubscriptionStatus;

  if (status === 'past_due') {
    return { plan: 'free', status, expired: true };
  }
  if (status === 'trialing') {
    const expired =
      !user.trialEndsAt || user.trialEndsAt.getTime() <= now;
    return {
      plan: expired ? 'free' : user.plan,
      status,
      expired,
    };
  }
  if (status === 'active' || status === 'cancelled') {
    const expired =
      !user.currentPeriodEnd || user.currentPeriodEnd.getTime() <= now;
    return {
      plan: expired ? 'free' : user.plan,
      status,
      expired,
    };
  }
  return { plan: user.plan, status: 'free', expired: false };
}

export function isSubscriptionLapsed(user: UserLike): boolean {
  const { status, expired } = effectivePlan(user);
  if (status === 'past_due') return true;
  if ((status === 'active' || status === 'cancelled') && expired) return true;
  return false;
}
