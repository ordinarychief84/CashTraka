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
    frequency: 'biannually