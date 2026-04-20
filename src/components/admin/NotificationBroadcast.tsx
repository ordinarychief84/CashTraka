'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Send,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { formatDate } from '@/lib/format';

type BroadcastHistory = {
  id: string;
  adminName: string;
  details: {
    title?: string;
    message?: string;
    type?: string;
    targetCount?: number;
  } | null;
  createdAt: Date;
};

type User = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  broadcastHistory: BroadcastHistory[];
  stats: {
    totalSent: number;
    unread: number;
  };
  availableUsers: User[];
};

const typeColors = {
  info: { bg: 'bg-brand-50', badge: 'bg-brand-100 text-brand-800', icon: 'text-brand-600' },
  warning: { bg: 'bg-owed-50', badge: 'bg-owed-100 text-owed-800', icon: 'text-owed-600' },
  success: { bg: 'bg-success-50', badge: 'bg-success-100 text-success-800', icon: 'text-success-600' },
  error: { bg: 'bg-red-50', badge: 'bg-red-100 text-red-800', icon: 'text-red-600' },
};

export function NotificationBroadcast({ broadcastHistory, stats, availableUsers }: Props) {
  const router = useRouter();
  const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    return availableUsers.filter(
      (user) =>
        !selectedUsers.find((u) => u.id === user.id) &&
        (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, selectedUsers, availableUsers]);

  function toggleUser(user: User) {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  }

  function removeUser(userId: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    if (targetMode === 'specific' && selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          type,
          broadcast: true,
          userIds: targetMode === 'specific' ? selectedUsers.map((u) => u.id) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to send notification');
      }

      setSuccess(
        `Notification sent to ${
          targetMode === 'all' ? 'all users' : `${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`
        }`
      );
      setTitle('');
      setMessage('');
      setType('info');
      setSelectedUsers([]);
      setSearchQuery('');
      setTargetMode('all');

      setTimeout(() => router.refresh(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Sent', value: stats.totalSent, icon: Bell },
          { label: 'Unread', value: stats.unread, icon: AlertCircle },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-slate-100 p-3">
                <stat.icon size={24} className="text-slate-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Broadcast Form */}
        <div className="col-span-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-slate-900">Send Notification</h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Notification message"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['info', 'warning', 'success', 'error'] as const).map((t) => {
                    const colors = typeColors[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          type === t
                            ? `${colors.badge} ring-2 ring-offset-2`
                            : `${colors.bg} text-slate-600 hover:${colors.badge}`
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Send To
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={targetMode === 'all'}
                      onChange={() => {
                        setTargetMode('all');
                        setSelectedUsers([]);
                        setSearchQuery('');
                      }}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">All users</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={targetMode === 'specific'}
                      onChange={() => setTargetMode('specific')}
                      className="cursor-pointer"
                    />
                    <span className="text-sm text-slate-700">Specific users</span>
                  </label>
                </div>
              </div>

              {/* User Selection */}
              {targetMode === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">
                    Search Users
                  </label>

                  {/* Search Box */}
                  <div className="relative mb-2">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>

                  {/* Selected Users (Chips) */}
                  {selectedUsers.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                        >
                          {user.name}
                          <button
                            onClick={() => removeUser(user.id)}
                            className="hover:text-slate-200"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* User List Dropdown */}
                  {filteredUsers.length > 0 && (
                    <div className="border border-slate-300 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => toggleUser(user)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 border-b border-slate-200 last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery && filteredUsers.length === 0 && selectedUsers.length < availableUsers.length && (
                    <div className="text-sm text-slate-500 py-2">No users found</div>
                  )}
                </div>
              )}

              {/* Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-success-50 border border-success-200 rounded-lg text-sm text-success-700 flex items-start gap-2">
                  <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {success}
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={loading || !title.trim() || !message.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send Notification
              </button>
            </div>
          </div>
        </div>

        {/* Broadcast History */}
        <div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Broadcasts</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {broadcastHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No broadcasts sent yet
                </div>
              ) : (
                broadcastHistory.map((broadcast) => (
                  <div
                    key={broadcast.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-medium text-slate-900 text-sm break-words">
                          {broadcast.details?.title || 'Untitled'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {broadcast.adminName}
                        </div>
                      </div>
                      {broadcast.details?.type && (
                        <span className={`text-xs font-medium rounded px-1.5 py-0.5 flex-shrink-0 ${
                          typeColors[broadcast.details.type as keyof typeof typeColors]?.badge || 'bg-slate-100'
                        }`}>
                          {broadcast.details.type}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(broadcast.createdAt)}
                    </div>
                    {broadcast.details?.targetCount && (
                      <div className="text-xs text-slate-600 mt-1">
                        {broadcast.details.targetCount} user{broadcast.details.targetCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
