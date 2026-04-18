import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { enforceQuota } from '@/lib/gate';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Property name is required'),
  address: z.string().trim().optional(),
  unitCount: z.coerce.number().int().min(0).default(0),
  note: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await enforceQuota(user, 'create_property');
  if (gate) return gate;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (\!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const { name, address, unitCount, note } = parsed.data;

  const property = await prisma.property.create({
    data: {
      userId: user.id,
      name,
      address: address || null,
      unitCount,
      note: note || null,
    },
  });

  return NextResponse.json({ id: property.id });
}
