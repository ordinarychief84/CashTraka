import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

/**
 * GET /api/cron/expiring-materials
 *
 * Runs daily at 07:30 UTC. For each active user with at least one
 * raw material whose expiresAt is within 14 days, posts a single
 * Notification (type=EXPIRING_MATERIAL) — idempotent per UTC day.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, isSuspended: false },
      select: { id: true, businessType: true },
    });

    let notificationsCreated = 0;
    let scanned = 0;
    for (const user of users) {      scanned++;

      const expiring = await inventoryService.computeExpiringMaterials(user.id, 14);
      if (expiring.length === 0) continue;

      const existing = await prisma.notification.findFirst({
        where: { userId: user.id, type: 'EXPIRING_MATERIAL', createdAt: { gte: startOfDay } },
        select: { id: true },
      });
      if (existing) continue;

      const previewNames = expiring.slice(0, 3).map((m) => m.name);
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'EXPIRING_MATERIAL',
          title: `${expiring.length} material${expiring.length === 1 ? '' : 's'} expiring soon`,
          message:
            previewNames.join(', ') + (expiring.length > previewNames.length ? ', and others' : ''),
          link: '/inventory',
        },
      });
      notificationsCreated++;
    }

    return NextResponse.json({
      success: true,
      data: { scanned, notificationsCreated },
    });
  } catch (e: any) {
    console.error('CRON_EXPIRING_MATERIALS_ERROR:', e?.message ?? e);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
