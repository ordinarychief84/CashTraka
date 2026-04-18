import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { csvResponse, toCsv } from '@/lib/csv';
import { requireFeature } from '@/lib/gate';

function isoDate(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: { kind: string } },
) {
  const user = await getCurrentUser();
  if (\!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = requireFeature(user, 'csvExport');
  if (feature) return feature;

  const { kind } = params;

  // Block seller-only exports for property managers — they don't use these.
  if (user.businessType === 'property_manager' && (kind === 'customers' || kind === 'products')) {
    return NextResponse.json({ error: 'Not available for your business type' }, { status: 403 });
  }

  if (kind === 'payments') {
    const rows = await prisma.payment.findMany({
      where: { userId: user.id },
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
      where: { userId: user.id },
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
      where: { userId: user.id },
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
      where: { userId: user.id },
      orderBy: { incurredOn: 'asc' },
    });
    const csv = toCsv([
      ['Date', 'Category', 'Amount', 'Note'],
      ...rows.map((r) => [isoDate(r.incurredOn), r.category, r.amount, r.note || '']),
    ]);
    return csvResponse(csv, `cashtraka-expenses-${isoDate(new Date())}.csv`);
  }

  // Property-manager-specific exports. Gate them behind the PM business type so
  // a seller with a paid plan can't accidentally hit these.
  if (kind === 'tenants') {
    if (user.businessType \!== 'property_manager') {
      return NextResponse.json({ error: 'Not available for your business type' }, { status: 403 });
    }
    const rows = await prisma.tenant.findMany({
      where: { userId: user.id },
      include: { property: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    const csv = toCsv([
      ['Name', 'Phone', 'Property', 'Unit', 'Monthly Rent', 'Due Day', 'Frequency', 'Status', 'Lease Start', 'Lease End'],
      ...rows.map((r) => [
        r.name,
        r.phone,
        r.property.name,
        r.unitLabel || '',
        r.rentAmount,
        r.rentDueDay,
        r.rentFrequency,
        r.status,
        r.leaseStart ? isoDate(r.leaseStart) : '',
        r.leaseEnd ? isoDate(r.leaseEnd) : '',
      ]),
    ]);
    return csvResponse(csv, `cashtraka-tenants-${isoDate(new Date())}.csv`);
  }

  if (kind === 'properties') {
    if (user.businessType \!== 'property_manager') {
      return NextResponse.json({ error: 'Not available for your business type' }, { status: 403 });
    }
    const rows = await prisma.property.findMany({
      where: { userId: user.id },
      include: { tenants: { where: { status: 'active' }, select: { id: true, rentAmount: true } } },
      orderBy: { name: 'asc' },
    });
    const csv = toCsv([
      ['Name', 'Address', 'Units', 'Active Tenants', 'Monthly Expected Rent', 'Note'],
      ...rows.map((r) => [
        r.name,
        r.address || '',
        r.unitCount,
        r.tenants.length,
        r.tenants.reduce((s, t) => s + t.rentAmount, 0),
        r.note || '',
      ]),
    ]);
    return csvResponse(csv, `cashtraka-properties-${isoDate(new Date())}.csv`);
  }

  return NextResponse.json({ error: 'Unknown export kind' }, { status: 400 });
}
