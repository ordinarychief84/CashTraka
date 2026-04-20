/**
 * Admin page auth helper — resolves the current admin (super admin or staff)
 * and checks section-level access. Use in server components.
 */
import { requireAdminOrStaff } from '@/lib/auth';
import { adminCan } from '@/lib/admin-rbac';
import type { AdminSection } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';
import { redirect } from 'next/navigation';

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  adminRole: string;
  isSuperAdmin: boolean;
};

/**
 * Require admin access for a specific section. Redirects to /admin/dashboard
 * if the user doesn't have access to this section, or to /login if not logged in.
 */
export async function requireAdminSection(section?: AdminSection): Promise<AdminUser> {
  try {
    const admin = await requireAdminOrStaff();

    // If a section is specified, check permission
    if (section && !adminCan(admin.adminRole as AdminRole, section)) {
      redirect('/admin/dashboard');
    }

    return admin;
  } catch {
    redirect('/login');
  }
}
