import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { autoPoService } from '@/lib/services/auto-po.service';
import { emailService } from '@/lib/services/email.service';
import { hasFeature } from '@/lib/gate';
import { waLink, normalizeNigerianPhone } from '@/lib/whatsapp';

/**
 * GET /api/cron/auto-po-draft
 *
 * Daily at 08:00 UTC (after the 07:15 low-stock-check cron). For every
 * active non-suspended user on a paid plan with the `autoPurchaseOrders`
 * capability, drafts purchase orders from low-stock materials and
 * emails a digest with a WhatsApp share button.
 *
 * Per-user idempotency: a Notification row of type `AUTO_PO_DRAFTED` is
 * written on success and the same-day cron re-run is a no-op.
 *
 * Never auto-sends a PO — every draft sits in DRAFT for owner review.
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
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        businessType: true,
        whatsappNumber: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
      },
    });

    let scanned = 0;
    let totalDrafts = 0;
    let totalMaterials = 0;
    let skippedNoFeature = 0;
    let skippedIdempotent = 0;
    let skippedNoEmail = 0;
    let skippedNothingToDraft = 0;

    for (const user of users) {
      scanned++;      if (!hasFeature(user, 'autoPurchaseOrders')) {
        skippedNoFeature++;
        continue;
      }

      // Idempotency: skip if today's batch already ran for this user.
      const already = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: 'AUTO_PO_DRAFTED',
          createdAt: { gte: startOfDay },
        },
        select: { id: true },
      });
      if (already) {
        skippedIdempotent++;
        continue;
      }

      const summary = await autoPoService.runForUser(user.id);
      if (summary.draftsCreated === 0) {
        skippedNothingToDraft++;
        continue;
      }

      totalDrafts += summary.draftsCreated;
      totalMaterials += summary.materialsCovered;

      // Mark the day done even if email is unconfigured, so a partial
      // send-fail doesn't double-spend tomorrow.
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'AUTO_PO_DRAFTED',
          title: `${summary.draftsCreated} PO${summary.draftsCreated === 1 ? '' : 's'} drafted`,
          message: summary.pos
            .map((p) => `${p.poNumber} → ${p.supplierName}`)
            .join(', '),
        },
      });

      if (!user.email) {
        skippedNoEmail++;
        continue;
      }

      const recapText = autoPoService.toWhatsAppText(user.businessName, summary);
      const whatsappShareUrl = user.whatsappNumber
        ? waLink(normalizeNigerianPhone(user.whatsappNumber), recapText)
        : `https://wa.me/?text=${encodeURIComponent(recapText)}`;

      await emailService.sendAutoPoDigest({
        to: user.email,
        name: user.name,
        businessName: user.businessName,
        draftsCreated: summary.draftsCreated,
        materialsCovered: summary.materialsCovered,
        skippedNoSupplier: summary.skippedNoSupplier,
        pos: summary.pos,
        whatsappShareUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      scanned,
      totalDrafts,
      totalMaterials,
      skipped: {
        noFeature: skippedNoFeature,
        idempotent: skippedIdempotent,
        nothingToDraft: skippedNothingToDraft,
        noEmail: skippedNoEmail,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
