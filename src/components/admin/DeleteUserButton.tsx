'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle } from 'lucide-react';

export function DeleteUserButton({
  userId,
  userName,
  userEmail,
}: {
  userId: string;
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirm !== 'DELETE') {
      setError('Type DELETE to confirm');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not delete user');
        return;
      }
      router.push('/admin/users');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
      >
        <Trash2 size={14} />
        Delete user
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Delete user account</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              You are about to permanently delete <strong>{userName}</strong> ({userEmail}).
              All their data — customers, payments, debts, invoices, receipts, and settings — will be removed.
            </div>

            <label className="mb-3 block">
              <span className="text-xs font-semibold text-slate-700">Reason (for audit log)</span>
              <input
                className="input mt-1"
                placeholder="e.g. spam account, user request, duplicate"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>

            <label className="mb-3 block">
              <span className="text-xs font-semibold text-slate-700">
                Type <strong>DELETE</strong> to confirm
              </span>
              <input
                className="input mt-1 font-mono"
                placeholder="DELETE"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>

            {error && (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy || confirm !== 'DELETE'}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? 'Deleting...' : 'Permanently delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setConfirm('');
                  setReason('');
                  setError(null);
                }}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
