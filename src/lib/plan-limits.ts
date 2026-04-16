/**
 * Plan-tier limits, enforced server-side on write APIs.
 *
 * - `free` sellers: 50 payments/month, 20 active debts, 50 customers, 3 templates.
 * - `free` property managers: 1 property, 5 tenants.
 * - Paid plans: unlimited (represented as `null`).
 *
 * This file is the single source of truth. If a limit needs adjusting for
 * billing, change it here.
 */

export type PlanName =
  | 'free'
  | 'business'
  | 'business_plus'
  | 'landlord'
  | 'estate_manager';

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
  prioritySupport: boolean;
};

const FREE: Limits = {
  paymentsPerMonth: 50,
  activeDebts: 20,
  customers: 50,
  templates: 3,
  properties: 1,
  tenants: 5,
  teamMembers: 1,
  bankVerification: true, // keep enabled on free to make fraud defence universal
  invoices: false,
  products: false,
  expenses: false,
  reports: false,
  csvExport: false,
  checklists: false,
  tasks: false,
  prioritySupport: false,
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
  prioritySupport: false,
};

const BUSINESS_PLUS: Limits = {
  ...BUSINESS,
  teamMembers: null,
  prioritySupport: true,
};

const LANDLORD: Limits = {
  ...BUSINESS,
  properties: null,
  tenants: null,
  // Property managers don't sell products; feature off even if they upgraded by mistake.
  products: false,
  checklists: false,
};

const ESTATE_MANAGER: Limits = {
  ...LANDLORD,
  teamMembers: null,
  prioritySupport: true,
};

const PLAN_LIMITS: Record<PlanName, Limits> = {
  free: FREE,
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
  business: 'Business',
  business_plus: 'Business Plus',
  landlord: 'Landlord',
  estate_manager: 'Estate Manager',
};

/** Human-readable upgrade suggestion based on current plan + business type. */
export function suggestUpgrade(plan: string, businessType: string): PlanName {
  if (businessType === 'property_manager') {
    return plan === 'free' ? 'landlord' : 'estate_manager';
  }
  return plan === 'free' ? 'business' : 'business_plus';
}
