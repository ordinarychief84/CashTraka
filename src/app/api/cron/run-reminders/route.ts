import { NextResponse } from 'next/server';
import { reminderService } from '@/lib/services/reminder.service';
import { promiseToPayService } from '@/lib/services/promise-to-pay.service';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

/**
 * Auto follow-up cron, runs daily at 09:00 UTC.
 *
 * 1. Processes all due ReminderRules → WhatsApp links / logs.
 * 2. Promise-to-pay check (folded in from the retired broken-promises cron):
 *    flips PROMISED → BROKEN for promises whose committed date has passed,
 *    and writes a per-promise Notification once per UTC day. No additional
 *    email — the overdue-receivable email above already covers the AR.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await reminderService.runDueReminders();

    // Promise-to-pay second pass. Failures here must not poison the main
    // reminder pass response — log and continue.
    let promiseStats: { flipped: number; notified: number } = { flipped: 0, notified: 0 };
    try {
      promiseStats = await promiseToPayService.markBrokenPromisesAndNotify();
    } catch (err) {
      console.warn('[cron.run-reminders] broken-promise pass failed', err);
    }

    return NextResponse.json({
      processed: results.length,
      brokenPromises: promiseStats,
      results: results.map((r) => ({
        ruleId: r.ruleId,
        customer: r.customerName,
        amount: r.amount,
        tone: r.tone,
      })),
    });
  } catch (err) {
    console.error('run-reminders cron error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 },
    );
  }
}
