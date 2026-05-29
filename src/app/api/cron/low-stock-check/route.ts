import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { inventoryService } from '@/lib/services/inventory.service';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

/**
 * GET /api/cron/low-stock-check
 *
 * Runs daily at 07:00 UTC. For each active user with at least one
 * material or product at/below reorder level, posts a single
 * Notification (type=LOW_STOCK) — idempotent per UTC day.
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
    for (const user of users) {
      // Property managers don't run small-batch ops.      scanned++;

      const [materials, products] = await Promise.all([
        inventoryService.computeLowStockMaterials(user.id),
        inventoryService.computeLowStockProducts(user.id),
      ]);

      const total = materials.length + products.length;
      if (total === 0) continue;

      // Idempotency: skip if a LOW_STOCK notification already exists for
      // this user since midnight UTC.
      const existing = await prisma.notification.findFirst({
        where: { userId: user.id, type: 'LOW_STOCK', createdAt: { gte: startOfDay } },
        select: { id: true },
      });
      if (existing) continue;

      const previewNames = [
        ...materials.slice(0, 3).map((m) => m.name),
        ...products.slice(0, 3).map((p) => p.name),
      ].slice(0, 3);

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'LOW_STOCK',
          title: `${total} item${total === 1 ? '' : 's'} running low`,
          message:
            previewNames.join(', ') + (total > previewNames.length ? ', and others' : ''),
          link: materials.length > 0 ? '/materials?lowStock=1' : '/inventory',
        },
      });
      notificationsCreated++;
    }

    return NextResponse.json({
      success: true,
      data: { scanned, notificationsCreated },
    });
  } catch (e: any) {
    console.error('CRON_LOW_STOCK_CHECK_ERROR:', e?.message ?? e);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
