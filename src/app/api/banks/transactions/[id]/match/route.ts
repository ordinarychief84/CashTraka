import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { monoBankService } from '@/lib/services/mono-bank.service';

export const runtime = 'nodejs';

const schema = z.object({
  invoiceId: z.string().trim().min(1, 'invoiceId is required'),
});

/**
 * POST /api/banks/transactions/[id]/match
 *
 * Body: { invoiceId }
 * Mark a bank transaction as matched to an invoice. Both rows must be
 * owned by the caller.
 */
export async function POST(req: Request, ctx: { params: { id: string } }) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const r = await monoBankService.matchToInvoice(
      ctx.params.id,
      parsed.data.invoiceId,
      user.id,
    );
    if (!r.ok) return fail(r.error ?? 'Could not match', 404);
    return ok({ matched: true });
  });
}
