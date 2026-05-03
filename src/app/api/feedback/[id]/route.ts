import { NextResponse } from 'next/server';
import { getAuthContext, getCurrentUser } from '@/lib/auth';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { feedbackService } from '@/lib/services/feedback.service';
import { feedbackResolveSchema } from '@/lib/feedback-validators';
import { accessAuditService } from '@/lib/services/access-audit.service';

export const runtime = 'nodejs';

/**
 * GET /api/feedback/[id]. Owner-scoped single read.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.owner;

    const fb = await feedbackService.getFeedback(params.id, user.id);
    if (!fb) return fail('Feedback not found', 404);

    // Tax+ access audit: log non-owner reads of customer feedback (PII).
    if (!auth.isOwner) {
      try {
        await accessAuditService.recordRead({
          actorId: auth.principalId,
          userId: user.id,
          entityType: 'FEEDBACK',
          entityId: params.id,
          action: 'READ_FEEDBACK',
          metadata: { role: auth.accessRole },
        });
      } catch {}
    }

    return ok(fb);
  });
}

/**
 * PATCH /api/feedback/[id]. Mark a piece of feedback resolved with an
 * optional response action note. Mutation gated on the serviceCheck feature.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await requireFeature(user, 'serviceCheck');
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({}));
    const parsed = feedbackResolveSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const responseAction = parsed.data.responseAction || null;
    const updated = await feedbackService.resolveFeedback(
      params.id,
      user.id,
      responseAction,
    );
    if (!updated) return fail('Feedback not found', 404);
    return ok(updated);
  });
}
