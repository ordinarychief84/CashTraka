import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';
import { NotificationBroadcast } from '@/components/admin/NotificationBroadcast';
import { formatDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const admin = await requireAdmin();

  // Fetch recent broadcasts from audit log
  const broadcastHistory = await prisma.auditLog.findMany({
    where: { action: 'notification.broadcast' },
    include: { admin: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Fetch notification stats
  const [totalNotifications, unreadCount] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  // Fetch all users for the broadcast form
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
    take: 100,
  });

  return (
    <AdminShell adminName={admin.name} activePath="/admin/notifications">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500">
          Send broadcasts and manage system notifications
        </p>
      </div>

      <NotificationBroadcast
        broadcastHistory={broadcastHistory.map((log) => ({
          id: log.id,
          adminName: log.admin.name,
          details: log.details ? JSON.parse(log.details) : null,
          createdAt: log.createdAt,
        }))}
        stats={{
          totalSent: totalNotifications,
          unread: unreadCount,
        }}
        availableUsers={users}
      />
    </AdminShell>
  );
}
