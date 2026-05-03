import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { monoBankService } from '@/lib/services/mono-bank.service';

export const runtime = 'nodejs';

/**
 * DELETE /api/banks/[id]
 *
 * Disconnect a linked bank account. Flips status to DISCONNECTED locally
 * and best-effort revokes upstream. Existing transactions stay so the
 * audit trail remains complete.
 */
export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const r = await monoBankService.disconnectAccount(ctx.params.id, user.id);
    if (!r.ok) return fail(r.error ?? 'Could not disconnect', 404);
    return ok({ disconnected: true });
  });
}
