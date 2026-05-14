import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  // Always 'seller' post-pivot. The schema column is retained for
  // back-compat with old signup forms that may still send the field;
  // we coerce to 'seller' downstream.
  businessType: z.literal('seller').optional().default('seller'),
  termsAccepted: z.boolean().optional().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9\s-]{7,20}$/, 'Enter a valid phone number');

export const paymentItemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1),
  unitPrice: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
});

export const paymentSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  phone: phoneSchema,
  amount: z.coerce.number().int().positive('Amount must be greater than 0'),
  status: z.enum(['PAID', 'PENDING']).default('PAID'),
  items: z.array(paymentItemSchema).optional(),
});

export const debtSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  phone: phoneSchema,
  amountOwed: z.coerce.number().int().positive('Amount must be greater than 0'),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().max(100).optional().or(z.literal('')),
  businessAddress: z.string().trim().max(200).optional().or(z.literal('')),
  whatsappNumber: z.string().trim().max(30).optional().or(z.literal('')),
  receiptFooter: z.string().trim().max(200).optional().or(z.literal('')),
  /** Per-business receipt prefix. A-Z + 0-9 only, 1-8 chars. Defaults to "CT". */
  receiptPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .max(8)
    .regex(/^[A-Z0-9]+$/, 'Use uppercase letters and numbers only')
    .optional()
    .or(z.literal('')),
  bankName: z.string().trim().max(60).optional().or(z.literal('')),
  bankAccountNumber: z.string().trim().max(20).optional().or(z.literal('')),
  bankAccountName: z.string().trim().max(100).optional().or(z.literal('')),
  // Always 'seller' post-pivot — see signupSchema above for rationale.
  businessType: z.literal('seller').optional(),

  /// ── Nigerian tax compliance ────────────────────────────────
  /// FIRS-issued TIN. Empty string clears it. Format is typically
  /// "12345678-0001" but FIRS accepts variations; we just length-cap and
  /// strip whitespace.
  tin: z.string().trim().max(20).optional().or(z.literal('')),
  /// Whether the business is VAT-registered with FIRS.
  vatRegistered: z.boolean().optional(),
  /// Default VAT rate (percent) applied when vatRegistered=true.
  vatRate: z.coerce.number().min(0).max(50).optional(),
  /// FIRS MBS merchant ID (provided by FIRS once the business onboards).
  firsMerchantId: z.string().trim().max(64).optional().or(z.literal('')),
});

export const fraudReportSchema = z.object({
  phone: z.string().trim().min(7),
  reason: z.string().trim().min(3).max(300),
});

export const verifyAlertSchema = z.object({
  method: z.enum(['MANUAL', 'BANK_ALERT']),
  text: z.string().optional(),
});

/* ── Business expense categories ── */
const businessExpenseCategories = [
  'Inventory / Stock',
  'Rent / Lease',
  'Salaries / Wages',
  'Utilities',
  'Marketing / Ads',
  'Equipment',
  'Transport / Logistics',
  'Packaging / Supplies',
  'Professional Services',
  'Insurance',
  'Taxes / Levies',
  'Maintenance / Repairs',
  'Software / Subscriptions',
  'Miscellaneous',
] as const;

/* ── Personal expense categories ── */
const personalExpenseCategories = [
  'Food / Meals',
  'Transport / Fuel',
  'Airtime / Data',
  'Health / Medical',
  'Family / Dependents',
  'Clothing',
  'Entertainment',
  'Education',
  'Personal Care',
  'Gifts / Donations',
  'Savings / Investments',
  'Miscellaneous',
] as const;

/* ── Combined (for schema validation) ── */
const allExpenseCategories = [
  ...businessExpenseCategories,
  ...personalExpenseCategories,
] as const;

// Deduplicate for Zod enum (Miscellaneous appears in both)
const uniqueExpenseCategories = [...new Set(allExpenseCategories)] as unknown as readonly [string, ...string[]];

export type ExpenseCategory = (typeof allExpenseCategories)[number];
export const EXPENSE_CATEGORIES = uniqueExpenseCategories;
export const BUSINESS_EXPENSE_CATEGORIES = businessExpenseCategories;
export const PERSONAL_EXPENSE_CATEGORIES = personalExpenseCategories;

