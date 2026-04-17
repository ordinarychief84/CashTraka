import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  businessType: z.enum(['seller', 'property_manager']).optional().default('seller'),
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

const expenseCategories = [
  'Stock',
  'Delivery',
  'Packaging',
  'Data',
  'Wages',
  'Rent',
  'Transport',
  'Other',
] as const;
export type ExpenseCategory = (typeof expenseCategories)[number];
export const EXPENSE_CATEGORIES = expenseCategories;

export const expenseSchema = z.object({
  amount: z.coerce.number().int().positive('Amount must be greater than 0'),
  category: z.enum(expenseCategories),
  note: z.string().trim().max(200).optional().or(z.literal('')),
  incurredOn: z.string().optional(),
  kind: z.enum(['business', 'personal']).default('business'),
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
  name: z.string().trim().min(1, 'Give this template a name').max(60),
  body: z.string().trim().min(3, 'Message body is too short').max(1000),
});
