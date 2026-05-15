'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { UserCircle2, Search, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

export type TeamMemberRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  status: string;
  joinedOn: string;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TeamMembersTable({ rows }: { rows: TeamMemberRow[] }) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.role) set.add(r.role);
    return Array.from(set).sort();
  }, [rows]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.department) set.add(r.department);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (role && r.role !== role) return false;
      if (dept && r.department !== dept) return false;
      if (status && r.status !== status) return false;
      if (ql) {
        const hay = [r.name, r.email ?? '', r.phone ?? '']
          .join(' ')
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, role, dept, status]);

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-2 border-b border-border bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team member..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="border-b border-border bg-white px-3 py-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-white">
              <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5">Member</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Department</th>
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Joined On</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 align-middle">
                    <Link
                      href={`/team/${r.id}`}
                      className="flex items-center gap-2.5 hover:opacity-90"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-slate-50">
                        <UserCircle2 size={20} className="text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">
                          {r.name}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-700">
                    {r.role ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-700">
                    {r.department ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.email ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {r.phone ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 align-middle text-xs text-slate-600">
                    {fmt(r.joinedOn)}
                  </td>
                  <td className="px-3 py-2.5 align-middle text-right">
                    <button
                      type="button"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Row actions"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No team members match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {filtered.map((r) => (
          <li key={r.id}>
            <Link
              href={`/team/${r.id}`}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-slate-50">
                <UserCircle2 size={22} className="text-slate-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-ink">{r.name}</div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-[11px] text-slate-500">
                  {r.role ?? '—'}
                  {r.department ? ` · ${r.department}` : ''}
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{r.email ?? r.phone ?? '—'}</span>
                  <span className="text-[10px] text-slate-500">{fmt(r.joinedOn)}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No team members match these filters.
          </li>
        )}
      </ul>
    </div>
  );
}
