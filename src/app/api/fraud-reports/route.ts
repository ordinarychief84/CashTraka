import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { fraudReportSchema } from '@/lib/validators';
import { normalizeNigerianPhone } from '@/lib/whatsapp';

/** GET /api/fraud-reports?phone=..., return aggregate stats for a phone number. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('phone');
  if (!raw) return NextResponse.json({ reports: 0, reasons: [], youReported: false });
  const phone = normalizeNigerianPhone(raw);

  const [count, youReport, latest] = await Promise.all([
    prisma.fraudReport.count({ where: { phone } }),
    prisma.fraudReport.findFirst({ where: { phone, userId: user.id } }),
    prisma.fraudReport.findMany({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { reason: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({
    reports: count,
    youReported: Boolean(youReport),
    reasons: latest,
  });
}

/** POST /api/fraud-reports, report a phone number. Idempotent per (user, phone). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = fraudReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const phone = normalizeNigerianPhone(parsed.data.phone);

  await prisma.fraudReport.upsert({
    where: { userId_phone: { userId: user.id, phone } },
    create: { userId: user.id, phone, reason: parsed.data.reason.trim() },
    update: { reason: parsed.data.reason.trim() },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/fraud-reports?phone=..., remove your own report for a number. */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('phone');
  if (!raw) return NextResponse.json({ error: 'phone required' }, { status: 400 });
  const phone = normalizeNigerianPhone(raw);
  await prisma.fraudReport
    .delete({ where: { userId_phone: { userId: user.id, phone } } })
    .catch(() => null);
  return NextResponse.json({ ok: true });
}
