import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { requireFeature } from '@/lib/gate';
import { nextDocumentNumber, withDocumentNumberRetry } from '@/lib/invoice-helpers';
import { documentAudit } from '@/lib/services/document-audit.service';

export const runtime = 'nodejs';

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
});

const createSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().optional().or(z.literal('')),
  customerAddress: z.string().trim().optional().or(z.literal('')),
  deliveryDate: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(itemSchema).min(1),
});

export async function GET(_req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await prisma.deliveryNote.findMany({
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

  const feature = requireFeature(user, 'deliveryNotes');
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

  const prefix =
    user.deliveryNotePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DN';

  const { dn, deliveryNoteNumber } = await withDocumentNumberRetry(async () => {
    const deliveryNoteNumber = await nextDocumentNumber({
      userId: user.id,
      prefix,
      table: 'deliveryNote',
      field: 'deliveryNoteNumber',
    });
    const created = await prisma.deliveryNote.create({
      data: {
        userId: user.id,
        customerId: data.customerId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone || null,
        customerAddress: data.customerAddress || null,
        deliveryNoteNumber,
        status: 'ISSUED',
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        notes: data.notes || null,
        items: {
          create: data.items.map((it) => ({
            productId: it.productId || null,
            description: it.description,
            quantity: it.quantity,
          })),
        },
      },
    });
    return { dn: created, deliveryNoteNumber };
  });

  await documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'DELIVERY_NOTE',
    entityId: dn.id,
    action: 'CREATED',
    metadata: { deliveryNoteNumber },
  });
  await documentAudit.archive({
    userId: user.id,
    documentType: 'DELIVERY_NOTE',
    documentId: dn.id,
    documentNumber: deliveryNoteNumber,
  });

  return NextResponse.json({ success: true, data: dn }, { status: 201 });
}
