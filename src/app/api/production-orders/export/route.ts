import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '';
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await prisma.productionOrder.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      items: { include: { product: { select: { name: true } } } },
      customerOrder: { select: { orderNumber: true, customerName: true } },
    },
    take: 5000,
  });

  const header = [
    'Production #',
    'Order',
    'Customer',
    'Products',
    'Total qty',
    'Status',
    'Planned start',
    'Started',
    'Completed',
    'Duration',
    'Batch',
    'Unit cost total (kobo)',
    'Notes',
  ].join(',');

  const lines = orders.map((o) => {
    const totalQty = o.items.reduce((s, it) => s + it.quantity, 0);
    const productNames = o.items.map((it) => it.product?.name ?? 'Product').join('; ');
    const durationMs =
      o.startedAt && o.completedAt
        ? new Date(o.completedAt).getTime() - new Date(o.startedAt).getTime()
        : null;
    const unitCostKoboTotal = o.items.reduce(
      (s, it) => s + (it.unitCostKoboSnapshot ?? 0) * it.quantity,
      0,
    );
    return [
      csvCell(o.productionNumber),
      csvCell(o.customerOrder?.orderNumber),
      csvCell(o.customerOrder?.customerName),
      csvCell(productNames),
      csvCell(totalQty),
      csvCell(o.status),
      csvCell(o.plannedStartAt ? o.plannedStartAt.toISOString() : ''),
      csvCell(o.startedAt ? o.startedAt.toISOString() : ''),
      csvCell(o.completedAt ? o.completedAt.toISOString() : ''),
      csvCell(formatDuration(durationMs)),
      csvCell(o.batchNumber),
      csvCell(unitCostKoboTotal),
      csvCell(o.notes),
    ].join(',');
  });

  const body = [header, ...lines].join('\n');
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="production-history-${date}.csv"`,
    },
  });
}
