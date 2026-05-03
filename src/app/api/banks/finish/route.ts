import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, fail, validationFail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { monoBankService } from '@/lib/services/mono-bank.service';

export const runtime = 'nodejs';

const schema = z.object({
  code: z.string().trim().min(1, 'code is required'),
});

/**
 * POST /api/banks/finish
 *
 * Body: { code }
 * Exchanges a Mono Connect code for an account, persists the link.
 */
export async function POST(req: Request) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const r = await monoBankService.finishLink({
      userId: user.id,
      code: parsed.data.code,
    });
    if (!r.ok) return fail(r.error ?? 'Could not link account', 400);
    return ok(r.account, 201);
  });
}
