import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, fail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { virtualAccountService } from '@/lib/services/virtual-account.service';

export const runtime = 'nodejs';

/**
 * POST /api/invoices/[id]/virtual-account
 *
 * Idempotent: returns the existing VA for this invoice if one exists,
 * otherwise mints a new one via the partner adapter. Tax+ tier (gated
 * on `bankSync` for v1, since the partner integration ships in the
 * same Phase 2 of the Tax+ roadmap as Mono).
 */
export async function POST(_req: Request, ctx: { params: { id: string } }) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const r = await virtualAccountService.ensureForInvoice(ctx.params.id, user.id);
    if (!r.ok) return fail(r.error ?? 'Could not mint virtual account', 400);
    return ok(
      { account: r.account, alreadyExisted: 'alreadyExisted' in r ? r.alreadyExisted : false },
      r.alreadyExisted ? 200 : 201,
    );
  });
}
