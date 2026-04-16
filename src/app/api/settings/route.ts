import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireUser, requirePermission } from '@/lib/auth';
import { settingsSchema } from '@/lib/validators';
import { isValidSlug, normalizeSlug } from '@/lib/slug';
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
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const {
    businessName,
    whatsappNumber,
    shopSlug,
    receiptFooter,
    bankName,
    bankAccountNumber,
    bankAccountName,
    businessType,
  } = parsed.data;

  // Normalize and validate the slug if provided.
  let nextSlug: string | null = null;
  if (shopSlug && shopSlug.length > 0) {
    const normalized = normalizeSlug(shopSlug);
    if (!isValidSlug(normalized)) {
      return NextResponse.json(
        { error: 'Shop link can only contain letters, numbers and dashes' },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findUnique({ where: { shopSlug: normalized } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: 'That shop link is already taken' },
        { status: 409 },
      );
    }
    nextSlug = normalized;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      businessName: businessName ? businessName.trim() : null,
      whatsappNumber: whatsappNumber ? whatsappNumber.trim() : null,
      shopSlug: nextSlug,
      receiptFooter: receiptFooter ? receiptFooter.trim() : null,
      bankName: bankName ? bankName.trim() : null,
      bankAccountNumber: bankAccountNumber ? bankAccountNumber.trim() : null,
      bankAccountName: bankAccountName ? bankAccountName.trim() : null,
      businessType: businessType ?? user.businessType,
    },
  });

  return NextResponse.json({ ok: true, shopSlug: nextSlug });
}
