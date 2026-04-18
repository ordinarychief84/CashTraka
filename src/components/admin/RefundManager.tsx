'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  RefreshCw,
  Clock,
  XCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/format';

type Refund = {
  id: string;
  userId: string;
  paymentAttemptId: string | null;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  adminNote: string | null;
  processedBy: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string; email: string };
  processor: { name: string } | null;
  paymentAttempt: { targetPlan: string; amount: number; paystackReference: string } | null;
};

type PaymentAttempt = {
  id: string;
  userId: string;
  targetPlan: string;
  amount: number;
  currency: string;
  paystackReference: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string; email: string };
};

type Props = {
  refunds: Refund[];
  stats: {
    pending: number;
    approved: number;
    processed: number;
    rejected: number;
  };
  paymentAttempts: PaymentAttempt[];
};

const statusColors = {
  pending: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  approved: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  processed: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
};

function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return <Clock size={16} className="text-amber-600" />;
    case 'approved':
      return <CheckCircle size={16} className="text-blue-600" />;
    case 'processed':
      return <CheckCircle size={16} className="text-green-600" />;
    case 'rejected':
      return <XCircle size={16} className="text-red-600" />;
    default:
      return null;
  }
}

export function RefundManager({ refunds, stats, paymentAttempts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Processing refund state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('approved');
  const [processingNote, setProcessingNote] = useState('');

  // Create refund state
  const [createMode, setCreateMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [createAmount, setCreateAmount] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const uniqueUsers = useMemo(() => {
    const users = paymentAttempts.map((pa) => ({ id: pa.userId, ...pa.user }));
    const seen = new Set();
    return users.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [paymentAttempts]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return uniqueUsers;
    const q = userSearch.toLowerCase();
    return uniqueUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [userSearch, uniqueUsers]);

  const userPayments = useMemo(() => {
    if (!selectedUserId) return [];
    return paymentAttempts.filter((pa) => pa.userId === selectedUserId);
  }, [selectedUserId, paymentAttempts]);

  const handleProcessRefund = async (refundId: string) => {
    if (!processingStatus) {
      setError('Please select a status');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: processingStatus,
          adminNote: processingNote || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to process refund');
      }

      setSuccess('Refund processed successfully');
      setProcessingId(null);
      setProcessingStatus('approved');
      setProcessingNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRefund = async () => {
    if (!selectedUserId || !createAmount || !createReason) {
      setError('Please fill in all required fields');
      return;
    }

    const amount = parseInt(createAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          paymentAttemptId: selectedPaymentId || undefined,
          amount,
          reason: createReason,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create refund');
      }

      setSuccess('Refund created successfully');
      setCreateMode(false);
      setSelectedUserId('');
      setSelectedPaymentId('');
      setCreateAmount('');
      setCreateReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create refund');
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
          <p className="text-sm font-semibold text-red-900">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex gap-3">
          <CheckCircle className="text-green-600 shrink-0" size={20} />
          <p className="text-sm font-semibold text-green-900">{success}</p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-amber-600" size={20} />
            <span className="text-xs font-semibold text-slate-500 uppercase">Pending</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.pending}</div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="text-blue-600" size={20} />
            <span className="text-xs font-semibold text-slate-500 uppercase">Approved</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.approved}</div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="text-green-600" size={20} />
            <span className="text-xs font-semibold text-slate-500 uppercase">Processed</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.processed}</div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="text-red-600" size={20} />
            <span className="text-xs font-semibold text-slate-500 uppercase">Rejected</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.rejected}</div>
        </div>
      </div>

      {/* Refunds Table */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Refunds</h2>
        {refunds.length === 0 ? (
          <p className="text-sm text-slate-500">No refunds yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Processed By</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {refunds.map((r) => {
                  const colors = statusColors[r.status as keyof typeof statusColors] || statusColors.pending;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{r.user.name}</div>
                        <div className="text-xs text-slate-500">{r.user.email}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatNaira(r.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.reason}</td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.badge}`}>
                          {getStatusIcon(r.status)}
                          {r.status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.processor ? r.processor.name : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {(r.status === 'pending' || r.status === 'approved') && (
                          <>
                            <button
                              onClick={() => {
                                setProcessingId(r.id);
                                setProcessingStatus(r.status === 'pending' ? 'approved' : 'processed');
                                setProcessingNote('');
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Process
                            </button>
                            {processingId === r.id && (
                              <div className="mt-2 space-y-2 p-2 bg-slate-50 rounded border">
                                <select
                                  value={processingStatus}
                                  onChange={(e) => setProcessingStatus(e.target.value)}
                                  className="input text-xs"
                                >
                                  <option value="approved">Approve</option>
                                  <option value="processed">Process</option>
                                  <option value="rejected">Reject</option>
                                </select>
                                <textarea
                                  placeholder="Admin note..."
                                  value={processingNote}
                                  onChange={(e) => setProcessingNote(e.target.value)}
                                  className="input text-xs min-h-16"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleProcessRefund(r.id)}
                                    disabled={loading}
                                    className="flex-1 btn-primary text-xs disabled:opacity-50"
                                  >
                                    {loading ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setProcessingId(null)}
                                    className="flex-1 btn-secondary text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
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

      {/* Create Refund Section */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Create New Refund</h2>
          <button
            onClick={() => setCreateMode(!createMode)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            {createMode ? 'Cancel' : 'Create'}
          </button>
        </div>

        {createMode && (
          <div className="space-y-4">
            {/* Select user */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select User
              </label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input mb-2"
              />

              {filteredUsers.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-lg bg-slate-50">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setUserSearch('');
                        setSelectedPaymentId('');
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 border-b transition ${
                        selectedUserId === u.id ? 'bg-lime-50' : ''
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Select payment attempt (optional) */}
            {selectedUserId && userPayments.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Link to Payment Attempt (optional)
                </label>
                <select
                  value={selectedPaymentId}
                  onChange={(e) => setSelectedPaymentId(e.target.value)}
                  className="input"
                >
                  <option value="">None</option>
                  {userPayments.map((pa) => (
                    <option key={pa.id} value={pa.id}>
                      {pa.targetPlan} - {formatNaira(pa.amount)} - {formatDate(pa.createdAt)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Amount in Naira
              </label>
              <input
                type="number"
                placeholder="0"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                min="1"
                step="100"
                className="input"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason
              </label>
              <textarea
                placeholder="Reason for refund..."
                value={createReason}
                onChange={(e) => setCreateReason(e.target.value)}
                className="input min-h-20"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleCreateRefund}
              disabled={loading || !selectedUserId || !createAmount || !createReason}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  Create Refund
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
