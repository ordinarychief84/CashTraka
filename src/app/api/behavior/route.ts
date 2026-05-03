import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { behaviorService } from '@/lib/services/behavior.service';
import { requireFeature } from '@/lib/gate';

/** GET /api/behavior, get behavior breakdown for all of user's customers */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await requireFeature(user, 'behaviorTracking');
    if (blocked) return blocked;

    const breakdown = await behaviorService.breakdown(user.id);
    return NextResponse.json(breakdown);
  } catch (err) {
    console.error('GET /api/behavior error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
