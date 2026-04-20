'use client';

import { useState } from 'react';
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
  { value: 'BLOG_MANAGER', label: 'Blog Manager', desc: 'Create, edit, and publish blog posts' },
  { value: 'BILLING_MANAGER', label: 'Billing Manager', desc: 'Manage refunds and view analytics' },
  { value: 'SUPPORT_AGENT', label: 'Support Agent', desc: 'Handle support tickets and users' },
  { value: 'PROPERTY_MANAGER', label: 'Property Manager', desc: 'Oversee property-related users' },
  { value: 'REPORTS_VIEWER', label: 'Reports Viewer', desc: 'View-only access to analytics and audit' },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  invited: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-800',
  revoked: 'bg-slate-100 text-slate-500',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-slate-900 text-lime-400',
  BLOG_MANAGER: 'bg-purple-100 text-purple-800',
  BILLING_MANAGER: 'bg-blue-100 text-blue-800',
  SUPPORT_AGENT: 'bg-orange-100 text-orange-800',
  PROPERTY_MANAGER: 'bg-teal-100 text-teal-800',
  REPORTS_VIEWER: 'bg-slate-100 text-slate-700',
};

function roleLabel(role: string) {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function StaffManager({ staff, superAdmins, currentAdminId }: Props) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Invite form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');

  const clearMessages = () => { setError(null); setSuccess(null); };

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
      setSuccess(`Invitation sent to ${inviteEmail}`);
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
        setSuccess('Invitation resent');
      } else if (action === 'revoke') {
        const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to revoke');
        setSuccess('Access revoked');
      } else {
        const status = action === 'suspend' ? 'suspended' : 'active';
        const res = await fetch(`/api/admin/staff/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
        setSuccess(`Staff ${action === 'suspend' ? 'suspended' : 'reactivated'}`);
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
      const res = await fetch(`/api/admin/staff/${id}`, {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Role Management</h1>
          <p className="text-sm text-slate-500">Manage platform staff and their access permissions</p>
        </div>
        <button onClick={() => { setShowInvite(true); clearMessages(); }}
          className="btn-primary flex items-center gap-2 text-sm">
          <UserPlus size={16} /> Invite Staff
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <p className="font-semibold text-red-900 flex-1">{error}</p>
          <button onClick={() => setError(null)}><X size={16} className="text-red-400" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex gap-3">
          <CheckCircle className="text-green-600 shrink-0" size={20} />
          <p className="font-semibold text-green-900 flex-1">{success}</p>
          <button onClick={() => setSuccess(null)}><X size={16} className="text-green-400" /></button>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Invite Staff Member</h2>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input type="text" placeholder="e.g. Jane Doe" value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                <input type="email" placeholder="jane@example.com" value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Assign Role</label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((r) => (
                    <label key={r.value}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                        inviteRole === r.value ? 'border-lime-400 bg-lime-50' : 'border-slate-200 hover:border-slate-300'
                      }`}>
                      <input type="radio" name="role" value={r.value}
                        checked={inviteRole === r.value}
                        onChange={() => setInviteRole(r.value)}
                        className="mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{r.label}</div>
                        <div className="text-xs text-slate-500">{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border p-3 text-xs text-slate-600">
                <strong>How it works:</strong> An email will be sent to the staff member with a link
                to set their password. Once they accept, they can log in and access only the sections
                their role allows.
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvite(false)}
                  className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={handleInvite} disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> :
                    <><Mail size={16} /> Send Invitation</>}
                </button>
              </div>
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
            <span className="text-xs text-slate-500">Full platform access</span>
          </div>
        </div>
        <div className="divide-y">
          {superAdmins.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-lime-400">
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {a.name}
                    {a.id === currentAdminId && (
                      <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-lime-400">YOU</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{a.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS.SUPER_ADMIN}`}>
                  SUPER ADMIN
                </span>
                <span className="text-xs text-slate-500">
                  {a.lastLoginAt ? timeAgo(a.lastLoginAt) : 'Never logged in'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Members */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-slate-600" />
            <h2 className="font-semibold text-slate-900">Staff Members</h2>
            <span className="text-xs text-slate-500">{staff.length} member{staff.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {staff.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No staff members yet</p>
            <p className="text-xs text-slate-500 mt-1">Invite your first team member to get started</p>
            <button onClick={() => { setShowInvite(true); clearMessages(); }}
              className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
              <UserPlus size={14} /> Invite Staff
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                    s.status === 'active' ? 'bg-lime-100 text-lime-800' :
                    s.status === 'invited' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_COLORS[s.adminRole] || 'bg-slate-100 text-slate-600'}`}>
                    {roleLabel(s.adminRole)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[s.status] || 'bg-slate-100'}`}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </span>
                  <span className="hidden text-xs text-slate-400 sm:block">
                    {s.status === 'invited' ? `Invited ${timeAgo(s.createdAt)}` :
                     s.lastLoginAt ? timeAgo(s.lastLoginAt) : 'Never'}
                  </span>

                  {/* Actions menu */}
                  <div className="relative">
                    <button onClick={() => setActiveMenu(activeMenu === s.id ? null : s.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === s.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border bg-white py-1 shadow-lg">
                        {/* Role change */}
                        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Change Role
                        </div>
                        {ROLE_OPTIONS.map((r) => (
                          <button key={r.value}
                            onClick={() => handleRoleChange(s.id, r.value)}
                            disabled={loading || s.adminRole === r.value}
                            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2 ${
                              s.adminRole === r.value ? 'text-lime-700 font-semibold bg-lime-50' : 'text-slate-700'
                            } disabled:opacity-50`}>
                            {s.adminRole === r.value && <CheckCircle size={12} />}
                            {r.label}
                          </button>
                        ))}
                        <div className="my-1 border-t" />
                        {/* Actions */}
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
                            className="w-full px-3 py-2 text-left text-xs text-green-700 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50">
                            <CheckCircle size={12} /> Reactivate
                          </button>
                        )}
                        <button onClick={() => { if (confirm('Revoke access for ' + s.name + '?')) handleAction(s.id, 'revoke'); }} disabled={loading}
                          className="w-full px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50">
                          <Trash2 size={12} /> Revoke Access
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permissions Reference */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-slate-900">Role Permissions Reference</h2>
        </div>
        <div className="overflow-x-auto">
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
                <tr key={section as string}>
                  <td className="px-4 py-2 font-medium text-slate-900">{section as string}</td>
                  {(perms as boolean[]).map((allowed, i) => (
                    <td key={i} className="px-3 py-2 text-center">
                      {allowed ?
                        <CheckCircle size={14} className="inline text-green-500" /> :
                        <span className="text-slate-300">&mdash;</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 text-xs text-slate-500 border-t">
          Super Admins have access to all sections. The Roles section is Super Admin only.
        </div>
      </div>
    </div>
  );
}
