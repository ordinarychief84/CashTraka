import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { behaviorService } from '@/lib/services/behavior.service';
import { collectionScoreService } from '@/lib/services/collection-score.service';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

/**
 * Daily scoring cron, recomputes behavior tags and collection scores
 * for all active users. Runs once daily (e.g. 2 AM WAT).
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active users (logged in within last 90 days)
    const cutoff = new Date(Date.now() - 90 * 86400000);
    const activeUsers = await prisma.user.findMany({
      where: {
        isSuspended: false,
        lastLoginAt: { gte: cutoff },
      },
      select: { id: true, plan: true },
    });

    const stats = { users: 0, behaviorsUpdated: 0, scoresComputed: 0 };

    for (const user of activeUsers) {
      stats.users++;

      // Recompute behavior tags for all customers
      const updated = await behaviorService.recomputeAll(user.id);
      stats.behaviorsUpdated += updated;

      // Compute collection score (only for paid plans or users with enough data)
      try {
        await collectionScoreService.compute(user.id);
        stats.scoresComputed++;
      } catch {
        // Non-critical — skip if computation fails
      }
    }

    return NextResponse.json(stats);
  } catch (err) {
    console.error('compute-scores cron error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
