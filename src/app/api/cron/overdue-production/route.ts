import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { documentAudit } from '@/lib/services/document-audit.service';

/**
 * GET /api/cron/overdue-production
 *
 * Runs daily at 09:00 UTC. Finds production orders whose plannedEndAt
 * is in the past AND status is still in {PLANNED, MATERIALS_NEEDED,
 * IN_PRODUCTION}. Each such order:
 *   1. Has its status flipped to DELAYED.
 *   2. Gets an audit-log row (action=DELAYED, reason=overdue).
 *   3. The owner gets a single Notification (type=PRODUCTION_DELAYED)
 *      per UTC day, summarising how many orders are now overdue.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  try {
    const overdue = await prisma.productionOrder.findMany({
      where: {
        deletedAt: null,
        plannedEndAt: { not: null, lt: now },
        status: { in: ['PLANNED', 'MATERIALS_NEEDED', 'IN_PRODUCTION'] },
      },
      select: { id: true, userId: true, productionNumber: true },
    });

    if (overdue.length === 0) {
      return NextResponse.json({
        success: true,
        data: { delayedCount: 0, notificationsCreated: 0 },
      });
    }

    let delayedCount = 0;
    const overdueByUser = new Map<string, string[]>();
    for (const o of overdue) {
      await prisma.productionOrder.update({
        where: { id: o.id },
        data: { status: 'DELAYED' },
      });
      await documentAudit.log({
        userId: o.userId,
        entityType: 'PRODUCTION_ORDER',
        entityId: o.id,
        action: 'DELAYED',
        metadata: { reason: 'overdue', detectedAt: now.toISOString() },
      });
      delayedCount++;
      const existing = overdueByUser.get(o.userId) ?? [];
      existing.push(o.productionNumber);
      overdueByUser.set(o.userId, existing);
    }

    let notificationsCreated = 0;
    for (const [userId, productionNumbers] of overdueByUser.entries()) {
      const already = await prisma.notification.findFirst({
        where: { userId, type: 'PRODUCTION_DELAYED', createdAt: { gte: startOfDay } },
        select: { id: true },
      });
      if (already) continue;
      const preview = productionNumbers.slice(0, 3).join(', ');
      await prisma.notification.create({
        data: {
          userId,
          type: 'PRODUCTION_DELAYED',
          title: `${productionNumbers.length} production order${productionNumbers.length === 1 ? '' : 's'} overdue`,
          message:
            preview + (productionNumbers.length > 3 ? `, and ${productionNumbers.length - 3} more` : ''),
          link: '/production?status=DELAYED',
        },
      });
      notificationsCreated++;
    }

    return NextResponse.json({
      success: true,
      data: { delayedCount, notificationsCreated },
    });
  } catch (e: any) {
    console.error('CRON_OVERDUE_PRODUCTION_ERROR:', e?.message ?? e);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
