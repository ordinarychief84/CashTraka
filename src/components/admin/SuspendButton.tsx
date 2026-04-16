'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PauseCircle, PlayCircle } from 'lucide-react';

export function SuspendButton({
  userId,
  isSuspended,
}: {
  userId: string;
  isSuspended: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handle() {
    const reason = prompt(
      isSuspended ? 'Reason for reactivation?' : 'Reason for suspension?',
    );
    if (reason === null) return; // cancelled
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/${isSuspended ? 'reactivate' : 'suspend'}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Could not update');
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className={
        isSuspended
          ? 'inline-flex items-center gap-1.5 rounded-lg border border-success-500 bg-success-50 px-3 py-2 text-xs font-bold text-success-700 hover:bg-success-100'
          : 'inline-flex items-center gap-1.5 rounded-lg border border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100'
      }
    >
      {isSuspended ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
      {busy ? 'Please wait…' : isSuspended ? 'Reactivate' : 'Suspend'}
    </button>
  );
}
