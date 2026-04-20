'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDate } from '@/lib/format';

type Ticket = {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string; email: string };
  assignee: { name: string } | null;
  replies: Array<{
    id: string;
    message: string;
    isAdmin: boolean;
    createdAt: Date;
    user: { name: string };
  }>;
  _count: { replies: number };
};

type Admin = {
  id: string;
  name: string;
};

type Props = {
  tickets: Ticket[];
  admins: Admin[];
  stats: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  currentAdminId: string;
};

const priorityColors = {
  low: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' },
  medium: { bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-700', badge: 'bg-brand-100 text-brand-800' },
  high: { bg: 'bg-owed-50', border: 'border-owed-200', text: 'text-owed-700', badge: 'bg-owed-100 text-owed-800' },
  urgent: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
};

const statusColors = {
  open: { bg: 'bg-owed-50', badge: 'bg-owed-100 text-owed-800' },
  in_progress: { bg: 'bg-brand-50', badge: 'bg-brand-100 text-brand-800' },
  resolved: { bg: 'bg-success-50', badge: 'bg-success-100 text-success-800' },
  closed: { bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-800' },
};

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'urgent':
      return <AlertCircle size={16} className="text-red-600" />;
    case 'high':
      return <AlertCircle size={16} className="text-owed-600" />;
    case 'medium':
      return <MessageSquare size={16} className="text-brand-600" />;
    case 'low':
      return <MessageSquare size={16} className="text-slate-600" />;
    default:
      return null;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'open':
      return <Clock size={16} className="text-owed-600" />;
    case 'in_progress':
      return <Loader2 size={16} className="text-brand-600" />;
    case 'resolved':
      return <CheckCircle size={16} className="text-success-600" />;
    case 'closed':
      return <CheckCircle size={16} className="text-slate-600" />;
    default:
      return null;
  }
}

