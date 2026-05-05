import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
// Don't let Vercel's edge cache hide an outage from a synthetic monitor.
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — synthetic-monitor target.
 *
 * Returns 200 when the app process is up AND the database connection pool
 * can answer a trivial query. Returns 503 on any failure so an external
 * uptime probe (BetterStack, UptimeRobot, Pingdom, status page provider)
 * has a reliable signal to alert on.
 *
 * The body is intentionally tiny — no business data, no PII, no env-var
 * disclosure. This endpoint is unauthenticated by design.
 */
export async function GET() {
  const start = Date.now();
  try {
    // Cheapest possible DB ping — no table scan, no connection-pool stall
    // beyond the round trip itself. If this fails, Neon is down or the
    // pool is exhausted; both are reasons to alert.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, db: 'up', latencyMs: Date.now() - start },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: 'down',
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
