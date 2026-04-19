import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { authFail } from '@/lib/api-response';


const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().max(30).optional(),
  pin: z.string().trim().max(6).optional(),
  role: z.string().trim().max(60).optional(),
  payType: z.enum(['monthly', 'weekly', 'daily', 'per_task']).optional(),
  payAmount: z.coerce.number().int().nonnegative().optional(),
  startDate: z.string().datetime().optional().or(z.literal('')),
  bankName: z.string().trim().max(80).optional(),
  bankAccountNumber: z.string().trim().max(20).optional(),
  bankAccountName: z.string().trim().max(120).optional(),
  nextOfKinName: z.string().trim().max(120).optional(),
  nextOfKinPhone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    const ctx = await requirePermission('team.write');
    user = ctx.owner;
  } catch (e) {
    const r = authFail(e);
    if (r) return r;
    throw e;
  }

  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const orNull = <T extends string>(v: T | undefined, current: T | null): T | null =>
    v !== undefined ? ((v as string) ? (v as T) : null) : current;

  await prisma.staffMember.update({
    where: { id: member.id },
    data: {
      name: d.name ?? member.name,
      phone: orNull(d.phone, member.phone),
      pin: orNull(d.pin, member.pin),
      role: orNull(d.role, member.role),
      payType: d.payType ?? member.payType,
      payAmount: d.payAmount ?? member.payAmount,
      startDate:
        d.startDate !== undefined
          ? d.startDate
            ? new Date(d.startDate)
            : null
          : member.startDate,
      bankName: orNull(d.bankName, member.bankName),
      bankAccountNumber: orNull(d.bankAccountNumber, member.bankAccountNumber),
      bankAccountName: orNull(d.bankAccountName, member.bankAccountName),
      nextOfKinName: orNull(d.nextOfKinName, member.nextOfKinName),
      nextOfKinPhone: orNull(d.nextOfKinPhone, member.nextOfKinPhone),
      notes: orNull(d.notes, member.notes),
      status: d.status ?? member.status,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    const ctx = await requirePermission('team.write');
    user = ctx.owner;
  } catch (e) {
    const r = authFail(e);
    if (r) return r;
    throw e;
  }

  const member = await prisma.staffMember.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Soft-delete by marking inactive (preserves attendance + payment history)
  await prisma.staffMember.update({
    where: { id: member.id },
    data: { status: 'inactive' },
  });
  return NextResponse.json({ ok: true });
}
