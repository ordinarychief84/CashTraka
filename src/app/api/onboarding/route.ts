import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompleted: true },
  });
  return NextResponse.json({ ok: true });
}
