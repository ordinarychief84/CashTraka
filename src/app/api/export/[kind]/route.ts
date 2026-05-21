import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { csvResponse, toCsv } from '@/lib/csv';
import { requireFeature } from '@/lib/gate';

function isoDate(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

/** Parse optional from / to query params into a Prisma date filter. */
function dateRange(url: URL, field = 'createdAt') {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (!from && !to) return {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  filter[field] = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
  };
  return filter;
}

export async function GET(req: Request, props: { params: Promise<{ kind: string }> }) {
  const params = await props.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = await requireFeature(user, 'csvExport');
  if (feature) return feature;

  const { kind } = params;
  const url = new URL(req.url);

  // Block seller-only exports for property managers — they don't use these.
  if (user.businessType === 'property_manager' && (kind === 'customers' || kind === 'products')) {
    return NextResponse.json({ error: 'Not available for your business type' }, { status: 403 });
  }

  if (kind === 'payments') {
    const rows = await prisma.payment.findMany({
      where: { userId: user.id, ...dateRange(url, 'createdAt') },
      orderBy: { createdAt: 'asc' },
    });
    const csv = toCsv([
      ['Date', 'Customer', 'Phone', 'Amount', 'Status'],
      ...rows.map((r) => [
        isoDate(r.createdAt),
        r.customerNameSnapshot,
        r.phoneSnapshot,
        r.amount,
        r.status,
      ]),
    ]);
    return csvResponse(csv, `cashtraka-payments-${isoDate(new Date())}.csv`);
  }

  if (kind === 'debts') {
    const rows = await prisma.debt.findMany({
      where: { userId: user.id, ...dateRange(url, 'createdAt') },
      orderBy: { createdAt: 'asc' },
    });
    const csv = toCsv([
      ['Date', 'Customer', 'Phone', 'Amount Owed', 'Amount Paid', 'Remaining', 'Due Date', 'Status'],
      ...rows.map((r) => [
        isoDate(r.createdAt),
        r.customerNameSnapshot,
        r.phoneSnapshot,
        r.amountOwed,
        r.amountPaid,
        Math.max(r.amountOwed - r.amountPaid, 0),
        r.dueDate ? isoDate(r.dueDate) : '',
        r.status,
      ]),
    ]);
    return csvResponse(csv, `cashtraka-debts-${isoDate(new Date())}.csv`);
  }

  if (kind === 'customers') {
    const rows = await prisma.customer.findMany({
      where: { userId: user.id, ...dateRange(url, 'lastActivityAt') },
      orderBy: { name: 'asc' },
    });
    const csv = toCsv([
      ['Name', 'Phone', 'Total Paid', 'Money Owed', 'Transactions', 'Last Activity'],
      ...rows.map((r) => [
        r.name,
        r.phone,
        r.totalPaid,
        r.totalOwed,
        r.transactionCount,
        isoDate(r.lastActivityAt),
      ]),
    ]);
    return csvResponse(csv, `cashtraka-customers-${isoDate(new Date())}.csv`);
  }

  if (kind === 'expenses') {
    const rows = await prisma.expense.findMany({
      where: { userId: user.id, ...dateRange(url, 'incurredOn') },
      orderBy: { incurredOn: 'asc' },
    });
    const csv = toCsv([
      ['Date', 'Category', 'Amount', 'Note'],
      ...rows.map((r) => [isoDate(r.incurredOn), r.category, r.amount, r.note || '']),
    ]);
    return csvResponse(csv, `cashtraka-expenses-${isoDate(new Date())}.csv`);
  }

  if (kind === 'sales') {
    const rows = await prisma.sale.findMany({
      where: { userId: user.id, ...dateRange(url, 'soldAt') },
      include: { items: true },
      orderBy: { soldAt: 'asc' },
    });
    const csv = toCsv([
      ['Receipt #', 'Date', 'Customer', 'Payment Method', 'Subtotal', 'Discount', 'Total', 'Items'],
      ...rows.map((r) => [
        r.saleNumber,
        isoDate(r.soldAt),
        r.customerName || '',
        r.paymentMethod,
        r.subtotal,
        r.discount,
        r.total,
        r.items.map((i) => i.description + ' x' + i.quantity).join('; '),
      ]),
    ]);
    return csvResponse(csv, `cashtraka-sales-${isoDate(new Date())}.csv`);
  }

  return NextResponse.json({ error: 'Unknown export kind' }, { status: 400 });
}
