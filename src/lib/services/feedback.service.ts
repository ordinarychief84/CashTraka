/**
 * Service Check (customer feedback) - internal service.
 *
 * Handles minting feedback links, listing feedback, computing metrics,
 * marking feedback resolved, and the post-event hooks called from
 * receipt.service and payment-confirmation.service.
 *
 * All hooks here are best-effort: any failure inside is logged but never
 * bubbled up to the calling flow. Callers also wrap the call in
 * `.catch(() => null)` for defence in depth.
 */

import { prisma } from '@/lib/prisma';
import { makePublicToken } from '@/lib/invoice-helpers';
import { waLink, normalizeNigerianPhone } from '@/lib/whatsapp';
import {
  isNegativeRating,
  type FeedbackRating,
  type FeedbackSource,
} from '@/lib/feedback-validators';

type CreateLinkArgs = {
  userId: string;
  customerId?: string | null;
  paymentId?: string | null;
  receiptId?: string | null;
  invoiceId?: string | null;
  source: FeedbackSource;
};

type FeedbackUserPrefs = {
  id: string;
  autoSendFeedback: boolean | null;
  feedbackAfterReceipt: boolean | null;
  feedbackAfterPayment: boolean | null;
  feedbackAfterInvoicePaid: boolean | null;
  feedbackLinkExpiryDays: number | null;
  feedbackMessageTemplate: string | null;
};

async function loadFeedbackPrefs(userId: string): Promise<FeedbackUserPrefs | null> {
  return prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        id: true,
        autoSendFeedback: true,
        feedbackAfterReceipt: true,
        feedbackAfterPayment: true,
        feedbackAfterInvoicePaid: true,
        feedbackLinkExpiryDays: true,
        feedbackMessageTemplate: true,
      },
    })
    .catch(() => null);
}

