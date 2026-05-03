import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, getCurrentUser } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { vatReturnService } from '@/lib/services/vat-return.service';
import { accessAuditService } from '@/lib/services/access-audit.service';

export const runtime = 'nodejs';

/**
 * GET   /api/vat-returns/[id] → owner-scoped fetch with contributing rows.
 * PATCH /api/vat-returns/[id] → action: 'mark-filed' (locks the return).
 */
export async function GET(
  _req: Request,
  ctx: { params: { id: string } },
) {
  return handled(async () => {
    const auth = await getAuthContext();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.owner;

    const feature = await requireFeature(user, 'vatReturns');
    if (feature) return feature;

    const result = await vatReturnService.getVatReturn(ctx.params.id, user.id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Tax+ access audit: record any read by a non-owner principal so the
    // seller has a verifiable trail. Best-effort, never blocks the read.
    if (!auth.isOwner) {
      try {
        await accessAuditService.recordRead({
          actorId: auth.principalId,
          userId: user.id,
          entityType: 'VAT_RETURN',
          entityId: ctx.params.id,
          action: 'READ_VAT_RETURN',
          metadata: { role: auth.accessRole },
        });
      } catch {}
    }

    return ok(result);
  });
}

const patchSchema = z.object({
  action: z.literal('mark-filed'),
  firsReference: z.string().trim().max(120).optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } },
) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'vatReturns');
    if (feature) return feature;

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const updated = await vatReturnService.markFiled(
      ctx.params.id,
      user.id,
      parsed.data.firsReference,
    );
    return ok(updated);
  });
}
