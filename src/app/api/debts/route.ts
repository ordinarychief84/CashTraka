import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { debtSchema } from '@/lib/validators';
import { upsertCustomer, recomputeCustomerTotals } from '@/lib/customers';
import { normalizeNigerianPhone } from '@/lib/whatsapp';
import { enforceQuota } from '@/lib/gate';
import { debtService } from '@/lib/services/debt.service';
import { handled, ok } from '@/lib/api-response';
import { nairaToKobo } from '@/lib/money';

/** GET /api/debts, paginated list of the user's debts. */
export const GET = (req: Request) =>
  handled(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'OPEN' | 'PAID' | null;
    const take = Math.min(Number(searchParams.get('take') ?? 50), 200);
    const skip = Math.max(Number(searchParams.get('skip') ?? 0), 0);
    const result = await debtService.listForUser(user.id, {
      status: status ?? undefined,
      take,
      skip,
    });
    return ok(result);
  });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const gate = await enforceQuota(user, 'create_debt');
  if (gate) return gate;

  const body = await req.json();
  const parsed = debtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { customerName, phone, amountOwed, dueDate } = parsed.data;
  const normalizedPhone = normalizeNigerianPhone(phone);
  const customer = await upsertCustomer(user.id, customerName, phone);

  const debt = await prisma.debt.create({
    data: {
      userId: user.id,
      customerId: customer.id,
      customerNameSnapshot: customerName.trim(),
      phoneSnapshot: normalizedPhone,
      amountOwed,
      amountOwedKobo: nairaToKobo(amountOwed),
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  await recomputeCustomerTotals(customer.id);

  return NextResponse.json({ id: debt.id });
}
