/**
 * Vercel Cron, Daily Pulse Email
 *
 * Runs daily at 7 AM WAT (06:00 UTC). Sends each active user a morning
 * summary email with revenue, debts, paylinks needing attention, and
 * reminders due today.
 *
 * Also expires stale PayLinks past their expiresAt date.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/services/email.service';
import { computeDailyPulse } from '@/lib/services/daily-pulse.service';
import { paylinkService } from '@/lib/services/paylink.service';
import { suggestionService } from '@/lib/services/suggestion.service';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Expire stale paylinks
  const expired = await paylinkService.expireStale();

  // 2. Get all active users who have logged in within the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const users = await prisma.user.findMany({
    where: {
      isSuspended: false,
      role: 'USER', // Don't send to admin-only accounts
      lastLoginAt: { gte: thirtyDaysAgo },
    },
    select: { id: true, email: true, name: true },
  });

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const pulse = await computeDailyPulse(user.id);

      // Skip users with no activity (no revenue, no debts, no paylinks)
      if (
        pulse.todayRevenue === 0 &&
        pulse.totalOwed === 0 &&
        pulse.pendingPaylinks === 0 &&
        pulse.claimedPaylinks === 0
      ) {
        continue;
      }

      // Fetch top 3 suggestions for this user
      let suggestions: { emoji: string; label: string }[] = [];
      try {
        const allSuggestions = await suggestionService.generate(user.id);
        suggestions = allSuggestions.slice(0, 3).map((s) => ({
          emoji: s.category === 'COLLECT' ? '💰' : s.category === 'REWARD' ? '🌟' : s.category === 'RE_ENGAGE' ? '📞' : '⚡',
          label: s.label,
        }));
      } catch { /* suggestions are optional */ }

      const result = await emailService.sendDailyPulse({
        to: user.email,
        name: user.name.split(' ')[0],
        todayRevenue: pulse.todayRevenue,
        revenueDelta: pulse.revenueDelta,
        totalOwed: pulse.totalOwed,
        overdueDebts: pulse.overdueDebts,
        claimedPaylinks: pulse.claimedPaylinks,
        remindersDueToday: pulse.remindersDueToday,
        topDebtors: pulse.topDebtors,
        yesterdaySpent: pulse.yesterdaySpent,
        suggestions,
        activePromises: pulse.activePromises,
        brokenPromises: pulse.brokenPromises,
        autoConfirmedToday: pulse.autoConfirmedToday,
        autoConfirmedAmountToday: pulse.autoConfirmedAmountToday,
      });

      if (result.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    expiredPaylinks: expired.count,
    emailsSent: sent,
    emailsFailed: failed,
    totalUsers: users.length,
  });
}
