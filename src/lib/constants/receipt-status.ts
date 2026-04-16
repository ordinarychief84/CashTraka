/**
 * Receipt lifecycle states.
 * - GENERATED: PDF rendered & Receipt row persisted. Default initial state.
 * - EMAILED:   Successfully sent via Resend. `emailedAt` + `emailedTo` populated.
 * - FAILED:    Email attempt failed. Retry-safe — can re-POST /send.
 */

export const RECEIPT_STATUS = {
  GENERATED: 'GENERATED',
  EMAILED: 'EMAILED',
  FAILED: 'FAILED',
} as const;

export type ReceiptStatus =
  (typeof RECEIPT_STATUS)[keyof typeof RECEIPT_STATUS];
