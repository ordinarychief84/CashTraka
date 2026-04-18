/**
 * POST /api/tenants/[id]/renew-lease
 *
 * Renews a tenant's lease: updates leaseStart/leaseEnd and clears all
 * LeaseReminder records so the lifecycle starts fresh.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const schema = z.object({
  leaseStart: z.coerce.date(),
  leaseEnd: z.coerce.date(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid dates' },
      { status: 400 },
    );
  }

  const { leaseStart, leaseEnd } = parsed.data;
  if (leaseEnd <= leaseStart) {
    return NextResponse.json(
      { error: 'Lease end must be after lease start' },
      { status: 400 },
    );
  }

  // Verify tenant belongs to user
  const tenant = await prisma.tenant.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Update lease dates and delete old reminder records
  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: params.id },
      data: { leaseStart, leaseEnd, status: 'active' },
    }),
    prisma.leaseReminder.deleteMany({
      where: { tenantId: params.id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
