import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';
import { RefundManager } from '@/components/admin/RefundManager';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RefundsPage() {
  const admin = await requireAdmin();

  // Fetch refunds with related data
  const refunds = await prisma.refund.findMany({
    include: {
      user: { select: { name: true, email: true } },
      processor: { select: { name: true } },
      paymentAttempt: { select: { targetPlan: true, amount: true, paystackReference: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Fetch stats
  const stats = await Promise.all([
    prisma.refund.count({ where: { status: 'pending' } }),
    prisma.refund.count({ where: { status: 'approved' } }),
    prisma.refund.count({ where: { status: 'processed' } }),
    prisma.refund.count({ where: { status: 'rejected' } }),
  ]);

  // Fetch recent successful payment attempts for creating new refunds
  const paymentAttempts = await prisma.paymentAttempt.findMany({
    where: { status: 'success' },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <AdminShell adminName={admin.name} activePath="/admin/refunds">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Refund Management</h1>
        <p className="text-sm text-slate-500">
          Process and manage customer refunds
        </p>
      </div>

      <RefundManager
        refunds={refunds}
        stats={{
          pending: stats[0],
          approved: stats[1],
          processed: stats[2],
          rejected: stats[3],
        }}
        paymentAttempts={paymentAttempts}
      />
    </AdminShell>
  );
}
