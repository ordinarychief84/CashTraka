import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { handled, ok } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';
import { monoBankService } from '@/lib/services/mono-bank.service';

export const runtime = 'nodejs';

/**
 * POST /api/banks/connect
 *
 * Returns the Mono Connect widget config the client needs to launch the
 * linking flow. Tax+ tier (`bankSync` flag).
 */
export async function POST() {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const feature = await requireFeature(user, 'bankSync');
    if (feature) return feature;

    const result = await monoBankService.getLinkConfig(user.id);
    return ok(result);
  });
}
