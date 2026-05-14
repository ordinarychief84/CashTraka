import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { subscriptionsService } from '@/lib/services/subscriptions.service';

/**
 * GET /api/cron/run-subscriptions
 *
 * Runs daily. Materialises a fresh CustomerOrder for every active
 * subscription whose `nextRunAt <= now`, advances `nextRunAt` by the
 * cadence, and auto-cancels subscriptions that have passed `endsAt`.
 *
 * Idempotent at the day level: re-running won't double-spawn because
 * each successful run pushes `nextRunAt` forward; the next compare
 * would find the subscription already-not-due.
 *
 * 60-second function timeout to give Vercel headroom for tenants with
 * hundreds of subscriptions.
 */
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await subscriptionsService.runDueSubscriptions();
  return NextResponse.json({
    ok: true,
    processed: result.processed,
    spawned: result.spawned,
    errorCount: result.errors.length,
    errors: result.errors.slice(0, 10),
  });
}
