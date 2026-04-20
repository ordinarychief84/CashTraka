import { requireAdminSection } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/AdminShell';
import { StaffManager } from '@/components/admin/StaffManager';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  const admin = await requireAdminSection('roles');

  const staff = await prisma.adminStaff.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } } },
  });

  const superAdmins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, name: true, email: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <AdminShell adminName={admin.name} activePath="/admin/roles" adminRole={admin.adminRole}>
      <StaffManager
        staff={staff.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          adminRole: s.adminRole,
          status: s.status,
          lastLoginAt: s.lastLoginAt?.toISOString() || null,
          createdAt: s.createdAt.toISOString(),
          createdByName: s.createdBy?.name || 'System',
        }))}
        superAdmins={superAdmins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          lastLoginAt: a.lastLoginAt?.toISOString() || null,
          createdAt: a.createdAt.toISOString(),
        }))}
        currentAdminId={admin.id}
      />
    </AdminShell>
  );
}
