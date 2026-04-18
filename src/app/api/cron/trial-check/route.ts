import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';

/**
 * Trial lifecycle cron — runs daily at 8 AM WAT (07:00 UTC).
 * 1. Sends "trial ending soon" email 3 days before expiry.
 * 2. Sends "trial expired" + downgrades expired trials to free.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader \!== `Bearer ${process.env.CRON_SECRET}`) {
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
      (user.trialEndsAt\!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
    try {
      await emailService.sendTrialEndingSoon({
        to: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt\!,
        daysLeft,
      });
      stats.endingSoonSent++;
    } catch {
      // non-critical
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
    try {
      // Downgrade to free
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'free', subscriptionStatus: 'free' },
      });
      stats.downgraded++;

      await emailService.sendTrialExpired({
        to: user.email,
        name: user.name,
        plan: user.plan,
      });
      stats.expiredSent++;
    } catch {
      // non-critical
    }
  }

  return NextResponse.json(stats);
}
