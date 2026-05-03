import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { Err } from '@/lib/errors';
import { ReceiptDoc, type ReceiptData } from '@/lib/pdf-docs';
import { displayPhone } from '@/lib/whatsapp';
import { receiptRepo, nextReceiptNumber } from '@/lib/repositories/receipt.repository';
import { RECEIPT_STATUS } from '@/lib/constants/receipt-status';
import { uploadPdf } from '@/lib/uploadcare/upload';
import { emailService } from './email.service';
import { feedbackService } from './feedback.service';

/**
 * Receipt lifecycle:
 *   1. `generate()` renders a PDF, uploads it to Cloudinary (optional), and
 *      persists a Receipt row linked to the source payment or debt.
 *   2. `sendEmail()` attaches the PDF and delivers it via Resend; success flips
 *      status → EMAILED, failure flips → FAILED.
 *   3. `streamPdf()` returns a live PDF buffer so /api/receipts/[id] can serve
 *      it inline even if Cloudinary isn't configured.
 */

type SourceRef =
  | { paymentId: string; debtId?: never }
  | { debtId: string; paymentId?: never };

export type ReceiptSource =
  | 'MANUAL'
  | 'PAYSTACK'
  | 'PROMISE'
  | 'INSTALLMENT'
  | 'DEBT'
  | 'CATALOG';

async function buildReceiptData(
  userId: string,
  src: SourceRef,
  receiptNumber?: string | null,
): Promise<{
  data: ReceiptData;
  customerId: string | null;
  amount: number;
  phone: string | null;
  customerName: string;
  balanceRemaining: number | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      businessName: true,
      businessAddress: true,
      whatsappNumber: true,
      receiptFooter: true,
      logoUrl: true,
    },
  });
  if (!user) throw Err.notFound('User not found');

  if ('paymentId' in src && src.paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: src.paymentId },
      include: { items: true },
    });
    if (!payment || payment.userId !== userId) throw Err.notFound('Payment not found');

    // If this payment was the source of a Promise-to-Pay or Debt partial settlement,
    // surface the remaining balance so the receipt can show it.
    let balanceRemaining: number | null = null;
    const promisePayment = await prisma.promisePayment.findFirst({
      where: { providerTransactionId: payment.providerTransactionId ?? '__never__' },
      include: { promiseToPay: { select: { remainingAmount: true } } },
    }).catch(() => null);
    if (promisePayment?.promiseToPay && promisePayment.promiseToPay.remainingAmount > 0) {
      balanceRemaining = promisePayment.promiseToPay.remainingAmount;
    }

    // If a tax Invoice was created for this payment (manual receipt with VAT,
    // or invoice-from-payment), use its breakdown so the receipt PDF shows
    // the VAT line and matches the customer's tax invoice exactly.
    const linkedInvoice = await prisma.invoice
      .findUnique({
        where: { paymentId: payment.id },
        select: { vatApplied: true, vatRate: true, tax: true, subtotal: true },
      })
      .catch(() => null);

    const vat =
      linkedInvoice && linkedInvoice.vatApplied && linkedInvoice.tax > 0
        ? { rate: linkedInvoice.vatRate, amount: linkedInvoice.tax, subtotal: linkedInvoice.subtotal }
        : null;

    return {
      data: {
        business: user.businessName || user.name || 'Seller',
        businessAddress: user.businessAddress,
        whatsappNumber: user.whatsappNumber ? displayPhone(user.whatsappNumber) : null,
        receiptFooter: user.receiptFooter,
        receiptId: payment.id,
        receiptNumber: receiptNumber ?? null,
        customerName: payment.customerNameSnapshot,
        customerPhone: displayPhone(payment.phoneSnapshot),
        createdAt: payment.createdAt,
        status: payment.status,
        amount: payment.amount,
        balanceRemaining,
        vat,
        items: payment.items.map((i) => ({
          description: i.description,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
        })),
      },
      customerId: payment.customerId,
      amount: payment.amount,
      phone: payment.phoneSnapshot,
      customerName: payment.customerNameSnapshot,
      balanceRemaining,
    };
  }

  if ('debtId' in src && src.debtId) {
    const debt = await prisma.debt.findUnique({ where: { id: src.debtId } });
    if (!debt || debt.userId !== userId) throw Err.notFound('Debt not found');
    const balanceRemaining =
      debt.amountOwed > debt.amountPaid ? debt.amountOwed - debt.amountPaid : null;
    return {
      data: {
        business: user.businessName || user.name || 'Seller',
        businessAddress: user.businessAddress,
        whatsappNumber: user.whatsappNumber ? displayPhone(user.whatsappNumber) : null,
        receiptFooter: user.receiptFooter,
        receiptId: debt.id,
        receiptNumber: receiptNumber ?? null,
        customerName: debt.customerNameSnapshot,
        customerPhone: displayPhone(debt.phoneSnapshot),
        createdAt: debt.updatedAt,
        status: 'PAID',
        amount: debt.amountPaid > 0 ? debt.amountPaid : debt.amountOwed,
        balanceRemaining,
        items: [],
      },
      customerId: debt.customerId,
      amount: debt.amountPaid > 0 ? debt.amountPaid : debt.amountOwed,
      phone: debt.phoneSnapshot,
      customerName: debt.customerNameSnapshot,
      balanceRemaining,
    };
  }

  throw Err.validation('Must provide paymentId or debtId');
}

