import { redirect } from 'next/navigation';
import { guard } from './guard';
import { can, type Permission } from './rbac';

/**
 * Page-level RBAC guard. Use inside a server component to block pages that
 * require a specific permission:
 *
 *   const user = await guardWithPermission('settings.write');
 *
 * Behaviour:
 *   - runs the normal `guard()` first (redirects to /login if unauth)
 *   - if the principal doesn't have the permission, redirects to /dashboard
 *     with ?denied=<permission> so the destination page can surface a toast.
 */
export async function guardWithPermission(action: Permission) {
  const user = await guard();
  if (!can(user.accessRole, action)) {
    redirect(`/dashboard?denied=${encodeURIComponent(action)}`);
  }
  return user;
}
