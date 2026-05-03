import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { feedbackSettingsSchema } from '@/lib/feedback-validators';

export const runtime = 'nodejs';

/**
 * GET + PATCH for the Service Check settings tab. Mirrors the shape of
 * /api/settings/invoice. Settings live on the User row.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    data: {
      autoSendFeedback: user.autoSendFeedback ?? false,
      feedbackAfterReceipt: user.feedbackAfterReceipt ?? true,
      feedbackAfterPayment: user.feedbackAfterPayment ?? true,
      feedbackAfterInvoicePaid: user.feedbackAfterInvoicePaid ?? true,
      feedbackLinkExpiryDays: user.feedbackLinkExpiryDays ?? 14,
      feedbackMessageTemplate: user.feedbackMessageTemplate ?? '',
    },
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = feedbackSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      autoSendFeedback: parsed.data.autoSendFeedback ?? undefined,
      feedbackAfterReceipt: parsed.data.feedbackAfterReceipt ?? undefined,
      feedbackAfterPayment: parsed.data.feedbackAfterPayment ?? undefined,
      feedbackAfterInvoicePaid: parsed.data.feedbackAfterInvoicePaid ?? undefined,
      feedbackLinkExpiryDays:
        parsed.data.feedbackLinkExpiryDays === undefined
          ? undefined
          : parsed.data.feedbackLinkExpiryDays,
      feedbackMessageTemplate:
        parsed.data.feedbackMessageTemplate === undefined
          ? undefined
          : parsed.data.feedbackMessageTemplate || null,
    },
    select: {
      autoSendFeedback: true,
      feedbackAfterReceipt: true,
      feedbackAfterPayment: true,
      feedbackAfterInvoicePaid: true,
      feedbackLinkExpiryDays: true,
      feedbackMessageTemplate: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