export function SupportManager({ tickets, admins, stats, currentAdminId }: Props) {
  const router = useRouter();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedTicket = selectedTicketId ? tickets.find(t => t.id === selectedTicketId) : null;

  // Filter tickets based on status
  const filteredTickets = filterStatus === 'All'
    ? tickets
    : tickets.filter(t => {
        if (filterStatus === 'Open') return t.status === 'open';
        if (filterStatus === 'In Progress') return t.status === 'in_progress';
        if (filterStatus === 'Resolved') return t.status === 'resolved';
        return false;
      });

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;

    setReplyLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to send reply');
      }

      setSuccess('Reply sent successfully');
      setReplyText('');
      setTimeout(() => {
        router.refresh();
        setSelectedTicketId(null);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  }

  async function handleUpdateTicket(field: string, value: string) {
    if (!selectedTicket) return;

    setUpdateLoading(field);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || 'Failed to update ticket');
      }

      setSuccess('Ticket updated successfully');
      setTimeout(() => router.refresh(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setUpdateLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open', count: stats.open, color: 'amber' },
          { label: 'In Progress', count: stats.inProgress, color: 'blue' },
          { label: 'Resolved', count: stats.resolved, color: 'green' },
          { label: 'Closed', count: stats.closed, color: 'slate' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.count}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="col-span-2">
          <div className="rounded-xl border bg-white shadow-sm">
            {/* Filter Tabs */}
            <div className="border-b px-6 py-4">
              <div className="flex gap-2">
                {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      filterStatus === status
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket Rows */}
            <div className="divide-y">
              {filteredTickets.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  No tickets found
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const priorityColor = priorityColors[ticket.priority as keyof typeof priorityColors];
                  const statusColor = statusColors[ticket.status as keyof typeof statusColors];
                  const isSelected = selectedTicketId === ticket.id;

                  return (
                    <button
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(isSelected ? null : ticket.id)}
                      className={`w-full px-6 py-4 text-left transition-colors hover:bg-slate-50 ${
                        isSelected ? 'bg-slate-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-slate-900 truncate">{ticket.subject}</h3>
                            <span className={`inline-flex items-center gap-1 rounded-full ${priorityColor.badge} px-2 py-1 text-xs font-medium flex-shrink-0`}>
                              {getPriorityIcon(ticket.priority)}
                              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full ${statusColor.badge} px-2 py-1 text-xs font-medium flex-shrink-0`}>
                              {getStatusIcon(ticket.status)}
                              {ticket.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 mb-2">
                            {ticket.user.name} ({ticket.user.email})
                          </div>
                          <div className="text-xs text-slate-500">
                            {ticket._count.replies} replies • Created {formatDate(ticket.createdAt)}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <ChevronUp size={20} className="text-slate-400" />
                          ) : (
                            <ChevronDown size={20} className="text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isSelected && (
                        <div className="mt-6 border-t pt-6">
                          <div className="space-y-4">
                            {/* Description */}
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900 mb-2">Description</h4>
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">{ticket.description}</p>
                            </div>

                            {/* Replies */}
                            {ticket.replies.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">Thread ({ticket.replies.length})</h4>
                                <div className="space-y-3 mb-4">
                                  {ticket.replies.map((reply) => (
                                    <div
                                      key={reply.id}
                                      className={`rounded-lg border-l-4 px-4 py-3 text-sm ${
                                        reply.isAdmin
                                          ? 'border-l-success-400 bg-success-50'
                                          : 'border-l-slate-300 bg-slate-50'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-slate-900">
                                          {reply.user.name}
                                          {reply.isAdmin && <span className="ml-2 text-xs font-semibold text-success-600">ADMIN</span>}
                                        </span>
                                        <span className="text-xs text-slate-500">{formatDate(reply.createdAt)}</span>
                                      </div>
                                      <p className="text-slate-700 whitespace-pre-wrap">{reply.message}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Reply Form */}
                            <div className="border-t pt-4">
                              <label className="block text-sm font-medium text-slate-900 mb-2">
                                Add Reply
                              </label>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your response..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                                rows={3}
                              />
                              <button
                                onClick={handleReply}
                                disabled={replyLoading || !replyText.trim()}
                                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {replyLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Send size={16} />
                                )}
                                Send Reply
                              </button>
                            </div>

                            {/* Status/Priority/Assignee Updates */}
                            <div className="border-t pt-4 space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-slate-900 mb-1">
                                  Status
                                </label>
                                <select
                                  value={ticket.status}
                                  onChange={(e) => handleUpdateTicket('status', e.target.value)}
                                  disabled={updateLoading === 'status'}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                >
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                  <option value="closed">Closed</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-900 mb-1">
                                  Priority
                                </label>
                                <select
                                  value={ticket.priority}
                                  onChange={(e) => handleUpdateTicket('priority', e.target.value)}
                                  disabled={updateLoading === 'priority'}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-900 mb-1">
                                  Assigned To
                                </label>
                                <select
                                  value={ticket.assignedTo || ''}
                                  onChange={(e) => handleUpdateTicket('assignedTo', e.target.value || 'null')}
                                  disabled={updateLoading === 'assignedTo'}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                >
                                  <option value="">Unassigned</option>
                                  {admins.map((admin) => (
                                    <option key={admin.id} value={admin.id}>
                                      {admin.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Side Panel - Selected Ticket Summary */}
        <div>
          {selectedTicket && (
            <div className="rounded-xl border bg-white p-6 shadow-sm sticky top-4">
              <h3 className="font-semibold text-slate-900 mb-4">Ticket Info</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500 mb-1">ID</div>
                  <div className="text-slate-900 font-mono text-xs">{selectedTicket.id}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500 mb-1">Customer</div>
                  <div className="text-slate-900">{selectedTicket.user.name}</div>
                  <div className="text-slate-600">{selectedTicket.user.email}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500 mb-1">Assigned To</div>
                  <div className="text-slate-900">{selectedTicket.assignee?.name || 'Unassigned'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500 mb-1">Created</div>
                  <div className="text-slate-900">{formatDate(selectedTicket.createdAt)}</div>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 p-3 bg-success-50 border border-success-200 rounded-lg text-sm text-success-700">
                  {success}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
