import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { BlogManager } from '@/components/admin/BlogManager';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  const admin = await requireAdminSection('blog');
  return (
    <AdminShell activePath="/admin/blog" adminName={admin.name} adminRole={admin.adminRole}>
      <BlogManager />
    </AdminShell>
  );
}
