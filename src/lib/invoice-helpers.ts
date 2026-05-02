/**
 * Small helpers shared across invoice / credit-note / offer / delivery-note
 * routes. Kept thin — most domain logic still lives in the services.
 */

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

/**
 * Generate a non-guessable public token for an invoice / credit note /
 * offer. We use 24 bytes -> ~32 base64url chars, plenty of entropy and
 * still short enough to share over WhatsApp without wrapping.
 */
export function makePublicToken(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Ensure an Invoice has a publicToken. Idempotent: if one is already set,
 * returns it; otherwise mints, persists, and returns the new one.
 */
export async function ensureInvoicePublicToken(invoiceId: string): Promise<string> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { publicToken: true },
  });
  if (inv?.publicToken) return inv.publicToken;
  const token = makePublicToken();
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { publicToken: token },
  });
  return token;
}

/**
 * Per-business numbering. Picks the highest existing number with the
 * given prefix for this user, increments by 1, retries on race.
 *
 * Stays in this helper (instead of leaning on `nextInvoiceNumber` etc.)
 * so we can use the same pattern for credit notes, offers, delivery
 * notes, and order confirmations without copy-pasting.
 */
export async function nextDocumentNumber(args: {
  userId: string;
  /** "INV" | "CN" | "OFF" | "DN" | "ORD" — the seller-configurable prefix. */
  prefix: string;
  /** Prisma model: 'invoice' | 'creditNote' | 'offer' | 'deliveryNote' | 'orderConfirmation'. */
  table: 'invoice' | 'creditNote' | 'offer' | 'deliveryNote' | 'orderConfirmation';
  /** The unique number column on that model. */
  field:
    | 'invoiceNumber'
    | 'creditNoteNumber'
    | 'offerNumber'
    | 'deliveryNoteNumber'
    | 'orderNumber';
}): Promise<string> {
  const safePrefix = args.prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DOC';

  // Find the max existing number for this prefix on this user.
  // Using $queryRawUnsafe so the table/column substitution is explicit.
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT "${args.field}" AS n FROM "${args.table[0].toUpperCase() + args.table.slice(1)}"
     WHERE "userId" = $1 AND "${args.field}" LIKE $2
     ORDER BY "createdAt" DESC LIMIT 1`,
    args.userId,
    `${safePrefix}-%`,
  )) as Array<{ n: string }>;

  let seq = 1;
  if (rows.length > 0) {
    const m = rows[0].n.match(/(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${safePrefix}-${String(seq + attempt).padStart(5, '0')}`;
    // Check uniqueness on the column (it's unique globally, not per user).
    const clash = (await prisma.$queryRawUnsafe(
      `SELECT 1 FROM "${args.table[0].toUpperCase() + args.table.slice(1)}"
       WHERE "${args.field}" = $1 LIMIT 1`,
      candidate,
    )) as unknown[];
    if (clash.length === 0) return candidate;
  }
  return `${safePrefix}-${String(seq).padStart(5, '0')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

/**
 * Compute totals from a list of items + a discount + a VAT rate.
 * Used by both the manual invoice route and the recurring-invoice cron.
 */
export function computeInvoiceTotals(args: {
  items: Array<{ unitPrice: number; quantity: number }>;
  discount?: number;
  vatRate?: number;
  applyVat?: boolean;
}): { subtotal: number; discount: number; tax: number; total: number; vatRate: number } {
  const subtotal = args.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  const discount = Math.max(0, Math.min(args.discount ?? 0, subtotal));
  const taxableBase = subtotal - discount;
  const vatRate = args.applyVat ? args.vatRate ?? 0 : 0;
  const tax = Math.round((taxableBase * vatRate) / 100);
  const total = taxableBase + tax;
  return { subtotal, discount, tax, total, vatRate };
}

/**
 * Compute the invoice's effective status given the canonical fields.
 * Used by the dashboard query and the public page so we don't end up with
 * stale "SENT" rows that should be "OVERDUE" or "PARTIALLY_PAID".
 */
export function effectiveInvoiceStatus(invoice: {
  status: string;
  total: number;
  amountPaid: number;
  dueDate: Date | null;
}): string {
  if (invoice.status === 'CANCELLED' || invoice.status === 'CREDITED') return invoice.status;
  if (invoice.amountPaid >= invoice.total && invoice.total > 0) return 'PAID';
  if (invoice.amountPaid > 0 && invoice.amountPaid < invoice.total) return 'PARTIALLY_PAID';
  if (invoice.dueDate && invoice.dueDate.getTime() < Date.now()) return 'OVERDUE';
  return invoice.status;
}
