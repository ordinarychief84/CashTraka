import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const PREFIX_RE = /^[A-Z0-9-]{1,8}$/;

const bodySchema = z.object({
  defaultCurrency: z.string().trim().length(3).toUpperCase().optional(),
  invoicePrefix: z.string().trim().toUpperCase().regex(PREFIX_RE).optional(),
  creditNotePrefix: z.string().trim().toUpperCase().regex(PREFIX_RE).optional(),
  offerPrefix: z.string().trim().toUpperCase().regex(PREFIX_RE).optional(),
  deliveryNotePrefix: z.string().trim().toUpperCase().regex(PREFIX_RE).optional(),
  orderPrefix: z.string().trim().toUpperCase().regex(PREFIX_RE).optional(),
  taxEnabled: z.boolean().optional(),
  paymentInstructions: z.string().trim().max(500).optional().or(z.literal('')),
  invoiceAccentColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  invoiceTemplate: z.enum(['CLASSIC', 'MODERN', 'MINIMAL']).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    success: true,
    data: {
      defaultCurrency: user.defaultCurrency ?? 'NGN',
      invoicePrefix: user.invoicePrefix ?? 'INV',
      creditNotePrefix: user.creditNotePrefix ?? 'CN',
      offerPrefix: user.offerPrefix ?? 'OFF',
      deliveryNotePrefix: user.deliveryNotePrefix ?? 'DN',
      orderPrefix: user.orderPrefix ?? 'ORD',
      taxEnabled: user.taxEnabled ?? false,
      paymentInstructions: user.paymentInstructions ?? '',
      invoiceAccentColor: user.invoiceAccentColor ?? '#00B8E8',
      invoiceTemplate: user.invoiceTemplate ?? 'CLASSIC',
    },
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultCurrency: parsed.data.defaultCurrency ?? undefined,
      invoicePrefix: parsed.data.invoicePrefix ?? undefined,
      creditNotePrefix: parsed.data.creditNotePrefix ?? undefined,
      offerPrefix: parsed.data.offerPrefix ?? undefined,
      deliveryNotePrefix: parsed.data.deliveryNotePrefix ?? undefined,
      orderPrefix: parsed.data.orderPrefix ?? undefined,
      taxEnabled: parsed.data.taxEnabled ?? undefined,
      paymentInstructions:
        parsed.data.paymentInstructions === undefined
          ? undefined
          : parsed.data.paymentInstructions || null,
      invoiceAccentColor: parsed.data.invoiceAccentColor ?? undefined,
      invoiceTemplate: parsed.data.invoiceTemplate ?? undefined,
    },
    select: {
      defaultCurrency: true,
      invoicePrefix: true,
      creditNotePrefix: true,
      offerPrefix: true,
      deliveryNotePrefix: true,
      orderPrefix: true,
      taxEnabled: true,
      paymentInstructions: true,
      invoiceAccentColor: true,
      invoiceTemplate: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
