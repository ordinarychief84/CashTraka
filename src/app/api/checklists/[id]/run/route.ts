import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const checklist = await prisma.checklist.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  });
  if (\!checklist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const run = await prisma.$transaction(async (tx) => {
    const r = await tx.checklistRun.create({
      data: {
        userId: user.id,
        checklistId: checklist.id,
      },
    });

    for (const item of checklist.items) {
      await tx.checklistResult.create({
        data: {
          runId: r.id,
          itemId: item.id,
          checked: false,
        },
      });
    }

    return r;
  });

  return NextResponse.json({ id: run.id });
}
