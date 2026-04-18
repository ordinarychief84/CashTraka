import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { productSchema } from '@/lib/validators';

const patchSchema = productSchema.partial().extend({
  archived: z.coerce.boolean().optional(),
  stockDelta: z.coerce.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const product = await prisma.product.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (\!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (\!parsed.success) {
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
  } = parsed.data;

  // stockDelta is a convenience — "add 10 to stock" without having to do math client-side.
  let nextStock = stock ?? product.stock;
  if (typeof stockDelta === 'number') {
    nextStock = Math.max(product.stock + stockDelta, 0);
  }

  await prisma.product.update({
    where: { id: product.id },
    data: {
      name: name?.trim() ?? product.name,
      price: price ?? product.price,
      cost: cost === undefined ? product.cost : cost,
      stock: nextStock,
      trackStock: trackStock ?? product.trackStock,
      lowStockAt: lowStockAt ?? product.lowStockAt,
      note: note === undefined ? product.note : note || null,
      archived: archived ?? product.archived,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const product = await prisma.product.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (\!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Soft delete by archiving — preserves line-item history.
  await prisma.product.update({
    where: { id: product.id },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true });
}
