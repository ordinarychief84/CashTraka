import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requirePermission } from '@/lib/auth';
import { authFail } from '@/lib/api-response';
import { requireFeature } from '@/lib/gate';


/**
 * Attendance API.
 *
 * One row per (staffId, date). Upserting is the common path: owner taps a
 * status chip for today, and we either insert or update in one call.
 *
 * Dates are stored normalised to midnight UTC so the `@@unique([staffId, date])`
 * index works consistently regardless of submission timezone.
 */

const upsertSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().datetime().optional(), // defaults to today (UTC midnight)
  status: z.enum(['present', 'absent', 'half_day', 'leave']),
  note: z.string().trim().max(300).optional().or(z.literal('')),
});

function toMidnightUTC(d: Date): Date {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

/** POST /api/attendance, upsert today's attendance for a staff member. */
export async function POST(req: Request) {
  let user;
  try {
    const ctx = await requirePermission('attendance.write');
    user = ctx.owner;
  } catch (e) {
    const r = authFail(e);
    if (r) return r;
    throw e;
  }

  // Plan gate: attendance is a paid-plan feature.
  const feature = await requireFeature(user, 'attendance');
  if (feature) return feature;

  const body = await req.json().catch(() => ({}));
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }

  const staff = await prisma.staffMember.findFirst({
    where: { id: parsed.data.staffId, userId: user.id },
  });
  if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

  const date = toMidnightUTC(
    parsed.data.date ? new Date(parsed.data.date) : new Date(),
  );

  const row = await prisma.attendance.upsert({
    where: { staffId_date: { staffId: staff.id, date } },
    update: {
      status: parsed.data.status,
      note: parsed.data.note || null,
    },
    create: {
      userId: user.id,
      staffId: staff.id,
      date,
      status: parsed.data.status,
      note: parsed.data.note || null,
    },
  });

  return NextResponse.json({ id: row.id, status: row.status, date: row.date });
}

/**
 * GET /api/attendance?staffId=...&month=YYYY-MM
 * Returns every attendance row for that staff within the month.
 * Without ?month, returns the current month.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get('staffId');
  const month = searchParams.get('month');

  let start: Date;
  let end: Date;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    start = new Date(Date.UTC(y, m - 1, 1));
    end = new Date(Date.UTC(y, m, 1));
  } else {
    const now = new Date();
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  }

  const rows = await prisma.attendance.findMany({
    where: {
      userId: user.id,
      ...(staffId ? { staffId } : {}),
      date: { gte: start, lt: end },
    },
    orderBy: { date: 'desc' },
  });
  return NextResponse.json(rows);
}
