/**
 * Single source of truth for plan prices, used by the pricing marketing card
 * AND by the billing service when creating Paystack transactions. Never read
 * a price from anywhere else — changing this one map updates both places.
 *
 * All amounts are in **kobo** (100 kobo = 1 NGN) because that's what Paystack
 * wants. `formatPriceNaira()` renders for the UI.
 *
 * Pricing model:
 * - One plan: "Starter" — full feature access
 * - Three billing frequencies: Quarterly, Biannually, Yearly
 * - Each frequency has a free trial period (7 days)
 * - Longer commitments get better per-month rates
 */

export type BillingFrequency = 'quarterly' | 'biannually' | 'yearly';

export type PaidPlanKey =
  | 'starter_quarterly'
  | 'starter_biannually'
  | 'starter_yearly';

export type PlanPricing = {
  key: PaidPlanKey;
  label: string;
  frequency: BillingFrequency;
  amountKobo: number;
  cycleDays: number;
  trialDays: number;
  /** Per-month equivalent for display */
  perMonthKobo: number;
  /** Savings percentage vs quarterly */
  savingsPercent: number;
};

export const PLAN_PRICING: Record<PaidPlanKey, PlanPricing> = {
  starter_quarterly: {
    key: 'starter_quarterly',
    label: 'Starter',
    frequency: 'quarterly',
    amountKobo: 12_000 * 100, // ₦12,000 every 3 months
    cycleDays: 90,
    trialDays: 7,
    perMonthKobo: 4_000 * 100, // ₦4,000/mo
    savingsPercent: 0,
  },
  starter_biannually: {
    key: 'starter_biannually',
    label: 'Starter',
    frequency: 'biannually',
    amountKobo: 20_000 * 100, // ₦20,000 every 6 months
    cycleDays: 180,
    trialDays: 7,
    perMonthKobo: 3_333 * 100, // ~₦3,333/mo
    savingsPercent: 17,
  },
  starter_yearly: {
    key: 'starter_yearly',
    label: 'Starter',
    frequency: 'yearly',
    amountKobo: 36_000 * 100, // ₦36,000/year
    cycleDays: 365,
    trialDays: 7,
    perMonthKobo: 3_000 * 100, // ₦3,000/mo
    savingsPercent: 25,
  },
};

/** All available frequencies in order */
export const BILLING_FREQUENCIES: BillingFrequency[] = ['quarterly', 'biannually', 'yearly'];

export const FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  quarterly: 'Quarterly',
  biannually: 'Biannually',
  yearly: 'Yearly',
};

export const FREQUENCY_DESCRIPTIONS: Record<BillingFrequency, string> = {
  quarterly: 'Billed every 3 months',
  biannually: 'Billed every 6 months',
  yearly: 'Billed once a year',
};

/** Backwards-compat: also accept legacy plan keys during transition */
export function isPaidPlan(key: string | null | undefined): key is PaidPlanKey {
  return (
    key === 'starter_quarterly' ||
    key === 'starter_biannually' ||
    key === 'starter_yearly' ||
    // Legacy keys — treat as equivalent to starter_quarterly for existing users
    key === 'business' ||
    key === 'business_plus' ||
    key === 'landlord' ||
    key === 'estate_manager'
  );
}

export function formatPriceNaira(amountKobo: number): string {
  const naira = Math.round(amountKobo / 100);
  return '₦' + naira.toLocaleString('en-NG');
}

/** Get plan config by frequency */
export function getPlanByFrequency(freq: BillingFrequency): PlanPricing {
  return PLAN_PRICING[`starter_${freq}` as PaidPlanKey];
}

/**
 * Map legacy plan keys to the new Starter quarterly plan.
 * Used by billing service during the transition period.
 */
const LEGACY_MAP: Record<string, PaidPlanKey> = {
  business: 'starter_quarterly',
  business_plus: 'starter_quarterly',
  landlord: 'starter_quarterly',
  estate_manager: 'starter_quarterly',
};

export function resolvePlanKey(key: string): PaidPlanKey | null {
  if (key in PLAN_PRICING) return key as PaidPlanKey;
  if (key in LEGACY_MAP) return LEGACY_MAP[key];
  return null;
}

export function getPlanPricing(key: string): PlanPricing | null {
  const resolved = resolvePlanKey(key);
  return resolved ? PLAN_PRICING[resolved] : null;
}
