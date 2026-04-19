import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ROLES } from '@/lib/constants/roles';

/**
 * Hard guard for every /admin page. If a non-admin lands here, bounce them to
 * the seller dashboard. If nobody's logged in, the middleware has already
 * redirected to /login.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/dashboard');
  if (user.role !== ROLES.ADMIN) redirect('/dashboard');
  return <>{children}</>;
}
