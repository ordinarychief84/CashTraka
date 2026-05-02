import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { computeDailyPulse } from '@/lib/services/daily-pulse.service';

/** GET /api/daily-pulse, on-demand daily summary for dashboard */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pulse = await computeDailyPulse(user.id);
  return NextResponse.json(pulse);
}
