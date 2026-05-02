import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireFeature } from '@/lib/gate';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1),
  unitPrice: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
});

const ruleSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(7),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  startDate: z.string(),
  endDate: z.string().optional().or(z.literal('')),
  autoSend: z.boolean().default(false),
  applyVat: z.boolean().default(false),
  vatRate: z.coerce.number().nonnegative().max(100).optional(),
  discount: z.coerce.number().int().nonnegative().default(0),
  paymentTerms: z.string().trim().max(120).optional().or(z.literal('')),
  note: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(itemSchema).min(1),
});

export async function GET(_req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rules = await prisma.recurringInvoiceRule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ success: true, data: rules });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = requireFeature(user, 'recurringInvoices');
  if (feature) return feature;

  const body = await req.json().catch(() => ({}));
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const start = new Date(data.startDate);
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: 'Invalid start date' }, { status: 400 });
  }

  // IDOR guard: validate any customerId/productId belongs to the caller.
  if (data.customerId) {
    const ownsCustomer = await prisma.customer.findFirst({
      where: { id: data.customerId, userId: user.id },
      select: { id: true },
    });
    if (!ownsCustomer) {
      return NextResponse.json(
        { error: 'Customer not found in your account.' },
        { status: 400 },
      );
    }
  }
  const productIds = Array.from(
    new Set(data.items.map((it) => it.productId).filter(Boolean) as string[]),
  );
  if (productIds.length > 0) {
    const owned = await prisma.product.findMany({
      where: { id: { in: productIds }, userId: user.id },
      select: { id: true },
    });
    if (owned.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more products do not exist in your catalog.' },
        { status: 400 },
      );
    }
  }

  const rule = await prisma.recurringInvoiceRule.create({
    data: {
      userId: user.id,
      customerId: data.customerId || null,
      frequency: data.frequency,
      startDate: start,
      nextRunAt: start,
      endDate: data.endDate ? new Date(data.endDate) : null,
      autoSend: data.autoSend,
      status: 'ACTIVE',
      templateData: JSON.stringify({
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        applyVat: data.applyVat,
        vatRate: data.vatRate ?? (data.applyVat ? 7.5 : 0),
        discount: data.discount,
        paymentTerms: data.paymentTerms || null,
        note: data.note || null,
        items: data.items,
      }),
    },
  });

  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'RECURRING_RULE',
    entityId: rule.id,
    action: 'CREATED',
    metadata: { frequency: data.frequency },
  });

  return NextResponse.json({ success: true, data: rule }, { status: 201 });
}
