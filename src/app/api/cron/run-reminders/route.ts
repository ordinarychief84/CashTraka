import { NextResponse } from 'next/server';
import { reminderService } from '@/lib/services/reminder.service';

/**
 * Auto follow-up cron — runs every 6 hours (or daily).
 * Processes all due ReminderRules and generates WhatsApp links / logs.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await reminderService.runDueReminders();
    return NextResponse.json({
      processed: results.length,
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
