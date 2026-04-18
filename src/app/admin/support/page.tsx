import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';
import { SupportManager } from '@/components/admin/SupportManager';

export const dynamic = 'force-dynamic';

export default async function SupportPage() {
  const admin = await requireAdmin();

  // Fetch tickets with stats
  const [tickets, stats] = await Promise.all([
    prisma.supportTicket.findMany({
      include: {
        user: { select: { name: true, email: true } },
        assignee: { select: { name: true } },
        replies: {
          select: { id: true, message: true, isAdmin: true, createdAt: true, user: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Count by status
    Promise.all([
      prisma.supportTicket.count({ where: { status: 'open' } }),
      prisma.supportTicket.count({ where: { status: 'in_progress' } }),
      prisma.supportTicket.count({ where: { status: 'resolved' } }),
      prisma.supportTicket.count({ where: { status: 'closed' } }),
    ]),
  ]);

  // Get all admins for assignment dropdown
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true },
  });

  return (
    <AdminShell adminName={admin.name} activePath="/admin/support">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Support Tickets</h1>
        <p className="text-sm text-slate-500">
          Manage customer support requests and resolution
        </p>
      </div>

      <SupportManager
        tickets={tickets}
        admins={admins}
        stats={{
          open: stats[0],
          inProgress: stats[1],
          resolved: stats[2],
          closed: stats[3],
        }}
        currentAdminId={admin.id}
      />
    </AdminShell>
  );
}
