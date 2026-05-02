import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { effectivePlan, limitsFor } from '@/lib/plan-limits';

export const runtime = 'nodejs';

/**
 * GET /api/me/limits → returns the resolved plan + limits for the
 * currently-logged-in user. Settings UI uses this to disable controls
 * for features the user's plan does not include.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eff = effectivePlan(user);
  const limits = limitsFor(eff.plan);

  return NextResponse.json({
    success: true,
    data: {
      plan: eff.plan,
      status: eff.status,
      expired: eff.expired,
      limits,
    },
  });
}
