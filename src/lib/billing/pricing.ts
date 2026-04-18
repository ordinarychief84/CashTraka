/**
 * Single source of truth for plan prices, used by the pricing marketing card
 * AND by the billing service when creating Paystack transactions. Never read
 * a price from anywhere else — changing this one map updates both places.
 *
 * All amounts are in **kobo** (100 kobo = 1 NGN) because that's what Paystack
 * wants. `formatPriceNaira()` renders for the UI.
 */

export type PaidPlanKey =
  | 'business'
  | 'business_plus'
  | 'landlord'
  | 'estate_manager';

export type PlanPricing = {
  key: PaidPlanKey;
  label: string;
  amountKobo: number;
  cycleDays: number;
};

export const PLAN_PRICING: Record<PaidPlanKey, PlanPricing> = {
  business: {
    key: 'business',
    label: 'Business',
    amountKobo: 4_500 * 100,
    cycleDays: 30,
  },
  business_plus: {
    key: 'business_plus',
    label: 'Business Plus',
    amountKobo: 6_800 * 100,
    cycleDays: 30,
  },
  landlord: {
    key: 'landlord',
    label: 'Landlord',
    amountKobo: 8_500 * 100,
    cycleDays: 30,
  },
  estate_manager: {
    key: 'estate_manager',
    label: 'Estate Manager',
    amountKobo: 18_000 * 100,
    cycleDays: 30,
  },
};

export function isPaidPlan(key: string | null | undefined): key is PaidPlanKey {
  return (
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