/* ── Industry-specific business expense categories ── */
const sellerExpenseCategories = [
  'Inventory / Stock',
  'Packaging / Supplies',
  'Marketing / Ads',
  'Transport / Logistics',
  'Rent / Lease',
  'Equipment',
  'Salaries / Wages',
  'Utilities',
  'Professional Services',
  'Software / Subscriptions',
  'Taxes / Levies',
  'Miscellaneous',
] as const;

const landlordExpenseCategories = [
  'Property Maintenance',
  'Plumbing / Electrical',
  'Security / Gateman',
  'Rent / Lease',
  'Insurance',
  'Property Tax / Levies',
  'Legal Fees',
  'Agent Commission',
  'Renovations / Upgrades',
  'Utilities (Common Areas)',
  'Cleaning / Fumigation',
  'Salaries / Wages',
  'Miscellaneous',
] as const;

export const SELLER_EXPENSE_CATEGORIES = sellerExpenseCategories;
export const LANDLORD_EXPENSE_CATEGORIES = landlordExpenseCategories;

/** Get the right business expense list based on the user's business type */
export function businessCategoriesFor(businessType: string): readonly string[] {
  if (businessType === 'property_manager') return landlordExpenseCategories;
  return sellerExpenseCategories;
}

export const expenseSchema = z.object({
  amount: z.coerce.number().int().positive('Amount must be greater than 0'),
  category: z.string().trim().min(1, 'Category is required'),
  note: z.string().trim().max(200).optional().or(z.literal('')),
  incurredOn: z.string().optional(),
  kind: z.enum(['business', 'personal']).default('business'),
  paymentMethod: z.enum(['cash', 'transfer', 'card', 'pos', 'other']).optional(),
  vendor: z.string().trim().max(100).optional().or(z.literal('')),
  isRecurring: z.boolean().optional().default(false),
  receiptRef: z.string().trim().max(100).optional().or(z.literal('')),
  taxDeductible: z.boolean().optional().default(false),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  price: z.coerce.number().int().positive('Price must be greater than 0'),
  cost: z.coerce.number().int().nonnegative().optional(),
  stock: z.coerce.number().int().nonnegative().default(0),
  trackStock: z.coerce.boolean().default(true),
  lowStockAt: z.coerce.number().int().nonnegative().default(3),
  note: z.string().trim().max(200).optional().or(z.literal('')),
  /// Up to 8 hosted image URLs. Order matters — first is the "main" image
  /// shown as the product card thumbnail.
  images: z.array(z.string().url()).max(8).optional(),
  /// Optional SKU/EAN code shown on the catalog detail page.
  sku: z.string().trim().max(64).optional().or(z.literal('')),
  /// Public-facing description shown on /store/[slug]/[productId].
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  /// NAFDAC certification number (printed on label/receipt when set).
  nafdacNumber: z.string().trim().max(64).optional().or(z.literal('')),
  /// Default shelf life in days for production-batch expiry stamping.
  shelfLifeDays: z.coerce.number().int().positive().max(36500).optional(),
});

export const saleItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().trim().min(1, 'Item description is required'),
  unitPrice: z.coerce.number().int().positive('Price must be greater than 0'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1').default(1),
});

export const recordSaleSchema = z.object({
  customerName: z.string().trim().optional().or(z.literal('')),
  customerPhone: z.string().trim().optional().or(z.literal('')),
  customerEmail: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'POS', 'CARD']).default('CASH'),
  discount: z.coerce.number().int().nonnegative().default(0),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(saleItemSchema).min(1, 'Add at least one item'),
  sendReceipt: z.boolean().optional().default(false),
});

export const templateSchema = z.object({
  name: z.string().trim().min(1, 'Give this template a name'),
  body: z.string().trim().min(1, 'Message body is required'),
});

export const invoiceSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  phone: phoneSchema,
  customerEmail: z.string().email().optional().or(z.literal('')),
  items: z.array(paymentItemSchema),
  tax: z.coerce.number().int().nonnegative().default(0),
  note: z.string().trim().optional().or(z.literal('')),
});

export const invoiceUpdateSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED']),
});

// ---------- PROMISE TO PAY ----------

export const createPromiseSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required'),
  phone: phoneSchema,
  amount: z.coerce.number().int().positive('Amount must be greater than 0'),
  note: z.string().trim().max(500).optional(),
  customerId: z.string().optional(),
  debtId: z.string().optional(),
  paymentRequestId: z.string().optional(),
});

