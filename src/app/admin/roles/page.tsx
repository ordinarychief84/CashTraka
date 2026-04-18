import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';
import { RoleManager } from '@/components/admin/RoleManager';
import { formatDate, timeAgo } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  const admin = await requireAdmin();

  // Fetch all admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch recent non-admin, non-suspended users for promotion
  const users = await prisma.user.findMany({
    where: { role: 'USER', isSuspended: false },
    select: { id: true, name: true, email: true, businessName: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <AdminShell adminName={admin.name} activePath="/admin/roles">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Role Management</h1>
        <p className="text-sm text-slate-500">
          Manage admin assignments and user promotions
        </p>
      </div>

      <RoleManager
        admins={admins}
        users={users}
        currentAdminId={admin.id}
      />
    </AdminShell>
  );
}
