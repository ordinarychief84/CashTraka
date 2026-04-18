'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, Trash2, UserPlus } from 'lucide-react';
import { formatDate, timeAgo } from '@/lib/format';

type Admin = {
  id: string;
  name: string;
  email: string;
  lastLoginAt: Date | null;
  createdAt: Date;
};

type User = {
  id: string;
  name: string;
  email: string;
  businessName: string | null;
};

type Props = {
  admins: Admin[];
  users: User[];
  currentAdminId: string;
};

export function RoleManager({ admins, users, currentAdminId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [demotion, setDemotion] = useState<{ adminId: string; showing: boolean }>({ adminId: '', showing: false });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Promote state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [promoteReason, setPromoteReason] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.businessName?.toLowerCase().includes(q),
    );
  }, [searchQuery, users]);

  const handleDemote = async (adminId: string) => {
    if (!confirm('Are you sure? This will remove admin access from this user.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/roles/${adminId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to demote user');
      }

      setSuccess('Admin access revoked successfully');
      setDemotion({ adminId: '', showing: false });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to demote user');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedUserId) {
      setError('Please select a user to promote');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          reason: promoteReason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to promote user');
      }

      setSuccess('User promoted to admin successfully');
      setSelectedUserId('');
      setPromoteReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div className="flex-1">
            <p className="font-semibold text-red-900">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex gap-3">
          <CheckCircle className="text-green-600 shrink-0" size={20} />
          <div className="flex-1">
            <p className="font-semibold text-green-900">{success}</p>
          </div>
        </div>
      )}

      {/* Current Admins Section */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Current Admins</h2>
        {admins.length === 0 ? (
          <p className="text-sm text-slate-500">No admins assigned yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Last Login</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {admins.map((a) => {
                  const isSelf = a.id === currentAdminId;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {a.name}
                        {isSelf && (
                          <span className="ml-2 inline-block rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-lime-400">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.email}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {a.lastLoginAt ? timeAgo(a.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        {isSelf ? (
                          <button
                            disabled
                            className="text-xs font-semibold text-slate-400 cursor-not-allowed"
                          >
                            Demote
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setDemotion({ adminId: a.id, showing: true })}
                              className="text-xs font-semibold text-red-600 hover:text-red-700"
                            >
                              Demote
                            </button>
                            {demotion.showing && demotion.adminId === a.id && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => handleDemote(a.id)}
                                  disabled={loading}
                                  className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                                >
                                  {loading ? 'Revoking...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setDemotion({ adminId: '', showing: false })}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promote User Section */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Promote User to Admin</h2>
        <div className="space-y-4">
          {/* Search/select user */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Search & Select User
            </label>
            <input
              type="text"
              placeholder="Type name, email, or business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input mb-2"
            />

            {filteredUsers.length > 0 && (
              <div className="max-h-48 overflow-y-auto border rounded-lg bg-slate-50">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setSearchQuery('');
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 border-b transition ${
                      selectedUserId === u.id ? 'bg-lime-50 border-l-4 border-l-lime-400' : ''
                    }`}
                  >
                    <div className="font-semibold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-600">{u.email}</div>
                    {u.businessName && (
                      <div className="text-xs text-slate-500">{u.businessName}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {searchQuery && filteredUsers.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500 border rounded-lg bg-slate-50">
                No users match your search
              </div>
            )}

            {selectedUserId && !searchQuery && (
              <div className="p-3 rounded-lg bg-lime-50 border border-lime-200 flex items-start gap-2">
                <CheckCircle className="text-lime-600 shrink-0 mt-0.5" size={18} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-lime-900">
                    {users.find((u) => u.id === selectedUserId)?.name}
                  </div>
                  <div className="text-xs text-lime-700">
                    {users.find((u) => u.id === selectedUserId)?.email}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserId('')}
                  className="text-xs font-semibold text-lime-600 hover:text-lime-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Reason (optional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Reason (optional)
            </label>
            <textarea
              placeholder="Why are you promoting this user?"
              value={promoteReason}
              onChange={(e) => setPromoteReason(e.target.value)}
              className="input min-h-20"
            />
          </div>

          {/* Promote button */}
          <button
            onClick={handlePromote}
            disabled={loading || !selectedUserId}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Promoting...
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Promote to Admin
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
