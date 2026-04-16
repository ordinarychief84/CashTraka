import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { recomputeCustomerTotals, upsertCustomer } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { paymentService } from '@/lib/services/payment.service';
import { handled, ok } from '@/lib/api-response';

const patchSchema = z.object({
  customerName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(7).optional(),
  amount: z.coerce.number().int().positive().optional(),
  status: z.enum(['PAID', 'PENDING']).optional(),
});

/** GET /api/payments/[id] — single payment detail. */
export const GET = (_req: Request, ctx: { params: { id: string } }) =>
  handled(async () => {
    const user = await requireUser();
    const payment = await paymentService.getForUser(user.id, ctx.params.id);
    return ok(payment);
  });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.payment.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { customerName, phone, amount, status } = parsed.data;

  // If phone changes, we need to (possibly) move the payment to a different customer.
  let customerId = payment.customerId;
  let phoneSnapshot = payment.phoneSnapshot;
  let nameSnapshot = payment.customerNameSnapshot;

  if (phone || customerName) {
    const nextName = customerName ?? payment.customerNameSnapshot;
    const nextPhone = phone ?? payment.phoneSnapshot;
    const normalized = normalizeNigerianPhone(nextPhone);
    const nextCustomer = await upsertCustomer(user.id, nextName, nextPhone);
    customerId = nextCustomer.id;
    phoneSnapshot = normalized;
    nameSnapshot = nextName.trim();
  }

  const prevCustomerId = payment.customerId;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      customerId,
      customerNameSnapshot: nameSnapshot,
      phoneSnapshot,
      amount: amount ?? payment.amount,
      status: status ?? payment.status,
    },
  });

  // Recompute totals for whichever customer(s) are affected.
  await recomputeCustomerTotals(customerId);
  if (prevCustomerId !== customerId) {
    await recomputeCustomerTotals(prevCustomerId);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const payment = await prisma.payment.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.payment.delete({ where: { id: payment.id } });
  await recomputeCustomerTotals(payment.customerId);
  return NextResponse.json({ ok: true });
}
