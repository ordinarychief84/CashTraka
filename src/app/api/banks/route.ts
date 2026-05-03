import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { monoBankService } from '@/lib/services/mono-bank.service';

export const runtime = 'nodejs';

/**
 * GET /api/banks
 *
 * List the seller's currently active linked bank accounts.
 */
export async function GET() {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const rows = await monoBankService.listLinkedAccounts(user.id);
    return ok(rows);
  });
}