async function renderPdfBuffer(data: ReceiptData): Promise<Buffer> {
  const buf = await renderToBuffer(ReceiptDoc({ data }));
  // renderToBuffer returns a Node Buffer; narrow the type.
  return buf as unknown as Buffer;
}

export const receiptService = {
  /**
   * Idempotent — if a Receipt already exists for this payment/debt, return it;
   * otherwise render, (optionally) upload to Cloudinary, and persist.
   */
  async generate(
    userId: string,
    src: SourceRef,
    opts?: { source?: ReceiptSource; balanceRemaining?: number | null },
  ): Promise<{ id: string; receiptNumber: string; pdfUrl: string | null; status: string }> {
    const existing =
      'paymentId' in src && src.paymentId
        ? await receiptRepo.byPaymentId(src.paymentId)
        : 'debtId' in src && src.debtId
          ? await receiptRepo.byDebtId(src.debtId)
          : null;
    if (existing) return existing;

    const receiptNumber = await nextReceiptNumber(userId);
    const built = await buildReceiptData(userId, src, receiptNumber);
    const { customerId } = built;
    // Caller-supplied balance (e.g., from confirmInstallmentCharge) wins over derived.
    const effectiveBalance =
      typeof opts?.balanceRemaining === 'number'
        ? opts.balanceRemaining
        : built.balanceRemaining;
    const data: ReceiptData = { ...built.data, balanceRemaining: effectiveBalance };
    const buffer = await renderPdfBuffer(data);

    let pdfUrl: string | null = null;
    try {
      const upload = await uploadPdf(buffer, {
        folder: `cashtraka/receipts/${userId}`,
        publicId: receiptNumber,
      });
      pdfUrl = upload?.url ?? null;
    } catch (e) {
      // Non-fatal: we can always re-render on demand via /api/receipts/[id].
      if (process.env.NODE_ENV !== 'production') console.warn('Cloudinary upload failed', e);
    }

    const receipt = await receiptRepo.create({
      user: { connect: { id: userId } },
      customerId: customerId ?? null,
      paymentId: 'paymentId' in src ? src.paymentId! : null,
      debtId: 'debtId' in src ? src.debtId! : null,
      receiptNumber,
      pdfUrl,
      status: RECEIPT_STATUS.GENERATED,
      balanceRemaining: effectiveBalance && effectiveBalance > 0 ? effectiveBalance : null,
      source: opts?.source ?? 'MANUAL',
    });

    // Mark the source record as receipt-sent (for payments — existing field).
    if ('paymentId' in src && src.paymentId) {
      await prisma.payment
        .update({ where: { id: src.paymentId }, data: { receiptSentAt: new Date() } })
        .catch(() => null);
    }

    // Best-effort: mint a Service Check feedback link if the seller has
    // auto-send enabled. Never bubbles up — the receipt has already been
    // persisted regardless of what happens here.
    feedbackService
      .maybeCreateAfterReceipt(receipt.id, userId)
      .catch(() => null);

    return receipt;
  },

  /** Auto-trigger used by the verify flow. Idempotent. */
  async ensureForPayment(
    userId: string,
    paymentId: string,
    opts?: { source?: ReceiptSource; balanceRemaining?: number | null },
  ) {
    return this.generate(userId, { paymentId }, opts);
  },

  /** Auto-trigger used by debtService.markPaid. Idempotent. */
  async ensureForDebt(
    userId: string,
    debtId: string,
    opts?: { source?: ReceiptSource; balanceRemaining?: number | null },
  ) {
    return this.generate(userId, { debtId }, opts ?? { source: 'DEBT' });
  },

  /**
   * Render the PDF for a Receipt (or fall back to on-demand render from the
   * source payment if the Receipt row doesn't exist yet — keeps
   * /api/receipts/[id] working for legacy calls that still pass a paymentId).
   */
  async streamPdf(userId: string, idOrPaymentId: string): Promise<{ buffer: Buffer; filename: string }> {
    // 1) Try as Receipt id
    const receipt = await receiptRepo.byId(idOrPaymentId);
    if (receipt && receipt.userId === userId) {
      const src: SourceRef = receipt.paymentId
        ? { paymentId: receipt.paymentId }
        : { debtId: receipt.debtId! };
      const built = await buildReceiptData(userId, src, receipt.receiptNumber);
      const data: ReceiptData = {
        ...built.data,
        balanceRemaining: receipt.balanceRemaining ?? built.balanceRemaining,
      };
      const buffer = await renderPdfBuffer(data);
      return { buffer, filename: `${receipt.receiptNumber}.pdf` };
    }

    // 2) Fall back: treat as paymentId
    const payment = await prisma.payment.findUnique({ where: { id: idOrPaymentId } });
    if (payment && payment.userId === userId) {
      const { data } = await buildReceiptData(userId, { paymentId: payment.id });
      const buffer = await renderPdfBuffer(data);
      return { buffer, filename: `receipt-${payment.id.slice(-8).toUpperCase()}.pdf` };
    }

    throw Err.notFound('Receipt not found');
  },

  /**
   * Public streaming (same logic without ownership check) — used by the
   * existing public /api/receipts/[id] which the customer is meant to open.
   */
  async streamPdfPublic(idOrPaymentId: string): Promise<{ buffer: Buffer; filename: string }> {
    const receipt = await receiptRepo.byId(idOrPaymentId);
    if (receipt) {
      const src: SourceRef = receipt.paymentId
        ? { paymentId: receipt.paymentId }
        : { debtId: receipt.debtId! };
      const built = await buildReceiptData(receipt.userId, src, receipt.receiptNumber);
      const data: ReceiptData = {
        ...built.data,
        balanceRemaining: receipt.balanceRemaining ?? built.balanceRemaining,
      };
      const buffer = await renderPdfBuffer(data);
      return { buffer, filename: `${receipt.receiptNumber}.pdf` };
    }
    const payment = await prisma.payment.findUnique({ where: { id: idOrPaymentId } });
    if (payment) {
      const { data } = await buildReceiptData(payment.userId, { paymentId: payment.id });
      const buffer = await renderPdfBuffer(data);
      return { buffer, filename: `receipt-${payment.id.slice(-8).toUpperCase()}.pdf` };
    }
    throw Err.notFound('Receipt not found');
  },

  /** Email a generated receipt to the customer. Updates Receipt.status. */
  async sendEmail(userId: string, receiptId: string, to: string) {
    const receipt = await receiptRepo.byId(receiptId);
    if (!receipt || receipt.userId !== userId) throw Err.notFound('Receipt not found');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, businessName: true },
    });

    // Render fresh PDF for the attachment — avoids stale storage issues.
    const src: SourceRef = receipt.paymentId
      ? { paymentId: receipt.paymentId }
      : { debtId: receipt.debtId! };
    const built = await buildReceiptData(userId, src, receipt.receiptNumber);
    const data: ReceiptData = {
      ...built.data,
      balanceRemaining: receipt.balanceRemaining ?? built.balanceRemaining,
    };
    const customerName = built.customerName;
    const buffer = await renderPdfBuffer(data);
    const pdfBase64 = buffer.toString('base64');

    const result = await emailService.sendReceipt({
      to,
      business: user?.businessName || user?.name || 'CashTraka',
      customerName,
      receiptNumber: receipt.receiptNumber,
      amount: data.amount,
      receiptUrl: `/r/${receipt.paymentId ?? receipt.id}`,
      pdfBase64,
    });

    if (result.ok) {
      await receiptRepo.update(receiptId, {
        status: RECEIPT_STATUS.EMAILED,
        emailedAt: new Date(),
        emailedTo: to,
      });
      return { ok: true, messageId: result.id };
    }
    await receiptRepo.update(receiptId, { status: RECEIPT_STATUS.FAILED });
    return { ok: false, error: result.error };
  },
};
