import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { collectionScoreService } from '@/lib/services/collection-score.service';
import { requireFeature } from '@/lib/gate';

/** GET /api/collection-score — get latest collection score */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = requireFeature(user, 'collectionScore');
    if (blocked) return blocked;

    let score = await collectionScoreService.getLatest(user.id);
    if (!score) {
      // First time — compute it now
      score = await collectionScoreService.compute(user.id);
    }

    return NextResponse.json(score);
  } catch (err) {
    console.error('GET /api/collection-score error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

/** GET /api/collection-score/history — score trend data for charts */
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const blocked = requireFeature(user, 'collectionScore');
    if (blocked) return blocked;

    // Force recompute
    const score = await collectionScoreService.compute(user.id);
    return NextResponse.json(score);
  } catch (err) {
    console.error('POST /api/collection-score error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
