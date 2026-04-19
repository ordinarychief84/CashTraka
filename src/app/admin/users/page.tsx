import Link from 'next/link';
import { Search } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
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
  hasActivity?: 'yes' | 'no';
  page?: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: SP }) {
  const admin = await requireAdmin();
  const { rows, pagination } = await adminService.listUsers(searchParams);

  return (
    <AdminShell adminName={admin.name} activePath="/admin/users">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Users</h1>
          <p className="mt-1 text-sm text-slate-600">
            {pagination.total} {pagination.total === 1 ? 'account' : 'accounts'} total
          </p>
        </div>
      </div>

      <form className="mb-4 grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]" action="/admin/users" method="get">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Name, email or business name"
            className="input !pl-10"
          />
        </div>
        <select name="role" defaultValue={searchParams.role ?? ''} className="input md:w-40">
          <option value="">All roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          name="businessType"
          defaultValue={searchParams.businessType ?? ''}
          className="input md:w-44"
        >
          <option value="">All types</option>
          <option value="seller">Seller</option>
          <option value="property_manager">Landlord</option>
        </select>
        <select
          name="isSuspended"
          defaultValue={searchParams.isSuspended ?? ''}
          className="input md:w-40"
        >
          <option value="">Any status</option>
          <option value="no">Active</option>
          <option value="yes">Suspended</option>
        </select>
        <button type="submit" className="btn-primary">Filter</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Business</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  No users match your filters.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="block font-semibold text-ink hover:underline"
                  >
                    {u.name}
                    {u.role === 'ADMIN' && (
                      <span className="ml-1.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-lime-400">
                        ADMIN
                      </span>
                    )}
                  </Link>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-ink">{u.businessName || '—'}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {u.businessType.replace('_', ' ')}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={cn(
                      'inline-block rounded-full px-2 py-0.5 font-semibold',
                      u.plan === 'free' ? 'bg-slate-100 text-slate-600' : 'bg-brand-50 text-brand-700',
                    )}
                  >
                    {u.plan}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isSuspended ? (
                    <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}
                  <div className="text-[10px] text-slate-400">
                    Joined {formatDate(u.createdAt)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/admin/users?${new URLSearchParams({ ...searchParams, page: String(pagination.page - 1) } as Record<string, string>).toString()}`}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ← Prev
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/admin/users?${new URLSearchParams({ ...searchParams, page: String(pagination.page + 1) } as Record<string, string>).toString()}`}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
