import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requirePermission } from '@/lib/auth';

function authFail(e: unknown): NextResponse | null {
  const err = e as { code?: string; message?: string };
  if (err?.code === 'UNAUTHORIZED')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (err?.code === 'FORBIDDEN')
    return NextResponse.json({ error: err.message ?? 'Forbidden' }, { status: 403 });
  return null;
}

/**
 * Staff payment API.
 *
 * Every payment to staff is logged here — salaries, advances, bonuses,
 * commissions, reimbursements. This feeds:
 *   - the "how much I still owe them" balance on the staff detail page
 *   - the monthly payroll total on /team
 *   - the Expenses report (payroll is a real business expense)
 *
 * When a salary or daily wage is logged, we optionally mirror it into the
 * Expense table so P&L reports include it automatically. Other kinds
 * (reimbursement, advance) are not expenses — advances are loans, and
 * reimbursements are already tracked as the original expense.
 */

const createSchema = z.object({
  staffId: z.string().min(1),
  kind: z.enum(['salary', 'advance', 'bonus', 'commission', 'reimbursement']),
  amount: z.coerce.number().int().positive('Amount must be greater than zero'),
  periodStart: z.string().datetime().optional().or(z.literal('')),
  periodEnd: z.string().datetime().optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  paidAt: z.string().datetime().optional().or(z.literal('')),
});

const EXPENSE_KINDS = new Set(['salary', 'bonus', 'commission']);

export async function POST(req: Request) {
  let user;
  try {
    const ctx = await requirePermission('payroll.write');
    user = ctx.owner;
  } catch (e) {
    const r = authFail(e);
    if (r) return r;
    throw e;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const staff = await prisma.staffMember.findFirst({
    where: { id: d.staffId, userId: user.id },
  });
  if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

  const paidAt = d.paidAt ? new Date(d.paidAt) : new Date();

  const payment = await prisma.staffPayment.create({
    data: {
      userId: user.id,
      staffId: staff.id,
      kind: d.kind,
      amount: d.amount,
      periodStart: d.periodStart ? new Date(d.periodStart) : null,
      periodEnd: d.periodEnd ? new Date(d.periodEnd) : null,
      note: d.note || null,
      paidAt,
    },
  });

  // Mirror real-pay kinds into Expense so P&L reports stay honest.
  if (EXPENSE_KINDS.has(d.kind)) {
    await prisma.expense
      .create({
        data: {
          userId: user.id,
          amount: d.amount,
          category: 'Payroll',
          note: `${d.kind === 'salary' ? 'Salary' : d.kind[0].toUpperCase() + d.kind.slice(1)} — ${staff.name}${d.note ? ' · ' + d.note : ''}`,
          incurredOn: paidAt,
        },
      })
      .catch(() => null); // never block payroll on expense mirror failure
  }

  return NextResponse.json({ id: payment.id });
}

/**
 * GET /api/staff-payments?staffId=...&month=YYYY-MM
 * List staff payments filtered by staff and/or month.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get('staffId');
  const month = searchParams.get('month');

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    dateFilter = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    };
  }

  const rows = await prisma.staffPayment.findMany({
    where: {
      userId: user.id,
      ...(staffId ? { staffId } : {}),
      ...(dateFilter ? { paidAt: dateFilter } : {}),
    },
    include: { staff: { select: { id: true, name: true } } },
    orderBy: { paidAt: 'desc' },
  });
  return NextResponse.json(rows);
}
