/**
 * Public-facing slice of the Service Check feature.
 *
 * Used by the unauthenticated /feedback/[token] page and the
 * /api/public/feedback/[token] route. Returns ONLY safe fields. Never
 * exposes internal IDs of unrelated rows, never the seller's user id.
 */

import { prisma } from '@/lib/prisma';
import {
  isNegativeRating,
  type FeedbackRating,
  type FeedbackReason,
} from '@/lib/feedback-validators';

export type PublicFeedbackView = {
  business: string;
  logoUrl: string | null;
  customerFirstName: string | null;
  reference: string | null;
  alreadySubmitted: boolean;
  expired: boolean;
  rating: FeedbackRating | null;
  reason: FeedbackReason | null;
  comment: string | null;
};

export const feedbackPublicService = {
  /**
   * Read a feedback link by token. Returns the safe fields needed to render
   * the public page. Returns null when the token does not exist.
   */
  async getPublicFeedback(token: string): Promise<PublicFeedbackView | null> {
    const fb = await prisma.feedback.findUnique({
      where: { publicToken: token },
      include: {
        user: {
          select: {
            name: true,
            businessName: true,
            logoUrl: true,
          },
        },
        customer: { select: { name: true } },
        receipt: { select: { receiptNumber: true } },
        invoice: { select: { invoiceNumber: true } },
      },
    });
    if (!fb) return null;

    const business = fb.user.businessName || fb.user.name || 'Business';
    const fullName = fb.customer?.name ?? null;
    const customerFirstName = fullName
      ? fullName.split(/\s+/)[0] || null
      : null;
    const reference =
      fb.receipt?.receiptNumber ?? fb.invoice?.invoiceNumber ?? null;
    const expired = !!(fb.expiresAt && fb.expiresAt.getTime() < Date.now());
    const alreadySubmitted = fb.submittedAt !== null;

    return {
      business,
      logoUrl: fb.user.logoUrl ?? null,
      customerFirstName,
      reference,
      alreadySubmitted,
      expired,
      rating: alreadySubmitted ? (fb.rating as FeedbackRating) : null,
      reason: alreadySubmitted ? (fb.reason as FeedbackReason | null) : null,
      comment: alreadySubmitted ? fb.comment : null,
    };
  },

  /**
   * Persist a customer's submission. Returns:
   *   - { ok: true } on success
   *   - { ok: false, error } when the token is invalid, expired, or already used
   */
  async submitPublicFeedback(
    token: string,
    body: { rating: FeedbackRating; reason?: FeedbackReason; comment?: string },
  ): Promise<{ ok: true } | { ok: false; error: string; code: number }> {
    const fb = await prisma.feedback.findUnique({
      where: { publicToken: token },
    });
    if (!fb) return { ok: false, error: 'Link not found.', code: 404 };
    if (fb.submittedAt) {
      return {
        ok: false,
        error: 'This feedback has already been submitted.',
        code: 409,
      };
    }
    if (fb.expiresAt && fb.expiresAt.getTime() < Date.now()) {
      return { ok: false, error: 'This link has expired.', code: 410 };
    }

    const negative = isNegativeRating(body.rating);
    const trimmedComment = body.comment?.trim() ?? '';

    await prisma.feedback.update({
      where: { id: fb.id },
      data: {
        rating: body.rating,
        reason: body.reason ?? null,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
        submittedAt: new Date(),
        isNegative: negative,
      },
    });
    return { ok: true };
  },
};
