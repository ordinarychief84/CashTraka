import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/** DELETE /api/staff-payments/[id] — remove a staff payment entry (mis-log, etc.). */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.staffPayment.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.staffPayment.delete({ where: { id: row.id } });
  // Note: we don't auto-delete the mirrored Expense row — if the owner logged
  // a payroll expense by hand they may not want it vanishing.
  return NextResponse.json({ ok: true });
}
