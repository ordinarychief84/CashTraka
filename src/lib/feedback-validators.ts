import { z } from 'zod';

/**
 * Zod validators for the Service Check (customer feedback) feature.
 *
 * Kept in a small dedicated file so the public submit route, the internal
 * list route, the customer-feedback route, and the settings tab can all
 * import the same shapes without bloating src/lib/validators.ts.
 */

export const FEEDBACK_RATINGS = [
  'VERY_HAPPY',
  'HAPPY',
  'UNHAPPY',
  'VERY_UNHAPPY',
] as const;

export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export const FEEDBACK_REASONS = [
  'DELAY',
  'WRONG_ITEM',
  'POOR_SERVICE',
  'PAYMENT_ISSUE',
  'OTHER',
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export const FEEDBACK_SOURCES = [
  'RECEIPT',
  'INVOICE',
  'PAYMENT',
  'TRANSACTION',
  'MANUAL',
] as const;

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

/** Whether the rating represents a negative customer experience. */
export function isNegativeRating(rating: string): boolean {
  return rating === 'UNHAPPY' || rating === 'VERY_UNHAPPY';
}

/**
 * Public submit body. The customer's browser POSTs this to
 * /api/public/feedback/[token]. Reason is required for negative ratings.
 */
export const feedbackPublicSubmitSchema = z
  .object({
    rating: z.enum(FEEDBACK_RATINGS),
    reason: z.enum(FEEDBACK_REASONS).optional(),
    comment: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine(
    (data) => !isNegativeRating(data.rating) || Boolean(data.reason),
    { message: 'Please tell us what went wrong.', path: ['reason'] },
  );

/** Filter shape for the internal list endpoint. */
export const feedbackFiltersSchema = z.object({
  rating: z.enum(FEEDBACK_RATINGS).optional(),
  isNegative: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
  isResolved: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (typeof v === 'string' ? v === 'true' : v)),
  customerId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** PATCH body when the seller marks a piece of negative feedback as resolved. */
export const feedbackResolveSchema = z.object({
  responseAction: z.string().trim().max(200).optional().or(z.literal('')),
});

/** PATCH body for /api/settings/feedback. All fields optional. */
export const feedbackSettingsSchema = z.object({
  autoSendFeedback: z.boolean().optional(),
  feedbackAfterReceipt: z.boolean().optional(),
  feedbackAfterPayment: z.boolean().optional(),
  feedbackAfterInvoicePaid: z.boolean().optional(),
  feedbackLinkExpiryDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable()
    .optional(),
  feedbackMessageTemplate: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('')),
});

/** Body for POST /api/feedback/create. Mints a link on demand. */
export const feedbackCreateSchema = z
  .object({
    source: z.enum(FEEDBACK_SOURCES),
    receiptId: z.string().trim().min(1).optional(),
    paymentId: z.string().trim().min(1).optional(),
    invoiceId: z.string().trim().min(1).optional(),
    customerId: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) =>
      Boolean(data.receiptId || data.paymentId || data.invoiceId || data.customerId),
    { message: 'Provide at least one of receiptId, paymentId, invoiceId or customerId.' },
  );
