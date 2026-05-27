import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requirePermission } from '@/lib/auth';
import { settingsSchema } from '@/lib/validators';
import { handled, ok } from '@/lib/api-response';

/** GET /api/settings, returns the current user's settings (no password hash). */
export const GET = () =>
  handled(async () => {
    const user = await requireUser();
    const { passwordHash, ...rest } = user;
    return ok(rest);
  });

/** PATCH /api/settings, alias for POST (spec uses PATCH, UI uses POST). */
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
  if (!parsed.success) {
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
    receiptPrefix,
    bankName,
    bankAccountNumber,
    bankAccountName,
    businessType,
    tin,
    vatRegistered,
    vatRate,
    firsMerchantId,
    phoneNumber,
    website,
    eanNumber,
    vatNumber,
    postcode,
    city,
    country,
    street2,
    generalStartingNumber,
  } = parsed.data;

  // Only update fields that were actually sent. Previously every absent
  // field resolved to `undefined ? … : null`, silently wiping existing data.
  const data: Record<string, unknown> = {};
  if (businessName !== undefined) data.businessName = businessName?.trim() || null;
  if (businessAddress !== undefined) data.businessAddress = businessAddress?.trim() || null;
  if (whatsappNumber !== undefined) data.whatsappNumber = whatsappNumber?.trim() || null;
  if (receiptFooter !== undefined) data.receiptFooter = receiptFooter?.trim() || null;
  if (receiptPrefix !== undefined) data.receiptPrefix = (receiptPrefix?.trim() || 'CT').toUpperCase();
  if (bankName !== undefined) data.bankName = bankName?.trim() || null;
  if (bankAccountNumber !== undefined) data.bankAccountNumber = bankAccountNumber?.trim() || null;
  if (bankAccountName !== undefined) data.bankAccountName = bankAccountName?.trim() || null;
  if (businessType !== undefined) data.businessType = businessType || user.businessType;
  if (tin !== undefined) data.tin = tin?.trim() || null;
  if (vatRegistered !== undefined) data.vatRegistered = vatRegistered;
  if (vatRate !== undefined) data.vatRate = vatRate;
  if (firsMerchantId !== undefined) data.firsMerchantId = firsMerchantId?.trim() || null;
  if (phoneNumber !== undefined) data.phoneNumber = phoneNumber?.trim() || null;
  if (website !== undefined) data.website = website?.trim() || null;
  if (eanNumber !== undefined) data.eanNumber = eanNumber?.trim() || null;
  if (vatNumber !== undefined) data.vatNumber = vatNumber?.trim() || null;
  if (postcode !== undefined) data.postcode = postcode?.trim() || null;
  if (city !== undefined) data.city = city?.trim() || null;
  if (country !== undefined) data.country = country?.trim() || null;
  if (street2 !== undefined) data.street2 = street2?.trim() || null;
  if (generalStartingNumber !== undefined) data.generalStartingNumber = generalStartingNumber;

  await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
