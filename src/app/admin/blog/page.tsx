import { requireAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { BlogManager } from '@/components/admin/BlogManager';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  await requireAdmin();
  return (
    <AdminShell activePath="/admin/blog" adminName="Admin">
      <BlogManager />
    </AdminShell>
  );
}