function expiryFromPrefs(prefs: FeedbackUserPrefs | null): Date | null {
  const days = prefs?.feedbackLinkExpiryDays ?? null;
  if (days === null || days <= 0) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export const feedbackService = {
  /**
   * Mint or fetch a feedback link for the given source document. Idempotent:
   * if a Feedback row already exists for the same source + document id, the
   * existing one is returned untouched.
   */
  async createFeedbackLink(args: CreateLinkArgs) {
    // Check for an existing pending feedback for this source.
    const existing = await prisma.feedback.findFirst({
      where: {
        userId: args.userId,
        source: args.source,
        ...(args.receiptId ? { receiptId: args.receiptId } : {}),
        ...(args.paymentId ? { paymentId: args.paymentId } : {}),
        ...(args.invoiceId ? { invoiceId: args.invoiceId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;

    const prefs = await loadFeedbackPrefs(args.userId);
    const expiresAt = expiryFromPrefs(prefs);

    const created = await prisma.feedback.create({
      data: {
        userId: args.userId,
        customerId: args.customerId ?? null,
        paymentId: args.paymentId ?? null,
        receiptId: args.receiptId ?? null,
        invoiceId: args.invoiceId ?? null,
        rating: 'PENDING',
        source: args.source,
        publicToken: makePublicToken(),
        submittedAt: null,
        expiresAt,
        isNegative: false,
        isResolved: false,
      },
    });
    return created;
  },

  /** Owner-scoped paginated list of feedback rows. */
  async listFeedback(
    userId: string,
    filters: {
      rating?: FeedbackRating;
      isNegative?: boolean;
      isResolved?: boolean;
      customerId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const where: any = { userId };
    if (filters.rating) where.rating = filters.rating;
    if (typeof filters.isNegative === 'boolean') where.isNegative = filters.isNegative;
    if (typeof filters.isResolved === 'boolean') where.isResolved = filters.isResolved;
    if (filters.customerId) where.customerId = filters.customerId;

    // Hide pending (not-yet-submitted) feedback from the main list. They
    // are not user-facing rows yet, just placeholders for outbound links.
    if (filters.rating === undefined && filters.isNegative === undefined) {
      where.submittedAt = { not: null };
    }

    const [total, rows] = await Promise.all([
      prisma.feedback.count({ where }),
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          receipt: { select: { id: true, receiptNumber: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      rows,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Owner-scoped single read. Returns null if not found or not owned. */
  async getFeedback(id: string, userId: string) {
    const fb = await prisma.feedback.findFirst({
      where: { id, userId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        receipt: { select: { id: true, receiptNumber: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        payment: { select: { id: true, amount: true } },
      },
    });
    return fb;
  },

  /** All feedback for a single customer, owner-scoped. */
  async getCustomerFeedback(customerId: string, userId: string) {
    return prisma.feedback.findMany({
      where: { userId, customerId, submittedAt: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        receipt: { select: { id: true, receiptNumber: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });
  },

  /** Aggregate metrics for the dashboard widget + Service Check page. */
  async getFeedbackMetrics(userId: string) {
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const baseWhere = { userId, submittedAt: { not: null } };

    const [total, positive, negative, unresolved, last30Days, recent] = await Promise.all([
      prisma.feedback.count({ where: baseWhere }),
      prisma.feedback.count({
        where: {
          ...baseWhere,
          rating: { in: ['VERY_HAPPY', 'HAPPY'] },
        },
      }),
      prisma.feedback.count({
        where: { ...baseWhere, isNegative: true },
      }),
      prisma.feedback.count({
        where: { ...baseWhere, isNegative: true, isResolved: false },
      }),
      prisma.feedback.count({
        where: { ...baseWhere, submittedAt: { gte: since30 } },
      }),
      prisma.feedback.findMany({
        where: baseWhere,
        orderBy: { submittedAt: 'desc' },
        take: 5,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
    ]);

    const positivePct = total > 0 ? Math.round((positive / total) * 100) : 0;
    const negativePct = total > 0 ? Math.round((negative / total) * 100) : 0;

    return {
      total,
      positive,
      negative,
      unresolved,
      last30Days,
      positivePct,
      negativePct,
      recent,
    };
  },

  /** Mark a negative feedback resolved. Owner-scoped. */
  async resolveFeedback(id: string, userId: string, responseAction?: string | null) {
    const fb = await prisma.feedback.findFirst({ where: { id, userId } });
    if (!fb) return null;
    return prisma.feedback.update({
      where: { id: fb.id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        responseAction: responseAction && responseAction.length > 0 ? responseAction : fb.responseAction,
      },
    });
  },

  /**
   * Build a wa.me link the seller can tap to send the feedback link to the
   * customer. Honours user.feedbackMessageTemplate if set, otherwise falls
   * back to a sensible default. Placeholders: {name}, {url}.
   */
  async whatsappFeedbackLink(args: {
    userId: string;
    phone: string;
    customerName: string;
    publicUrl: string;
  }): Promise<string> {
    const prefs = await loadFeedbackPrefs(args.userId);
    const template =
      prefs?.feedbackMessageTemplate ||
      'Hi {name}, thank you for your business. Please rate your experience: {url}';
    const message = template
      .replace('{name}', args.customerName || 'there')
      .replace('{url}', args.publicUrl);
    return waLink(normalizeNigerianPhone(args.phone), message);
  },

  /**
   * Best-effort: create a feedback link after a receipt is generated.
   * Gated on user.autoSendFeedback && user.feedbackAfterReceipt.
   * Never throws.
   */
  async maybeCreateAfterReceipt(receiptId: string, userId: string) {
    try {
      const prefs = await loadFeedbackPrefs(userId);
      if (!prefs?.autoSendFeedback || !prefs?.feedbackAfterReceipt) return null;

      const receipt = await prisma.receipt.findFirst({
        where: { id: receiptId, userId },
        select: { id: true, customerId: true, paymentId: true },
      });
      if (!receipt) return null;

      return await this.createFeedbackLink({
        userId,
        receiptId: receipt.id,
        paymentId: receipt.paymentId ?? null,
        customerId: receipt.customerId ?? null,
        source: 'RECEIPT',
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[feedback] maybeCreateAfterReceipt failed', e);
      }
      return null;
    }
  },

  /**
   * Best-effort: create a feedback link after a payment is confirmed.
   * Gated on user.autoSendFeedback && user.feedbackAfterPayment.
   * Never throws.
   */
  async maybeCreateAfterPayment(paymentId: string, userId: string) {
    try {
      const prefs = await loadFeedbackPrefs(userId);
      if (!prefs?.autoSendFeedback || !prefs?.feedbackAfterPayment) return null;

      const payment = await prisma.payment.findFirst({
        where: { id: paymentId, userId },
        select: { id: true, customerId: true, invoiceId: true },
      });
      if (!payment) return null;

      return await this.createFeedbackLink({
        userId,
        paymentId: payment.id,
        invoiceId: payment.invoiceId ?? null,
        customerId: payment.customerId || null,
        source: 'PAYMENT',
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[feedback] maybeCreateAfterPayment failed', e);
      }
      return null;
    }
  },

  /**
   * Best-effort: create a feedback link after an invoice flips to PAID.
   * Gated on user.autoSendFeedback && user.feedbackAfterInvoicePaid.
   * Never throws.
   */
  async maybeCreateAfterInvoicePaid(invoiceId: string, userId: string) {
    try {
      const prefs = await loadFeedbackPrefs(userId);
      if (!prefs?.autoSendFeedback || !prefs?.feedbackAfterInvoicePaid) return null;

      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, userId },
        select: { id: true, customerId: true, status: true },
      });
      if (!invoice) return null;
      if (invoice.status !== 'PAID') return null;

      return await this.createFeedbackLink({
        userId,
        invoiceId: invoice.id,
        customerId: invoice.customerId || null,
        source: 'INVOICE',
      });
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[feedback] maybeCreateAfterInvoicePaid failed', e);
      }
      return null;
    }
  },

  /** Helper used by the rating submit flow. */
  setNegativeFlagFromRating(rating: string): boolean {
    return isNegativeRating(rating);
  },
};
