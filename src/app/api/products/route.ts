import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { productSchema } from '@/lib/validators';
import { requireFeature } from '@/lib/gate';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const products = await prisma.product.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = requireFeature(user, 'products');
  if (feature) return feature;

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      { status: 400 },
    );
  }
  const { name, price, cost, stock, trackStock, lowStockAt, note } = parsed.data;

  const product = await prisma.product.create({
    data: {
      userId: user.id,
      name: name.trim(),
      price,
      cost: cost ?? null,
      stock,
      trackStock,
      lowStockAt,
      note: note || null,
    },
  });

  return NextResponse.json({ id: product.id });
}
