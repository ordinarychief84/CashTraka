import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { reminderService } from '@/lib/services/reminder.service';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/reminders/[id], update a reminder rule */
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json();
    const { tone, intervalDays, maxReminders, channel, enabled } = body;

    const updated = await reminderService.updateRule(id, user.id, {
      tone,
      intervalDays,
      maxReminders,
      channel,
      enabled,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/reminders/[id] error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/reminders/[id], delete a reminder rule */
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    await reminderService.deleteRule(id, user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/reminders/[id] error:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
