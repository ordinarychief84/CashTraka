/**
 * Business-type helpers — thin shim after the landlord-vertical removal.
 * The product is now a single line: CashTraka — Operational Planning
 * System for Small Batch Businesses (sellers). The legacy `BusinessType`
 * type and `copyFor` helper remain so existing call-sites still
 * type-check; `isPropertyManager` was removed in the audit pass.
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

export function copyFor(_type?: string | null | undefined) {
  return SELLER_COPY;
}
