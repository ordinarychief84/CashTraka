import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { monoBankService } from '@/lib/services/mono-bank.service';

export const runtime = 'nodejs';

/**
 * POST /api/banks/[id]/sync
 *
 * Trigger a fresh transaction pull for the linked account. Returns the
 * count of transactions ingested. Failures persist the error on the
 * account row so the UI can surface it.
 */
export async function POST(_req: Request, ctx: { params: { id: string } }) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const r = await monoBankService.syncAccount(ctx.params.id, user.id);
    if (!r.ok) {
      const errorMsg = 'error' in r ? r.error : undefined;
      return fail(errorMsg ?? 'Sync failed', 400);
    }
    return ok({ count: 'count' in r ? r.count : 0 });
  });
}
