import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { monoBankService } from '@/lib/services/mono-bank.service';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['UNMATCHED', 'MATCHED', 'IGNORED']);

/**
 * GET /api/banks/transactions?matchStatus=&limit=
 *
 * Owner-scoped list of bank transactions across all linked accounts.
 */
export async function GET(req: Request) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const url = new URL(req.url);
    const rawStatus = url.searchParams.get('matchStatus');
    const matchStatus =
      rawStatus && ALLOWED_STATUSES.has(rawStatus) ? rawStatus : undefined;
    const rawLimit = url.searchParams.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : NaN;
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 500
        ? parsedLimit
        : 100;

    const rows = await monoBankService.listTransactions(user.id, {
      matchStatus,
      limit,
    });
    return ok(rows);
  });
}
