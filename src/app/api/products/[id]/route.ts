import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { productSchema } from '@/lib/validators';
import { nairaToKobo } from '@/lib/money';
import { handled } from '@/lib/api-response';

const patchSchema = productSchema.partial().extend({
  archived: z.coerce.boolean().optional(),
  stockDelta: z.coerce.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const product = await prisma.product.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const {
    name,
    price,
    cost,
    stock,
    trackStock,
    lowStockAt,
    note,
    archived,
    stockDelta,
    images,
    sku,
    description,
    nafdacNumber,
    shelfLifeDays,
    clientName,
  } = parsed.data;

  // stockDelta is a convenience — "add 10 to stock" without having to do math client-side.
  let nextStock = stock ?? product.stock;
  if (typeof stockDelta === 'number') {
    nextStock = Math.max(product.stock + stockDelta, 0);
  }

  const nextPrice = price ?? product.price;
  const nextCost = cost === undefined ? product.cost : cost;
  await prisma.product.update({
    where: { id: product.id },
    data: {
      name: name?.trim() ?? product.name,
      price: nextPrice,
      priceKobo: nairaToKobo(nextPrice),
      cost: nextCost,
      costKobo: nextCost == null ? null : nairaToKobo(nextCost),
      stock: nextStock,
      trackStock: trackStock ?? product.trackStock,
      lowStockAt: lowStockAt ?? product.lowStockAt,
      note: note === undefined ? product.note : note || null,
      archived: archived ?? product.archived,
      images: images ?? undefined,
      sku: sku === undefined ? product.sku : sku || null,
      description:
        description === undefined ? product.description : description || null,
      nafdacNumber:
        nafdacNumber === undefined ? product.nafdacNumber : nafdacNumber || null,
      shelfLifeDays:
        shelfLifeDays === undefined ? product.shelfLifeDays : shelfLifeDays ?? null,
      clientName:
        clientName === undefined ? product.clientName : clientName || null,
    },
  });

  return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return handled(async () => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const product = await prisma.product.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Soft delete by archiving — preserves line-item history.
    await prisma.product.update({
      where: { id: product.id },
      data: { archived: true },
    });
    return NextResponse.json({ ok: true });
  });
}
