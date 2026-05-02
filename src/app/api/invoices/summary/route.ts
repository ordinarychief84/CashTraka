import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * GET /api/invoices/summary
 *
 * Top-of-page rollup for the /invoices dashboard:
 *   - outstanding total (sum of unpaid total - amountPaid for non-cancelled)
 *   - paid this month
 *   - overdue count
 *   - total invoiced (lifetime)
 *   - draft count
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const all = await prisma.invoice.findMany({
    where: { userId: user.id },
    select: {
      status: true,
      total: true,
      amountPaid: true,
      dueDate: true,
      paidAt: true,
      issuedAt: true,
    },
  });

  let outstanding = 0;
  let paidThisMonth = 0;
  let overdueCount = 0;
  let draftCount = 0;
  let totalInvoiced = 0;

  for (const inv of all) {
    if (inv.status === 'DRAFT') draftCount++;
    if (inv.status === 'CANCELLED' || inv.status === 'CREDITED') continue;
    totalInvoiced += inv.total;
    const remaining = Math.max(0, inv.total - inv.amountPaid);
    outstanding += remaining;
    if (inv.paidAt && inv.paidAt >= startOfMonth) paidThisMonth += inv.amountPaid;
    if (remaining > 0 && inv.dueDate && inv.dueDate.getTime() < now.getTime()) {
      overdueCount++;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      outstanding,
      paidThisMonth,
      overdueCount,
      draftCount,
      totalInvoiced,
      invoiceCount: all.length,
    },
  });
}
