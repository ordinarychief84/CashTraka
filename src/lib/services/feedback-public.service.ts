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
import { emailService } from '@/lib/services/email.service';
import { displayPhone, waLink } from '@/lib/whatsapp';

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

    // Negative feedback is the whole point of the feature: catch the
    // unhappy customer before they go quiet. Fire an in-app
    // Notification + email to the seller, both best-effort so the
    // public submit still returns 200 if either fails.
    if (negative) {
      // Type narrowed by isNegativeRating: rating is UNHAPPY | VERY_UNHAPPY here.
      const negRating = body.rating as 'UNHAPPY' | 'VERY_UNHAPPY';
      void notifyNegativeFeedback({
        feedbackId: fb.id,
        userId: fb.userId,
        customerId: fb.customerId,
        rating: negRating,
        reason: body.reason ?? null,
        comment: trimmedComment.length > 0 ? trimmedComment : null,
      }).catch(() => null);
    }

    return { ok: true };
  },
};

/**
 * Best-effort negative-feedback alerting. Writes a Notification row,
 * sends an email if the seller has one on file, and includes a
 * pre-built WhatsApp deep-link reply when the customer's phone is
 * known.
 */
async function notifyNegativeFeedback(args: {
  feedbackId: string;
  userId: string;
  customerId: string | null;
  rating: 'UNHAPPY' | 'VERY_UNHAPPY';
  reason: string | null;
  comment: string | null;
}): Promise<void> {
  const seller = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { id: true, name: true, businessName: true, email: true },
  });
  if (!seller) return;

  // Resolve customer name + phone (cheapest path: from the linked
  // Customer row; fall back to the Feedback's denormalised data only
  // if Customer is missing).
  let customerName = 'A customer';
  let customerPhone: string | null = null;
  if (args.customerId) {
    const c = await prisma.customer.findUnique({
      where: { id: args.customerId },
      select: { name: true, phone: true },
    });
    if (c) {
      customerName = c.name || customerName;
      customerPhone = c.phone || null;
    }
  }

  const baseUrl = process.env.APP_URL || 'https://cashtraka.co';
  const serviceCheckUrl = `${baseUrl}/service-check`;
  const ratingLabel =
    args.rating === 'VERY_UNHAPPY' ? 'Very Unhappy' : 'Unhappy';
  const business = seller.businessName?.trim() || seller.name?.trim() || 'us';

  // Compose a follow-up message for WhatsApp the seller can send in
  // one tap. Apologetic but not grovelling, ends with an open invite.
  const followUpMsg =
    `Hi ${customerName}, this is ${business}. ` +
    `I just saw your Service Check rating and I am sorry the experience ` +
    `was not what it should have been. Could you share what went wrong ` +
    `so I can make it right?`;
  const replyWaLink = customerPhone ? waLink(customerPhone, followUpMsg) : null;

  // 1. In-app Notification row.
  await prisma.notification
    .create({
      data: {
        userId: seller.id,
        type: 'warning',
        title: `${customerName} is ${ratingLabel}`,
        message: args.reason
          ? `Reason: ${args.reason
              .toLowerCase()
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')}. Follow up today.`
          : 'Follow up today before they go quiet.',
        link: '/service-check',
      },
    })
    .catch(() => null);

  // 2. Email alert (only if we have an address).
  if (seller.email) {
    await emailService
      .sendNegativeFeedbackAlert({
        to: seller.email,
        sellerName: seller.name || business,
        customerName,
        rating: args.rating,
        reason: args.reason,
        comment: args.comment,
        customerPhoneDisplay: customerPhone ? displayPhone(customerPhone) : null,
        waLink: replyWaLink,
        serviceCheckUrl,
      })
      .catch(() => null);
  }
}
