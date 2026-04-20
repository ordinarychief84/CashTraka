import Link from 'next/link';
import { Search, Users, UserCheck, UserX, Crown, UserPlus, Download } from 'lucide-react';
import { requireAdminSection } from '@/lib/admin-auth';
import { AdminShell } from '@/components/admin/AdminShell';
import { adminService } from '@/lib/services/admin.service';
import { formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type SP = {
  q?: string;
  role?: 'USER' | 'ADMIN';
  businessType?: 'seller' | 'property_manager';
  isSuspended?: 'yes' | 'no';
  plan?: string;
  page?: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdminSection('users');
  const [{ rows, pagination }, stats] = await Promise.all([
    adminService.listUsers(searchParams),
    adminService.userStats(),
  ]);

  return (
    <AdminShell adminName={admin.name} activePath="/admin/users" adminRole={admin.adminRole}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage accounts, plans, and access across your platform</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Total users" value={stats.total} />
        <StatCard icon={UserCheck} label="Active" value={stats.active} color="success" />
        <StatCard icon={UserX} label="Suspended" value={stats.suspended} color="danger" />
        <StatCard icon={Crown} label="Paid plans" value={stats.paidPlan} color="brand" />
        <StatCard icon={Users} label="Free plan" value={stats.freePlan} />
        <StatCard icon={UserPlus} label="New this month" value={stats.newThisMonth} color="brand" />
      </div>

      <form className="mb-4 rounded-xl border border-border bg-white p-3" action="/admin/users" method="get">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={searchParams.q ?? ''} placeholder="Search by name, email or business..." className="input !pl-10" />
          </div>
          <select name="role" defaultValue={searchParams.role ?? ''} className="input md:w-32">
            <option value="">All roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select name="businessType" defaultValue={searchParams.businessType ?? ''} className="input md:w-36">
            <option value="">All types</option>
            <option value="seller">Seller</option>
            <option value="property_manager">Landlord</option>
          </select>
          <select name="isSuspended" defaultValue={searchParams.isSuspended ?? ''} className="input md:w-32">
            <option value="">Any status</option>
            <option value="no">Active</option>
            <option value="yes">Suspended</option>
          </select>
          <button type="submit" className="btn-primary whitespace-nowrap"><Search size={14} /> Search</button>
        </div>
      </form>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">Showing {rows.length} of {pagination.total} users</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-slate-50/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">Business</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">Last active</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center">
                <Users size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-500">No users found</p>
              </td></tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className={cn('transition-colors hover:bg-slate-50', u.isSuspended && 'bg-red-50/30')}>
                <td className="px-4 py-3">
                  <Link href={`/admin/users/${u.id}`} className="group block">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{u.name.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-ink group-hover:text-brand-600">{u.name}</span>
                          {u.role === 'ADMIN' && (<span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-success-400">ADMIN</span>)}
                        </div>
                        <div className="truncate text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="text-sm text-ink">{u.businessName || <span className="text-slate-400">--</span>}</div>
                  <div className="text-xs capitalize text-slate-500">{u.businessType.replace('_', ' ')}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize', u.plan === 'free' ? 'bg-slate-100 text-slate-600' : 'bg-brand-50 text-brand-700')}>{u.plan.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  {u.isSuspended ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Suspended</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-[11px] font-bold text-success-700"><span className="h-1.5 w-1.5 rounded-full bg-success-500" />Active</span>
                  )}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="text-xs text-slate-600">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : <span className="text-slate-400">Never</span>}</div>
                  <div className="text-[10px] text-slate-400">Joined {formatDate(u.createdAt)}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${u.id}`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
          <div className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</div>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link href={`/admin/users?${new URLSearchParams({ ...searchParams, page: String(pagination.page - 1) } as Record<string, string>).toString()}`} className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Previous</Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link href={`/admin/users?${new URLSearchParams({ ...searchParams, page: String(pagination.page + 1) } as Record<string, string>).toString()}`} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Next</Link>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: number; color?: 'success' | 'danger' | 'brand' }) {
  const colors = { success: 'bg-success-50 text-success-700', danger: 'bg-red-50 text-red-700', brand: 'bg-brand-50 text-brand-700' };
  const iconColor = color ? colors[color] : 'bg-slate-100 text-slate-600';
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className={cn('mb-2 inline-flex rounded-lg p-1.5', iconColor)}><Icon size={16} /></div>
      <div className="text-xl font-black text-ink">{value}</div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
    </div>
  );
}
