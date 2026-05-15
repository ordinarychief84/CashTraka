import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { productionTemplatesService } from '@/lib/services/production-templates.service';

/**
 * GET /api/cron/run-production-templates
 *
 * Runs every morning at 05:00 UTC. Finds all `active` non-deleted
 * ProductionTemplate rows where `nextRunAt <= now`, spawns a
 * ProductionOrder from each (shortage-check + status flip handled by
 * productionOrdersService.create), and advances each template's
 * `nextRunAt` by its cadence.
 *
 * Individual failures don't block the batch — errors are returned in
 * the JSON response for log inspection.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await productionTemplatesService.runDueTemplates();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
