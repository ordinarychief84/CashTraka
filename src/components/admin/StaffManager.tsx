'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  UserPlus,
  Shield,
  ShieldCheck,
  Mail,
  MoreVertical,
  RefreshCw,
  Ban,
  Trash2,
  X,
  Search,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

type Staff = {
  id: string;
  name: string;
  email: string;
  adminRole: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  createdByName: string;
};

type SuperAdmin = {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
};

type Props = {
  staff: Staff[];
  superAdmins: SuperAdmin[];
  currentAdminId: string;
};

const ROLE_OPTIONS = [
  { value: 'BLOG_MANAGER', label: 'Blog Manager', desc: 'Create, edit, and publish blog posts', sections: 'Dashboard, Blog' },
  { value: 'BILLING_MANAGER', label: 'Billing Manager', desc: 'Manage refunds and view analytics', sections: 'Dashboard, Refunds, Analytics' },
  { value: 'SUPPORT_AGENT', label: 'Support Agent', desc: 'Handle support tickets, users, and emails', sections: 'Dashboard, Users, Support, Notifications, Emails' },
  { value: 'PROPERTY_MANAGER', label: 'Property Manager', desc: 'Oversee property-related users', sections: 'Dashboard, Users' },
  { value: 'REPORTS_VIEWER', label: 'Reports Viewer', desc: 'View-only access to analytics and audit', sections: 'Dashboard, Analytics, Audit Log' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  invited: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  suspended: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
  revoked: 'bg-slate-100 text-slate-500 ring-1 ring-slate-300',
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-500',
  invited: 'bg-amber-500',
  suspended: 'bg-red-500',
  revoked: 'bg-slate-400',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-slate-900 text-white',
  BLOG_MANAGER: 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
  BILLING_MANAGER: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
  SUPPORT_AGENT: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
  PROPERTY_MANAGER: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/20',
  REPORTS_VIEWER: 'bg-slate-50 text-slate-600 ring-1 ring-slate-300',
};

type StatusFilter = 'all' | 'active' | 'invited' | 'suspended' | 'revoked';

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function StaffManager({ staff, superAdmins, currentAdminId }: Props) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showPerms, setShowPerms] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Invite form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');

  const clearMessages = () => { setError(null); setSuccess(null); };

  // Filtered staff
  const filteredStaff = useMemo(() => {
    let result = staff;
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [staff, statusFilter, search]);

  // Status counts
  const counts = useMemo(() => {
    const c = { all: staff.length, active: 0, invited: 0, suspended: 0, revoked: 0 };
    for (const s of staff) {
      if (s.status in c) (c as Record<string, number>)[s.status]++;
    }
    return c;
  }, [staff]);

  const handleInvite = async () => {
    clearMessages();
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteRole) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inviteName.trim(), email: inviteEmail.trim(), adminRole: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite');
      setSuccess('Invitation sent to ' + inviteEmail);
      setInviteName(''); setInviteEmail(''); setInviteRole('');
      setShowInvite(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'suspend' | 'activate' | 'revoke' | 'resend') => {
    clearMessages();
    setLoading(true);
    try {
      if (action === 'resend') {
        const res = await fetch('/api/admin/staff/resend-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to resend');
        setSuccess('Invitation resent successfully');
      } else if (action === 'revoke') {
        const res = await fetch('/api/admin/staff/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to revoke');
        setSuccess('Access revoked');
      } else {
        const status = action === 'suspend' ? 'suspended' : 'active';
        const res = await fetch('/api/admin/staff/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to ' + action);
        setSuccess('Staff ' + (action === 'suspend' ? 'suspended' : 'reactivated'));
      }
      setActiveMenu(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminRole: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change role');
      setSuccess('Role updated');
      setActiveMenu(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team & Roles</h1>
          <p className="text-sm text-slate-500">Manage platform staff, permissions, and access control</p>
        </div>
        <button onClick={() => { setShowInvite(true); clearMessages(); }}
          className="btn-primary flex items-center justify-center gap-2 text-sm">
          <UserPlus size={16} /> Invite Staff
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Staff</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{superAdmins.length + staff.length}</div>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{superAdmins.length + counts.active}</div>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pending
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{counts.invited}</div>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Suspended
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{counts.suspended}</div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-medium text-red-800 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X size={16} className="text-red-400" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 items-start">
          <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-medium text-emerald-800 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)}><X size={16} className="text-emerald-400" /></button>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Invite Staff Member</h2>
                <p className="text-xs text-slate-500 mt-0.5">They will receive an email to set their password</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input type="text" placeholder="e.g. Sunday Uka" value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input type="email" placeholder="sunday@example.com" value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)} className="input" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Assign Role</label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((r) => (
                    <label key={r.value}
                      className={'flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ' +
                        (inviteRole === r.value
                          ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-400'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')
                      }>
                      <input type="radio" name="role" value={r.value}
                        checked={inviteRole === r.value}
                        onChange={() => setInviteRole(r.value)}
                        className="mt-0.5 accent-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{r.label}</span>
                          <span className={'rounded-full px-2 py-0.5 text-[10px] font-bold ' + (ROLE_COLORS[r.value] || '')}>{r.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                        <p className="text-[11px] text-slate-400 mt-1">Access: {r.sections}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t bg-slate-50 px-6 py-4">
              <button onClick={() => setShowInvite(false)}
                className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleInvite} disabled={loading || !inviteName.trim() || !inviteEmail.trim() || !inviteRole}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> :
                  <><Mail size={16} /> Send Invitation</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admins */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-slate-900" />
            <h2 className="font-semibold text-slate-900">Super Admins</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {superAdmins.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Full platform access. Promoted from existing CashTraka users.</p>
        </div>
        <div className="divide-y">
          {superAdmins.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-6 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-emerald-400">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {a.name}
                    {a.id === currentAdminId && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">YOU</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{a.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + ROLE_COLORS.SUPER_ADMIN}>
                  SUPER ADMIN
                </span>
                <div className="hidden sm:block text-right">
                  <div className="text-[11px] text-slate-400">
                    {a.lastLoginAt ? 'Last active ' + timeAgo(a.lastLoginAt) : 'Never logged in'}
                  </div>
                  <div className="text-[11px] text-slate-400">Joined {formatDate(a.createdAt)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Members */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-slate-600" />
              <h2 className="font-semibold text-slate-900">Staff Members</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {staff.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters bar */}
        {staff.length > 0 && (
          <div className="border-b px-6 py-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search by name or email..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none" />
            </div>
            {/* Status tabs */}
            <div className="flex flex-wrap gap-1">
              {(['all', 'active', 'invited', 'suspended', 'revoked'] as StatusFilter[]).map((s) => {
                const count = counts[s];
                const isActive = statusFilter === s;
                return (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={'rounded-full px-3 py-1.5 text-xs font-semibold transition ' +
                      (isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                    }>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {staff.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Users size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No staff members yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Invite team members to help manage the CashTraka platform. Each staff member gets role-based access.
            </p>
            <button onClick={() => { setShowInvite(true); clearMessages(); }}
              className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
              <UserPlus size={14} /> Invite Your First Staff
            </button>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8 text-center">
            <Search size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No staff matching your filters</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Member</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Last Activity</th>
                    <th className="px-4 py-3 font-semibold">Added By</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ' +
                              (s.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                               s.status === 'invited' ? 'bg-amber-100 text-amber-800' :
                               'bg-slate-100 text-slate-500')
                            }>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <span className={'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ' + (STATUS_DOT[s.status] || 'bg-slate-400')} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (ROLE_COLORS[s.adminRole] || 'bg-slate-100 text-slate-600')}>
                          {roleLabel(s.adminRole)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ' + (STATUS_COLORS[s.status] || 'bg-slate-100')}>
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-slate-500">
                          {s.status === 'invited' ? (
                            <span className="flex items-center gap-1"><Clock size={11} /> Invited {timeAgo(s.createdAt)}</span>
                          ) : s.lastLoginAt ? (
                            timeAgo(s.lastLoginAt)
                          ) : 'Never'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-slate-500">{s.createdByName}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="relative inline-block">
                          <button onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                            <MoreVertical size={16} />
                          </button>
                          {activeMenu === s.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                              <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-xl border bg-white py-1.5 shadow-lg">
                                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Change Role
                                </div>
                                {ROLE_OPTIONS.map((r) => (
                                  <button key={r.value}
                                    onClick={() => handleRoleChange(s.id, r.value)}
                                    disabled={loading || s.adminRole === r.value}
                                    className={'w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 transition ' +
                                      (s.adminRole === r.value ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-700') +
                                      ' disabled:opacity-50'}>
                                    {s.adminRole === r.value && <CheckCircle size={12} />}
                                    {r.label}
                                  </button>
                                ))}
                                <div className="my-1.5 border-t mx-3" />
                                {s.status === 'invited' && (
                                  <button onClick={() => handleAction(s.id, 'resend')} disabled={loading}
                                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
                                    <RefreshCw size={12} /> Resend Invitation
                                  </button>
                                )}
                                {s.status === 'active' && (
                                  <button onClick={() => handleAction(s.id, 'suspend')} disabled={loading}
                                    className="w-full px-3 py-2 text-left text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 disabled:opacity-50">
                                    <Ban size={12} /> Suspend Access
                                  </button>
                                )}
                                {s.status === 'suspended' && (
                                  <button onClick={() => handleAction(s.id, 'activate')} disabled={loading}
                                    className="w-full px-3 py-2 text-left text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 disabled:opacity-50">
                                    <CheckCircle size={12} /> Reactivate
                                  </button>
                                )}
                                <button onClick={() => { if (confirm('Permanently revoke access for ' + s.name + '?')) handleAction(s.id, 'revoke'); }} disabled={loading}
                                  className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50">
                                  <Trash2 size={12} /> Revoke Access
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {filteredStaff.map((s) => (
                <div key={s.id} className="px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ' +
                          (s.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                           s.status === 'invited' ? 'bg-amber-100 text-amber-800' :
                           'bg-slate-100 text-slate-500')
                        }>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ' + (STATUS_DOT[s.status] || 'bg-slate-400')} />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.email}</div>
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
                        <MoreVertical size={16} />
                      </button>
                      {activeMenu === s.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                          <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border bg-white py-1.5 shadow-lg">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Change Role</div>
                            {ROLE_OPTIONS.map((r) => (
                              <button key={r.value} onClick={() => handleRoleChange(s.id, r.value)}
                                disabled={loading || s.adminRole === r.value}
                                className={'w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2 ' +
                                  (s.adminRole === r.value ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-700') +
                                  ' disabled:opacity-50'}>
                                {s.adminRole === r.value && <CheckCircle size={12} />}
                                {r.label}
                              </button>
                            ))}
                            <div className="my-1 border-t mx-3" />
                            {s.status === 'invited' && (
                              <button onClick={() => handleAction(s.id, 'resend')} disabled={loading}
                                className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
                                <RefreshCw size={12} /> Resend Invitation
                              </button>
                            )}
                            {s.status === 'active' && (
                              <button onClick={() => handleAction(s.id, 'suspend')} disabled={loading}
                                className="w-full px-3 py-2 text-left text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 disabled:opacity-50">
                                <Ban size={12} /> Suspend
                              </button>
                            )}
                            {s.status === 'suspended' && (
                              <button onClick={() => handleAction(s.id, 'activate')} disabled={loading}
                                className="w-full px-3 py-2 text-left text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 disabled:opacity-50">
                                <CheckCircle size={12} /> Reactivate
                              </button>
                            )}
                            <button onClick={() => { if (confirm('Revoke access for ' + s.name + '?')) handleAction(s.id, 'revoke'); }} disabled={loading}
                              className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50">
                              <Trash2 size={12} /> Revoke Access
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (ROLE_COLORS[s.adminRole] || 'bg-slate-100 text-slate-600')}>
                      {roleLabel(s.adminRole)}
                    </span>
                    <span className={'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ' + (STATUS_COLORS[s.status] || 'bg-slate-100')}>
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-auto">
                      {s.status === 'invited' ? 'Invited ' + timeAgo(s.createdAt) :
                       s.lastLoginAt ? timeAgo(s.lastLoginAt) : 'Added ' + formatDate(s.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Permissions Reference, collapsible */}
      <div className="rounded-xl border bg-white shadow-sm">
        <button onClick={() => setShowPerms(!showPerms)}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900 text-sm">Role Permissions Reference</h2>
          </div>
          {showPerms ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>
        {showPerms && (
          <>
            <div className="border-t overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Section</th>
                    <th className="px-3 py-3 font-semibold text-center">Blog</th>
                    <th className="px-3 py-3 font-semibold text-center">Billing</th>
                    <th className="px-3 py-3 font-semibold text-center">Support</th>
                    <th className="px-3 py-3 font-semibold text-center">Property</th>
                    <th className="px-3 py-3 font-semibold text-center">Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-600">
                  {[
                    ['Dashboard', true, true, true, true, true],
                    ['Users', false, false, true, true, false],
                    ['Roles', false, false, false, false, false],
                    ['Support', false, false, true, false, false],
                    ['Refunds', false, true, false, false, false],
                    ['Notifications', false, false, true, false, false],
                    ['Analytics', false, true, false, false, true],
                    ['Email Logs', false, false, true, false, false],
                    ['Blog', true, false, false, false, false],
                    ['Audit Log', false, false, false, false, true],
                    ['Settings', false, false, false, false, false],
                  ].map(([section, ...perms]) => (
                    <tr key={section as string} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{section as string}</td>
                      {(perms as boolean[]).map((allowed, i) => (
                        <td key={i} className="px-3 py-2.5 text-center">
                          {allowed ?
                            <CheckCircle size={14} className="inline text-emerald-500" /> :
                            <span className="text-slate-300">&mdash;</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 text-xs text-slate-500 border-t bg-slate-50">
              Super Admins have access to all sections. The Roles and Settings sections are Super Admin only.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
