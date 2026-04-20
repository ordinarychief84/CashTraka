import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  businessType: z.enum(['seller', 'property_manager']).optional().default('seller'),
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
  bankName: z.string().trim().max(60).optional().or(z.literal('')),
  bankAccountNumber: z.string().trim().max(20).optional().or(z.literal('')),
  bankAccountName: z.string().trim().max(100).optional().or(z.literal('')),
  businessType: z.enum(['seller', 'property_manager']).optional(),
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
