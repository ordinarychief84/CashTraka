import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requirePermission } from '@/lib/auth';
import { settingsSchema } from '@/lib/validators';
import { handled, ok } from '@/lib/api-response';

/** GET /api/settings — returns the current user's settings (no password hash). */
export const GET = () =>
  handled(async () => {
    const user = await requireUser();
    const { passwordHash, ...rest } = user;
    return ok(rest);
  });

/** PATCH /api/settings — alias for POST (spec uses PATCH, UI uses POST). */
export async function PATCH(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  let user;
  try {
    const ctx = await requirePermission('settings.write');
    user = ctx.owner;
  } catch (e: any) {
    if (e?.code === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (e?.code === 'FORBIDDEN') return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const body = await req.json();
  const parsed = settingsSchema.safeParse(body);
  if (\!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const {
    businessName,
    businessAddress,
    whatsappNumber,
    receiptFooter,
    bankName,
    bankAccountNumber,
    bankAccountName,
    businessType,
  } = parsed.data;

  // Only update fields that were actually sent. Previously every absent
  // field resolved to `undefined ? … : null`, silently wiping existing data.
  const data: Record<string, unknown> = {};
  if (businessName \!== undefined) data.businessName = businessName?.trim() || null;
  if (businessAddress \!== undefined) data.businessAddress = businessAddress?.trim() || null;
  if (whatsappNumber \!== undefined) data.whatsappNumber = whatsappNumber?.trim() || null;
  if (receiptFooter \!== undefined) data.receiptFooter = receiptFooter?.trim() || null;
  if (bankName \!== undefined) data.bankName = bankName?.trim() || null;
  if (bankAccountNumber \!== undefined) data.bankAccountNumber = bankAccountNumber?.trim() || null;
  if (bankAccountName \!== undefined) data.bankAccountName = bankAccountName?.trim() || null;
  if (businessType \!== undefined) data.businessType = businessType || user.businessType;

  await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
