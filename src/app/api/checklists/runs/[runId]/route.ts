import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const patchSchema = z.object({
  itemId: z.string().min(1, 'itemId is required'),
  checked: z.boolean(),
  note: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { runId: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const run = await prisma.checklistRun.findFirst({
    where: { id: params.runId, userId: user.id },
  });
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const { itemId, checked, note } = parsed.data;

  // Find the specific result row
  const result = await prisma.checklistResult.findFirst({
    where: { runId: run.id, itemId },
  });
  if (!result) return NextResponse.json({ error: 'Result not found' }, { status: 404 });

  await prisma.checklistResult.update({
    where: { id: result.id },
    data: {
      checked,
      checkedAt: checked ? new Date() : null,
      note: note !== undefined ? note || null : result.note,
    },
  });

  // Check if ALL results for this run are now checked
  const uncheckedCount = await prisma.checklistResult.count({
    where: { runId: run.id, checked: false },
  });

  if (uncheckedCount === 0 && !run.completedAt) {
    await prisma.checklistRun.update({
      where: { id: run.id },
      data: { completedAt: new Date() },
    });
  } else if (uncheckedCount > 0 && run.completedAt) {
    // Reopened an item — clear completedAt
    await prisma.checklistRun.update({
      where: { id: run.id },
      data: { completedAt: null },
    });
  }

  return NextResponse.json({ ok: true });
}
