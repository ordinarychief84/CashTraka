import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requirePermission } from '@/lib/auth';
import { authFail } from '@/lib/api-response';
import { enforceQuota } from '@/lib/gate';


const staffSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  pin: z.string().trim().max(6).optional().or(z.literal('')),
  role: z.string().trim().max(60).optional().or(z.literal('')),
  payType: z.enum(['monthly', 'weekly', 'daily', 'per_task']).default('monthly'),
  payAmount: z.coerce.number().int().nonnegative().default(0),
  startDate: z.string().datetime().optional().or(z.literal('')),
  bankName: z.string().trim().max(80).optional().or(z.literal('')),
  bankAccountNumber: z.string().trim().max(20).optional().or(z.literal('')),
  bankAccountName: z.string().trim().max(120).optional().or(z.literal('')),
  nextOfKinName: z.string().trim().max(120).optional().or(z.literal('')),
  nextOfKinPhone: z.string().trim().max(30).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export async function GET() {
  let user;
  try {
    const ctx = await requirePermission('team.read');
    user = ctx.owner;
  } catch (e) {
    const r = authFail(e);
    if (r) return r;
    throw e;
  }
  const staff = await prisma.staffMember.findMany({
    where: { userId: user.id, status: 'active' },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(staff);
}

export async function POST(req: Request) {
  let user;
  try {
    const ctx = await requirePermission('team.write');
    user = ctx.owner;
  } catch (e) {
    const r = authFail(e);
    if (r) return r;
    throw e;
  }

  const gate = await enforceQuota(user, 'create_staff');
  if (gate) return gate;

  const body = await req.json();
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const member = await prisma.staffMember.create({
    data: {
      userId: user.id,
      name: d.name.trim(),
      phone: d.phone || null,
      pin: d.pin || null,
      role: d.role || null,
      payType: d.payType,
      payAmount: d.payAmount,
      startDate: d.startDate ? new Date(d.startDate) : null,
      bankName: d.bankName || null,
      bankAccountNumber: d.bankAccountNumber || null,
      bankAccountName: d.bankAccountName || null,
      nextOfKinName: d.nextOfKinName || null,
      nextOfKinPhone: d.nextOfKinPhone || null,
      notes: d.notes || null,
    },
  });

  return NextResponse.json({ id: member.id });
}
