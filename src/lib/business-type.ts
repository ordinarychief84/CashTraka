/**
 * Business-type helpers — kept as thin shims after the landlord-vertical
 * removal. The product is now a single line: CashTraka — Operational
 * Planning System for Small Batch Businesses (sellers). The legacy
 * `BusinessType` type and `copyFor` helper remain so existing callers
 * across the codebase keep compiling; `isPropertyManager` always returns
 * false so any residual conditional branches no-op cleanly.
 *
 * Schedule for full removal: once every caller is rewritten to drop the
 * business-type indirection, delete this file.
 */

export type BusinessType = 'seller';

export const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  productName: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: 'seller',
    label: 'Small Business',
    productName: 'CashTraka',
    description:
      'Shops, factories, workshops, food processors, skincare brands, fashion makers — anyone planning, producing, and selling.',
    emoji: '🛍️',
  },
];

const SELLER_COPY = {
  customerLabel: 'Customer',
  customerLabelPlural: 'Customers',
  debtLabel: 'Debt',
  debtLabelPlural: 'Debts',
  paymentLabel: 'Payment',
  greetingSub: "Here's where your money stands today.",
  emptyPaymentsMessage: 'Record a sale you received — cash or transfer.',
  emptyDebtsMessage: 'Log who still owes you so you can follow up.',
  emptyCustomersMessage:
    'Customers are saved automatically when you add a payment or debt.',
};

export const COPY: Record<BusinessType, typeof SELLER_COPY> = {
  seller: SELLER_COPY,
};

/**
 * Feature visibility matrix — every feature is now seller-only.
 * Retained for back-compat with imports across the codebase.
 */
export const FEATURES: Record<string, BusinessType[]> = {
  payments: ['seller'],
  debts: ['seller'],
  customers: ['seller'],
  followUp: ['seller'],
  reports: ['seller'],
  reminders: ['seller'],
  templates: ['seller'],
  settings: ['seller'],
  products: ['seller'],
  sales: ['seller'],
  expenses: ['seller'],
  invoices: ['seller'],
  team: ['seller'],
  tasks: ['seller'],
  checklists: ['seller'],
};

export function canAccess(
  feature: string,
  _type?: BusinessType | string | null | undefined,
): boolean {
  const allowed = FEATURES[feature];
  if (!allowed) return true;
  return allowed.includes('seller');
}

/**
 * Always false — the landlord vertical was removed during the small-batch
 * ops pivot. Kept so existing conditional branches in legacy code stop
 * rendering landlord-specific UI without each call-site needing edits.
 */
export function isPropertyManager(_type?: string | null | undefined): boolean {
  return false;
}

export function copyFor(_type?: string | null | undefined) {
  return SELLER_COPY;
}
