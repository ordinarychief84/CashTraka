import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reminderService } from '@/lib/services/reminder.service';
import { requireFeature } from '@/lib/gate';
import { limitsFor, effectivePlan } from '@/lib/plan-limits';
import { prisma } from '@/lib/prisma';

/** GET /api/reminders — list user's reminder rules + stats */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [rules, stats, recentLogs] = await Promise.all([
      reminderService.listRules(user.id),
      reminderService.stats(user.id),
      reminderService.recentLogs(user.id, 10),
    ]);

    return NextResponse.json({ rules, stats, recentLogs });
  } catch (err) {
    console.error('GET /api/reminders error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}

/** POST /api/reminders — create a new reminder rule */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Feature gate
    const blocked = requireFeature(user, 'autoReminders');
    if (blocked) return blocked;

    // Quota check on number of rules
    const eff = effectivePlan(user);
    const limits = limitsFor(eff.plan);
    if (limits.maxReminderRules !== null) {
      const currentCount = await prisma.reminderRule.count({
        where: { userId: user.id, enabled: true },
      });
      if (currentCount >= limits.maxReminderRules) {
        return NextResponse.json(
          {
            error: `Your plan allows up to ${limits.maxReminderRules} active reminder rules. Upgrade for more.`,
            upgrade: { upgradeHref: '/billing' },
          },
          { status: 402 },
        );
      }
    }

    const body = await req.json();
    const { debtId, tone, intervalDays, maxReminders, channel } = body;

    if (!debtId) {
      return NextResponse.json({ error: 'debtId is required' }, { status: 400 });
    }

    const rule = await reminderService.createRule({
      userId: user.id,
      debtId,
      tone,
      intervalDays,
      maxReminders,
      channel,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    console.error('POST /api/reminders error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
