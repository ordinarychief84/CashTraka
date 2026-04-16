/**
 * Centralized ICP (Ideal Customer Profile) logic for CashTraka.
 *
 * Supports two business types today:
 *   - `seller` — WhatsApp-based small business selling products/services
 *   - `property_manager` — landlord / rental manager tracking tenants and rent
 *
 * All role-specific language, feature visibility, and dashboard copy flows
 * through this file so adding a new ICP (e.g. `service_provider`) is one place.
 */

export type BusinessType = 'seller' | 'property_manager';

export const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: 'seller',
    label: 'Small business / WhatsApp seller',
    description: 'You sell products or services and get paid by customers.',
    emoji: '🛍️',
  },
  {
    value: 'property_manager',
    label: 'Property manager / landlord',
    description: 'You collect rent from tenants across one or more properties.',
    emoji: '🏠',
  },
];

/** Language pack — labels and copy that adapt to the user's business type. */
export const COPY: Record<BusinessType, {
  customerLabel: string;       // "Customer" vs "Tenant"
  customerLabelPlural: string;
  debtLabel: string;           // "Debt" vs "Unpaid rent"
  debtLabelPlural: string;
  paymentLabel: string;        // "Payment" vs "Rent payment"
  greetingSub: string;         // Dashboard subtitle
  emptyPaymentsMessage: string;
  emptyDebtsMessage: string;
  emptyCustomersMessage: string;
}> = {
  seller: {
    customerLabel: 'Customer',
    customerLabelPlural: 'Customers',
    debtLabel: 'Debt',
    debtLabelPlural: 'Debts',
    paymentLabel: 'Payment',
    greetingSub: "Here's where your money stands today.",
    emptyPaymentsMessage: 'Record a sale you received — cash or transfer.',
    emptyDebtsMessage: 'Log who still owes you so you can follow up.',
    emptyCustomersMessage: 'Customers are saved automatically when you add a payment or debt.',
  },
  property_manager: {
    customerLabel: 'Tenant',
    customerLabelPlural: 'Tenants',
    debtLabel: 'Unpaid rent',
    debtLabelPlural: 'Unpaid rent',
    paymentLabel: 'Rent payment',
    greetingSub: 'Your rent collection at a glance.',
    emptyPaymentsMessage: 'Record a rent payment from a tenant.',
    emptyDebtsMessage: 'Log tenants who are behind on rent.',
    emptyCustomersMessage: 'Manage your tenants from the Properties page.',
  },
};

/**
 * Feature visibility matrix — which routes / UI blocks each business type sees.
 * This is UI-only; backend logic remains shared.
 */
export const FEATURES: Record<string, BusinessType[]> = {
  // Core (both)
  payments: ['seller', 'property_manager'],
  debts: ['seller', 'property_manager'],
  customers: ['seller', 'property_manager'],
  followUp: ['seller', 'property_manager'],
  reports: ['seller', 'property_manager'],
  reminders: ['seller', 'property_manager'],
  templates: ['seller', 'property_manager'],
  settings: ['seller', 'property_manager'],

  // Seller-dominant
  products: ['seller'],
  expenses: ['seller', 'property_manager'],
  invoices: ['seller', 'property_manager'],
  team: ['seller', 'property_manager'],
  tasks: ['seller', 'property_manager'],
  checklists: ['seller', 'property_manager'],

  // Property-manager-only
  properties: ['property_manager'],
  tenants: ['property_manager'],
  rent: ['property_manager'],
};

/** Returns true if the given business type has access to the named feature. */
export function canAccess(feature: string, type: BusinessType | string | null | undefined): boolean {
  const t = (type ?? 'seller') as BusinessType;
  const allowed = FEATURES[feature];
  if (!allowed) return true; // default: show if not explicitly restricted
  return allowed.includes(t);
}

/** Shortcut helper for common ICP check. */
export function isPropertyManager(type: string | null | undefined): boolean {
  return type === 'property_manager';
}

/** Get the copy pack for a business type. */
export function copyFor(type: string | null | undefined) {
  const t = (type ?? 'seller') as BusinessType;
  return COPY[t] ?? COPY.seller;
}
