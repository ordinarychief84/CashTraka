import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { toCsv } from '@/lib/csv';
import { requireFeature } from '@/lib/gate';

function isoDate(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

function dateRangeFilter(from?: string, to?: string, field = 'createdAt') {
  if (!from && !to) return {};
  const filter: Record<string, unknown> = {};
  filter[field] = {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
  };
  return filter;
}

const LABELS: Record<string, string> = {
  payments: 'Payments',
  debts: 'Debts',
  sales: 'Sales',
  customers: 'Customers',
  expenses: 'Expenses',
  tenants: 'Tenants',
  properties: 'Properties',
  'rent-payments': 'Rent Payments',
};

/**
 * POST /api/export/email
 * Body: { kind, from?, to? }
 * Generates the CSV server-side and emails it as an attachment.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feature = requireFeature(user, 'csvExport');
  if (feature) return feature;

  const body = await req.json();
  const { kind, from, to } = body as { kind: string; from?: string; to?: string };

  if (!kind || !LABELS[kind]) {
    return NextResponse.json({ error: 'Invalid export kind' }, { status: 400 });
  }

  // PM-only exports
  if (['tenants', 'properties', 'rent-payments'].includes(kind) && user.businessType !== 'property_manager') {
    return NextResponse.json({ error: 'Not available for your business type' }, { status: 403 });
  }
  if (kind === 'customers' && user.businessType === 'property_manager') {
    return NextResponse.json({ error: 'Not available for your business type' }, { status: 403 });
  }

  try {
    const csv = await generateCsv(user.id, kind, from, to);
    const filename = `cashtraka-${kind}-${isoDate(new Date())}.csv`;

    // Base64-encode the CSV (with BOM for Excel)
    const csvWithBom = '\uFEFF' + csv;
    const base64 = Buffer.from(csvWithBom, 'utf-8').toString('base64');

    const { emailService } = await import('@/lib/services/email.service');
    const result = await emailService.raw({
      to: user.email,
      subject: `Your ${LABELS[kind]} export is ready - CashTraka`,
      html: buildEmailHtml(user.name, LABELS[kind], from, to),
      attachments: [{ filename, content: base64 }],
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: `CSV sent to ${user.email}` });
  } catch (err) {
    console.error('POST /api/export/email error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildEmailHtml(name: string, kind: string, from?: string, to?: string): string {
  const firstName = esc(name.split(' ')[0]);
  const dateInfo = from || to
    ? `<p style="margin:8px 0 0;font-size:13px;color:#64748B;">Date range: ${esc(from || 'Start')} to ${esc(to || 'Present')}</p>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F9F8;font-family:'Inter',system-ui,-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="background:#FFFFFF;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;margin-bottom:12px;">&#128202;</div>
      <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1A1A1A;">Your ${esc(kind)} export is ready</h1>
      <p style="margin:0;font-size:14px;color:#64748B;">Hi ${firstName}, your CSV file is attached to this email.</p>
      ${dateInfo}
    </div>
    <div style="background:#F2FBDC;border-radius:10px;padding:16px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#334155;">
        Open the attachment to view your <strong>${esc(kind)}</strong> data in Excel or Google Sheets.
      </p>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;text-align:center;">
      This email was sent from CashTraka. If you didn't request this export, you can safely ignore it.
    </p>
  </div>
</div>
</body></html>`;
}

async function generateCsv(userId: string, kind: string, from?: string, to?: string): Promise<string> {
  switch (kind) {
    case 'payments': {
      const rows = await prisma.payment.findMany({
        where: { userId, ...dateRangeFilter(from, to, 'createdAt') },
        orderBy: { createdAt: 'asc' },
      });
      return toCsv([
        ['Date', 'Customer', 'Phone', 'Amount', 'Status'],
        ...rows.map((r) => [isoDate(r.createdAt), r.customerNameSnapshot, r.phoneSnapshot, r.amount, r.status]),
      ]);
    }
    case 'debts': {
      const rows = await prisma.debt.findMany({
        where: { userId, ...dateRangeFilter(from, to, 'createdAt') },
        orderBy: { createdAt: 'asc' },
      });
      return toCsv([
        ['Date', 'Customer', 'Phone', 'Amount Owed', 'Amount Paid', 'Remaining', 'Due Date', 'Status'],
        ...rows.map((r) => [
          isoDate(r.createdAt), r.customerNameSnapshot, r.phoneSnapshot,
          r.amountOwed, r.amountPaid, Math.max(r.amountOwed - r.amountPaid, 0),
          r.dueDate ? isoDate(r.dueDate) : '', r.status,
        ]),
      ]);
    }
    case 'customers': {
      const rows = await prisma.customer.findMany({
        where: { userId, ...dateRangeFilter(from, to, 'lastActivityAt') },
        orderBy: { name: 'asc' },
      });
      return toCsv([
        ['Name', 'Phone', 'Total Paid', 'Money Owed', 'Transactions', 'Last Activity'],
        ...rows.map((r) => [r.name, r.phone, r.totalPaid, r.totalOwed, r.transactionCount, isoDate(r.lastActivityAt)]),
      ]);
    }
    case 'expenses': {
      const rows = await prisma.expense.findMany({
        where: { userId, ...dateRangeFilter(from, to, 'incurredOn') },
        orderBy: { incurredOn: 'asc' },
      });
      return toCsv([
        ['Date', 'Category', 'Amount', 'Note'],
        ...rows.map((r) => [isoDate(r.incurredOn), r.category, r.amount, r.note || '']),
      ]);
    }
    case 'sales': {
      const rows = await prisma.sale.findMany({
        where: { userId, ...dateRangeFilter(from, to, 'soldAt') },
        include: { items: true },
        orderBy: { soldAt: 'asc' },
      });
      return toCsv([
        ['Receipt #', 'Date', 'Customer', 'Payment Method', 'Subtotal', 'Discount', 'Total', 'Items'],
        ...rows.map((r) => [
          r.saleNumber, isoDate(r.soldAt), r.customerName || '', r.paymentMethod,
          r.subtotal, r.discount, r.total,
          r.items.map((i) => i.description + ' x' + i.quantity).join('; '),
        ]),
      ]);
    }
    case 'tenants': {
      const rows = await prisma.tenant.findMany({
        where: { userId, ...dateRangeFilter(from, to, 'createdAt') },
        include: { property: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });
      return toCsv([
        ['Name', 'Phone', 'Property', 'Unit', 'Monthly Rent', 'Due Day', 'Frequency', 'Status', 'Lease Start', 'Lease End'],
        ...rows.map((r) => [
          r.name, r.phone, r.property.name, r.unitLabel || '', r.rentAmount, r.rentDueDay,
          r.rentFrequency, r.status, r.leaseStart ? isoDate(r.leaseStart) : '', r.leaseEnd ? isoDate(r.leaseEnd) : '',
        ]),
      ]);
    }
    case 'properties': {
      const rows = await prisma.property.findMany({
        where: { userId },
        include: { tenants: { where: { status: 'active' }, select: { id: true, rentAmount: true } } },
        orderBy: { name: 'asc' },
      });
      return toCsv([
        ['Name', 'Address', 'Units', 'Active Tenants', 'Monthly Expected Rent', 'Note'],
        ...rows.map((r) => [
          r.name, r.address || '', r.unitCount, r.tenants.length,
          r.tenants.reduce((s, t) => s + t.rentAmount, 0), r.note || '',
        ]),
      ]);
    }
    case 'rent-payments': {
      const rows = await prisma.rentPayment.findMany({
        where: { userId, ...dateRangeFilter(from, to, 'paidAt') },
        include: { tenant: { select: { name: true, property: { select: { name: true } } } } },
        orderBy: { paidAt: 'asc' },
      });
      return toCsv([
        ['Date', 'Tenant', 'Property', 'Amount', 'Method', 'Period', 'Note'],
        ...rows.map((r) => [
          isoDate(r.paidAt), r.tenant.name, r.tenant.property.name,
          r.amount, r.method || '', r.periodLabel || '', r.note || '',
        ]),
      ]);
    }
    default:
      return '';
  }
}
