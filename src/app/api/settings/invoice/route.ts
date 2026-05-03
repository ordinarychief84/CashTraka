import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

const PREFIX_RE = /^[A-Z0-9-]{1,8}$/;

const REMINDER_CADENCES = [
  'OFF',
  'FRIENDLY_3_DAYS',
  'FRIENDLY_7_DAYS',
  'OVERDUE_DAILY',
] as const;

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
  // Workflow defaults
  firsAutoSubmit: z.boolean().optional(),
  defaultInvoiceDueDays: z.coerce.number().int().min(0).max(365).nullable().optional(),
  defaultPaymentTerms: z.string().trim().max(120).optional().or(z.literal('')),
  invoiceReminderCadence: z.enum(REMINDER_CADENCES).optional(),
  autoArchiveDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  recurringAutoSendDefault: z.boolean().optional(),
  xmlGenerateOnFirs: z.boolean().optional(),
  documentRetentionMonths: z.coerce.number().int().min(1).max(240).optional(),
  platformFeeOptIn: z.boolean().optional(),
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
      // Workflow defaults
      firsAutoSubmit: user.firsAutoSubmit ?? false,
      defaultInvoiceDueDays: user.defaultInvoiceDueDays ?? null,
      defaultPaymentTerms: user.defaultPaymentTerms ?? '',
      invoiceReminderCadence: user.invoiceReminderCadence ?? 'OFF',
      autoArchiveDays: user.autoArchiveDays ?? null,
      recurringAutoSendDefault: user.recurringAutoSendDefault ?? false,
      xmlGenerateOnFirs: user.xmlGenerateOnFirs ?? true,
      documentRetentionMonths: user.documentRetentionMonths ?? 72,
      platformFeeOptIn: user.platformFeeOptIn ?? false,
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
      // Workflow defaults
      firsAutoSubmit: parsed.data.firsAutoSubmit ?? undefined,
      defaultInvoiceDueDays:
        parsed.data.defaultInvoiceDueDays === undefined
          ? undefined
          : parsed.data.defaultInvoiceDueDays,
      defaultPaymentTerms:
        parsed.data.defaultPaymentTerms === undefined
          ? undefined
          : parsed.data.defaultPaymentTerms || null,
      invoiceReminderCadence: parsed.data.invoiceReminderCadence ?? undefined,
      autoArchiveDays:
        parsed.data.autoArchiveDays === undefined
          ? undefined
          : parsed.data.autoArchiveDays,
      recurringAutoSendDefault: parsed.data.recurringAutoSendDefault ?? undefined,
      xmlGenerateOnFirs: parsed.data.xmlGenerateOnFirs ?? undefined,
      documentRetentionMonths: parsed.data.documentRetentionMonths ?? undefined,
      platformFeeOptIn: parsed.data.platformFeeOptIn ?? undefined,
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
      firsAutoSubmit: true,
      defaultInvoiceDueDays: true,
      defaultPaymentTerms: true,
      invoiceReminderCadence: true,
      autoArchiveDays: true,
      recurringAutoSendDefault: true,
      xmlGenerateOnFirs: true,
      documentRetentionMonths: true,
      platformFeeOptIn: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
