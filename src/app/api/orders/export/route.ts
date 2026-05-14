import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { customerOrdersService } from '@/lib/services/customer-orders.service';

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

  const { rows } = await customerOrdersService.listForUser(user.id, { take: 200 });

  const header = [
    'Order #',
    'Status',
    'Customer',
    'Phone',
    'Items',
    'Due date',
    'Created',
    'Total (NGN kobo)',
    'Notes',
  ].join(',');

  const lines = rows.map((o: any) =>
    [
      csvCell(o.orderNumber),
      csvCell(o.status),
      csvCell(o.customerName),
      csvCell(o.customerPhone),
      csvCell(
        (o.items ?? [])
          .map((it: any) => `${it.quantity}x ${it.description}`)
          .join('; '),
      ),
      csvCell(o.dueAt ? new Date(o.dueAt).toISOString().slice(0, 10) : ''),
      csvCell(new Date(o.createdAt).toISOString().slice(0, 10)),
      csvCell(o.totalKobo),
      csvCell(o.notes),
    ].join(','),
  );

  const body = [header, ...lines].join('\n');
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${date}.csv"`,
    },
  });
}
