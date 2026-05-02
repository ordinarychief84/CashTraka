import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireFeature } from '@/lib/gate';
import {
  computeInvoiceTotals,
  makePublicToken,
  nextDocumentNumber,
  withDocumentNumberRetry,
} from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1),
  unitPrice: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
});

const createSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().optional().or(z.literal('')),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  validUntil: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  applyVat: z.boolean().default(false),
  vatRate: z.coerce.number().nonnegative().max(100).optional(),
  discount: z.coerce.number().int().nonnegative().default(0),
  items: z.array(itemSchema).min(1),
});

export async function GET(_req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.offer.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { items: true },
  });
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = requireFeature(user, 'offers');
  if (feature) return feature;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const data = parsed.data;

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

  const effectiveVatRate = data.vatRate ?? (data.applyVat ? 7.5 : 0);
  const totals = computeInvoiceTotals({
    items: data.items,
    discount: data.discount,
    vatRate: effectiveVatRate,
    applyVat: data.applyVat,
  });

  const prefix =
    user.offerPrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'OFF';
  const { offer, offerNumber } = await withDocumentNumberRetry(async () => {
    const offerNumber = await nextDocumentNumber({
      userId: user.id,
      prefix,
      table: 'offer',
      field: 'offerNumber',
    });
    const created = await prisma.offer.create({
      data: {
        userId: user.id,
        customerId: data.customerId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone || null,
        customerEmail: data.customerEmail || null,
        offerNumber,
        status: 'DRAFT',
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        subtotal: totals.subtotal,
        taxAmount: totals.tax,
        total: totals.total,
        notes: data.notes || null,
        publicToken: makePublicToken(),
        items: {
          create: data.items.map((it) => ({
            productId: it.productId || null,
            description: it.description,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
          })),
        },
      },
    });
    return { offer: created, offerNumber };
  });

  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'OFFER',
    entityId: offer.id,
    action: 'CREATED',
    metadata: { offerNumber },
  });
  await documentAudit.archive({
    userId: user.id,
    documentType: 'OFFER',
    documentId: offer.id,
    documentNumber: offerNumber,
  });

  return NextResponse.json({ success: true, data: offer }, { status: 201 });
}
