import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { nextDocumentNumber } from '@/lib/invoice-helpers';
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

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const prefix =
    user.deliveryNotePrefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DN';

  const deliveryNoteNumber = await nextDocumentNumber({
    userId: user.id,
    prefix,
    table: 'deliveryNote',
    field: 'deliveryNoteNumber',
  });

  const dn = await prisma.deliveryNote.create({
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

  documentAudit.log({
    userId: user.id,
    actorId: user.id,
    entityType: 'DELIVERY_NOTE',
    entityId: dn.id,
    action: 'CREATED',
    metadata: { deliveryNoteNumber },
  });
  documentAudit.archive({
    userId: user.id,
    documentType: 'DELIVERY_NOTE',
    documentId: dn.id,
    documentNumber: deliveryNoteNumber,
  });

  return NextResponse.json({ success: true, data: dn }, { status: 201 });
}
