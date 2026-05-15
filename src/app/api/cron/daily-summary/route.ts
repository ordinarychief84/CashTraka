import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';
import { dailySummaryService } from '@/lib/services/daily-summary.service';
import { emailService } from '@/lib/services/email.service';
import { hasFeature } from '@/lib/gate';
import { waLink, normalizeNigerianPhone } from '@/lib/whatsapp';

/**
 * GET /api/cron/daily-summary
 *
 * Runs once per day (scheduled at 18:00 UTC = 19:00 WAT = 7pm Lagos).
 * For each active user on a paid plan with the `dailySummary` capability
 * (Pro and above), composes an end-of-day operational recap and emails
 * it via Resend with a tappable "Share on WhatsApp" deep-link the owner
 * can forward to their team in one tap.
 *
 * Idempotent per UTC day via a Notification row keyed by
 * (userId, type='DAILY_SUMMARY', today). Re-runs no-op.
 *
 * Free users do NOT receive this email — the dashboard surfaces the
 * same metrics in-app, but the daily push is a paid-tier hook.
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
    let sent = 0;
    let skippedNoFeature = 0;
    let skippedIdempotent = 0;
    let skippedNoEmail = 0;

    for (const user of users) {
      scanned++;
      // Property managers don't run small-batch ops — skip.
      if (user.businessType === 'property_manager') continue;
      // Feature-gated to paid plans.
      if (!hasFeature(user, 'dailySummary')) {
        skippedNoFeature++;
        continue;
      }
      if (!user.email) {
        skippedNoEmail++;
        continue;
      }

      // Idempotency: skip if a DAILY_SUMMARY notification already exists
      // for this user since midnight UTC.
      const existing = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: 'DAILY_SUMMARY',
          createdAt: { gte: startOfDay },
        },
        select: { id: true },
      });
      if (existing) {
        skippedIdempotent++;
        continue;
      }

      const summary = await dailySummaryService.build(user.id);
      const recapText = dailySummaryService.toWhatsAppText(
        user.name,
        user.businessName,
        summary,
      );

      // WhatsApp share URL: pre-fills the recap text. We point to the
      // owner's own number when available so tapping the email button
      // opens their own WhatsApp with the recap ready to forward. If no
      // number is on file, fall back to wa.me/?text=... which lets WA
      // pick the destination.
      const whatsappShareUrl = user.whatsappNumber
        ? waLink(normalizeNigerianPhone(user.whatsappNumber), recapText)
        : `https://wa.me/?text=${encodeURIComponent(recapText)}`;

      const result = await emailService.sendDailySummary({
        to: user.email,
        name: user.name,
        businessName: user.businessName,
        ordersReceived: summary.ordersReceived,
        productionCompleted: summary.productionCompleted,
        productionInProgress: summary.productionInProgress,
        cashReceivedKobo: summary.cashReceivedKobo,
        outstandingKobo: summary.outstandingKobo,
        lowMaterials: summary.lowMaterials,
        lowMaterialsCount: summary.lowMaterialsCount,
        topDebtors: summary.topDebtors,
        whatsappShareUrl,
      });

      if (result.ok) {
        sent++;
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'DAILY_SUMMARY',
            title: 'Daily summary sent',
            message: `${summary.ordersReceived} orders · ${summary.productionCompleted} production complete · ₦${Math.round(summary.cashReceivedKobo / 100).toLocaleString('en-NG')} received`,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      scanned,
      sent,
      skipped: { noFeature: skippedNoFeature, idempotent: skippedIdempotent, noEmail: skippedNoEmail },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
