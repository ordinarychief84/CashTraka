import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * CSV export of every (non-archived) product the caller owns. Used by the
 * "Export" button on /products. Streaming is overkill — a typical seller
 * has 10-200 SKUs.
 */

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { name: 'asc' },
  });

  const header = [
    'ID',
    'Name',
    'SKU',
    'Price (NGN)',
    'Cost (NGN)',
    'Stock',
    'Track stock',
    'Low-stock alert',
    'NAFDAC',
    'Shelf life (days)',
    'Published',
    'Note',
  ].join(',');

  const lines = products.map((p) =>
    [
      csvCell(p.id),
      csvCell(p.name),
      csvCell(p.sku),
      csvCell(p.price),
      csvCell(p.cost ?? ''),
      csvCell(p.stock),
      csvCell(p.trackStock ? 'yes' : 'no'),
      csvCell(p.lowStockAt),
      csvCell(p.nafdacNumber),
      csvCell(p.shelfLifeDays ?? ''),
      csvCell(p.isPublished ? 'yes' : 'no'),
      csvCell(p.note),
    ].join(','),
  );

  const body = [header, ...lines].join('\n');
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="products-${date}.csv"`,
    },
  });
}
