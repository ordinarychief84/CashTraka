import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: { items: { include: { product: { select: { name: true, stock: true } } } } },
  });

  if (!sale || sale.userId !== user.id) {
    return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
  }

  return NextResponse.json(sale);
}