export const promiseCommitmentSchema = z.object({
  commitmentType: z.enum(['PAY_NOW', 'PAY_PART', 'PAY_ON_DATE']),
  amount: z.coerce.number().int().positive().optional(),
  promisedDate: z.string().optional(),
  message: z.string().trim().max(500).optional(),
  email: z.string().email().optional(),
}).refine(
  (data) => {
    if (data.commitmentType === 'PAY_PART' && !data.amount) return false;
    if (data.commitmentType === 'PAY_ON_DATE' && !data.promisedDate) return false;
    return true;
  },
  { message: 'Amount required for partial payment, date required for promise' },
);

export const initPromisePaymentSchema = z.object({
  amount: z.coerce.number().int().positive('Amount must be greater than 0'),
  email: z.string().email('Valid email required for payment'),
  provider: z.enum(['PAYSTACK', 'FLUTTERWAVE']).optional(),
});

/* ─────────────────────────────────────────────────────────────────
 * Operational Planning — small-batch ops pivot.
 * Validators for suppliers, raw materials, recipes, customer orders,
 * production orders, purchase orders, and inventory adjustments.
 * Reused by both API routes and server actions.
 * ──────────────────────────────────────────────────────────────── */

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);
const trimmedString = (max: number, min = 1) =>
  z.string().trim().min(min).max(max);

export const supplierSchema = z.object({
  name: trimmedString(120),
  contactPerson: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  email: z.preprocess(emptyToUndefined, z.string().trim().toLowerCase().email().optional()),
  address: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
});

export const supplierUpdateSchema = supplierSchema.partial();

export const rawMaterialUnitSchema = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .regex(/^[A-Za-z0-9_./\- ]+$/, 'Use letters, numbers, and basic punctuation only.');

export const rawMaterialSchema = z.object({
  name: trimmedString(120),
  sku: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  unit: z.preprocess(emptyToUndefined, rawMaterialUnitSchema.optional()),
  stock: z.coerce.number().int().nonnegative().optional(),
  reorderLevel: z.coerce.number().int().nonnegative().optional(),
  unitCostKobo: z.coerce.number().int().nonnegative().optional(),
  supplierId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  expiresAt: z.preprocess(
    emptyToUndefined,
    z.coerce.date().optional(),
  ),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
});

export const rawMaterialUpdateSchema = rawMaterialSchema.partial();

export const stockMovementReasonSchema = z.enum([
  'PURCHASE_RECEIVE',
  'PRODUCTION_CONSUME',
  'PRODUCTION_PRODUCE',
  'SALE',
  'ADJUSTMENT',
  'WRITE_OFF',
  'RETURN',
]);

export const adjustStockSchema = z.object({
  delta: z.coerce
    .number()
    .int()
    .refine((v) => v !== 0, { message: 'Delta must be non-zero.' }),
  reason: stockMovementReasonSchema.optional(),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
});

export const recipeItemSchema = z.object({
  materialId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
});

export const recipeSchema = z.object({
  yieldQty: z.coerce.number().int().positive().default(1),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  items: z.array(recipeItemSchema).min(1, 'Add at least one material.'),
});

export const customerOrderItemSchema = z.object({
  productId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  description: trimmedString(200),
  quantity: z.coerce.number().int().positive().default(1),
  unitPriceKobo: z.coerce.number().int().nonnegative().default(0),
});

export const customerOrderSchema = z.object({
  customerId: z.preprocess(emptyToUndefined, z.string().cuid().optional()),
  customerName: trimmedString(120),
  customerPhone: z.preprocess(emptyToUndefined, z.string().trim().max(30).optional()),
  dueAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  items: z.array(customerOrderItemSchema).min(1, 'Add at least one item.'),
});

export const customerOrderStatusSchema = z.object({
  status: z.enum(['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED']),
  reason: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
});

export const productionOrderItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
});

export const productionOrderSchema = z.object({
  plannedStartAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  plannedEndAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  items: z.array(productionOrderItemSchema).min(1, 'Add at least one product.'),
});

export const purchaseOrderItemSchema = z.object({
  materialId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
  unitCostKobo: z.coerce.number().int().nonnegative().default(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().cuid(),
  expectedAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  items: z.array(purchaseOrderItemSchema).min(1, 'Add at least one material.'),
});

export const purchaseOrderReceiveSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().cuid(),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1),
  notes: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
});
