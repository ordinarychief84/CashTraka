import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';

/**
 * Cron: Delayed Welcome Email
 *
 * Runs every 10 minutes. Finds users who:
 *   1. Signed up 30+ minutes ago
 *   2. Haven't received the delayed welcome email yet
 *   3. Signed up within the last 24 hours (avoid spamming old users)
 *   4. Have completed onboarding (welcome email sent on onboarding completion,
 *      this cron sends the richer delayed version)
 *
 * Sends a warm, marketing-quality welcome email then marks them as sent.
 */
export async function GET(req: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Find eligible users
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,    // signed up within last 24h
          lte: thirtyMinAgo, // but at least 30 min ago
        },
        welcomeEmailSentAt: null, // haven't received it yet
        onboardingCompleted: true, // only after onboarding is done
        isSuspended: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        businessType: true,
        businessName: true,
      },
      take: 50, // batch limit per run
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const result = await emailService.sendDelayedWelcome({
        to: user.email,
        name: user.name,
        businessType: user.businessType ?? undefined,
        businessName: user.businessName ?? undefined,
      });

      if (result.ok) {
        await prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSentAt: new Date() },
        });
        sent++;
      } else {
        console.error(`[welcome-email] Failed for ${user.email}:`, result.error);
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      eligible: users.length,
      sent,
      failed,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[welcome-email] Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
