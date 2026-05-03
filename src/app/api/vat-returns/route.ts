import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok, validationFail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { vatReturnService, type VatPeriod } from '@/lib/services/vat-return.service';

export const runtime = 'nodejs';

/**
 * GET  /api/vat-returns → owner-scoped list, gated on `vatReturns`.
 * POST /api/vat-returns → generate (or refresh) the return for the period
 *                        containing the given reference date.
 */
export async function GET() {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'vatReturns');
    if (feature) return feature;

    const rows = await vatReturnService.listVatReturns(user.id);
    return ok(rows);
  });
}

const postSchema = z.object({
  period: z.enum(['MONTHLY', 'QUARTERLY']),
  /** ISO date. Defaults to "now" when missing. */
  referenceDate: z.string().optional(),
});

export async function POST(req: Request) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'vatReturns');
    if (feature) return feature;

    const body = await req.json().catch(() => ({}));
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) return validationFail(parsed.error);

    const refDate = parsed.data.referenceDate
      ? new Date(parsed.data.referenceDate)
      : new Date();
    if (Number.isNaN(refDate.getTime())) {
      return NextResponse.json({ error: 'Invalid referenceDate' }, { status: 422 });
    }

    const row = await vatReturnService.generateVatReturn(
      user.id,
      parsed.data.period as VatPeriod,
      refDate,
    );
    return ok(row, 201);
  });
}
