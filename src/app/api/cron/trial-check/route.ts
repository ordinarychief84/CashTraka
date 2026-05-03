import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

/**
 * Trial lifecycle cron, runs daily at 8 AM WAT (07:00 UTC).
 * 1. Sends "trial ending soon" email 3 days before expiry.
 * 2. Sends "trial expired" + downgrades expired trials to free.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const stats = { endingSoonSent: 0, expiredSent: 0, downgraded: 0 };

  // 1. Trial ending soon — trial ends within 3 days, still trialing
  const endingSoon = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'trialing',
      trialEndsAt: { lte: threeDaysFromNow, gt: now },
      isSuspended: false,
    },
    select: { id: true, email: true, name: true, plan: true, trialEndsAt: true },
  });

  for (const user of endingSoon) {
    const daysLeft = Math.ceil(
      (user.trialEndsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    try {
      await emailService.sendTrialEndingSoon({
        to: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt!,
        daysLeft,
      });
      stats.endingSoonSent++;
    } catch (err) {
      // non-critical — the user can still see their trial countdown in-app
      console.warn(
        `[cron.trial-check] trial-ending-soon email failed for user ${user.id}`,
        err,
      );
    }
  }

  // 2. Trial expired — past expiry, still marked as trialing
  const expired = await prisma.user.findMany({
    where: {
      subscriptionStatus: 'trialing',
      trialEndsAt: { lte: now },
    },
    select: { id: true, email: true, name: true, plan: true },
  });

  for (const user of expired) {
    // Split the downgrade and email into two separate try blocks. The
    // downgrade is the load-bearing write — if it fails the user stays
    // on `trialing` past expiry and effectively gets free access to a
    // paid plan. Log loudly and notify them so the next page load
    // surfaces the issue.
    let downgraded = false;
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'free', subscriptionStatus: 'free' },
      });
      stats.downgraded++;
      downgraded = true;
    } catch (err) {
      console.error(
        `[cron.trial-check] trial downgrade failed for user ${user.id}`,
        err,
      );
      await prisma.notification
        .create({
          data: {
            userId: user.id,
            type: 'warning',
            title: 'Your trial has ended',
            message:
              'Your trial period has ended. Pick a plan to keep using paid features without interruption.',
            link: '/settings/billing',
          },
        })
        .catch(() => null);
    }

    if (downgraded) {
      try {
        await emailService.sendTrialExpired({
          to: user.email,
          name: user.name,
          plan: user.plan,
        });
        stats.expiredSent++;
      } catch (err) {
        console.warn(
          `[cron.trial-check] trial-expired email failed for user ${user.id}`,
          err,
        );
      }
    }
  }

  return NextResponse.json(stats);
}
