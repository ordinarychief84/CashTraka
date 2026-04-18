import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { templateSchema } from '@/lib/validators';
import { enforceQuota } from '@/lib/gate';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await enforceQuota(user, 'create_template');
  if (gate) return gate;

  const body = await req.json();
  const parsed = templateSchema.safeParse(body);
  if (\!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const template = await prisma.messageTemplate.create({
    data: { userId: user.id, name: parsed.data.name, body: parsed.data.body },
  });
  return NextResponse.json({ id: template.id });
}
