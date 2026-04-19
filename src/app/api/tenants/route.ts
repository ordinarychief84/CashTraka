import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { enforceQuota } from '@/lib/gate';

const createSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  name: z.string().trim().min(1, 'Tenant name is required'),
  phone: z.string().trim().min(7, 'Valid phone number required'),
  unitLabel: z.string().trim().optional(),
  rentAmount: z.coerce.number().int().positive('Rent amount must be positive'),
  rentDueDay: z.coerce.number().int().min(1).max(28).default(1),
  rentFrequency: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
  leaseStart: z.string().optional(),
  leaseEnd: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await enforceQuota(user, 'create_tenant');
  if (gate) return gate;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const { propertyId, name, phone, unitLabel, rentAmount, rentDueDay, rentFrequency, leaseStart, leaseEnd } = parsed.data;

  // Verify user owns the property
  const property = await prisma.property.findFirst({
    where: { id: propertyId, userId: user.id },
  });
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }

  const tenant = await prisma.tenant.create({
    data: {
      userId: user.id,
      propertyId,
      name,
      phone,
      unitLabel: unitLabel || null,
      rentAmount,
      rentDueDay,
      rentFrequency,
      leaseStart: leaseStart ? new Date(leaseStart) : null,
      leaseEnd: leaseEnd ? new Date(leaseEnd) : null,
    },
  });

  return NextResponse.json({ id: tenant.id });
}
