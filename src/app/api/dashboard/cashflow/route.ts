import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { getCashflowForecast } from '@/lib/services/cashflow.service';

export const runtime = 'nodejs';

/**
 * GET /api/dashboard/cashflow
 *
 * Owner-scoped 30-day cash flow forecast. See cashflow.service.ts for the
 * exact formulas. Returns naira-integer amounts plus an `asOf` stamp so
 * callers can show the freshness of the snapshot.
 */
export async function GET() {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const forecast = await getCashflowForecast(user.id);
    return ok(forecast);
  });
}
