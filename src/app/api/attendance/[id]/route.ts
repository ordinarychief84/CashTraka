import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/** DELETE /api/attendance/[id] — owner undoes a mistaken attendance mark. */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.attendance.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.attendance.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
