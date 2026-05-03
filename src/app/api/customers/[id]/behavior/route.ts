import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { behaviorService } from '@/lib/services/behavior.service';
import { requireFeature } from '@/lib/gate';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/customers/[id]/behavior, get customer behavior profile */
export async function GET(req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await requireFeature(user, 'behaviorTracking');
    if (blocked) return blocked;

    const { id } = await ctx.params;
    const profile = await behaviorService.profile(id, user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error('GET /api/customers/[id]/behavior error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

/** POST /api/customers/[id]/behavior, recompute behavior tag */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = await requireFeature(user, 'behaviorTracking');
    if (blocked) return blocked;

    const { id } = await ctx.params;
    const result = await behaviorService.recomputeOne(id);
    if (!result) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/customers/[id]/behavior error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
