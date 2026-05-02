'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Square, Pencil, Trash2 } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';

type Props = {
  staffId: string;
  staffName: string;
  /** If they have an open clock entry (no clockOut), this is its id. */
  openEntryId: string | null;
};

export function ClockActions({ staffId, staffName, openEntryId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isClockedIn = Boolean(openEntryId);

  async function clockIn() {
    setBusy(true);
    try {
      const res = await fetch('/api/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Could not clock in');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    if (!openEntryId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/clock/${openEntryId}`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Could not clock out');
      else alert(`${staffName} clocked out, ${data.hoursWorked}h today`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const menuActions: RowMenuAction[] = [
    {
      label: 'Edit member',
      icon: <Pencil size={16} />,
      onClick: () => router.push(`/team/${staffId}/edit`),
    },
    {
      label: 'Remove',
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: async () => {
        if (!confirm(`Remove ${staffName} from your team?`)) return;
        await fetch(`/api/team/${staffId}`, { method: 'DELETE' });
        router.refresh();
      },
    },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {isClockedIn ? (
        <button
          type="button"
          onClick={clockOut}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-owed-500 bg-owed-50 px-3 py-2 text-xs font-bold text-owed-700 hover:bg-owed-100"
        >
          <Square size={12} fill="currentColor" />
          Clock out
        </button>
      ) : (
        <button
          type="button"
          onClick={clockIn}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100"
        >
          <Play size={12} fill="currentColor" />
          Clock in
        </button>
      )}
      <RowMenu actions={menuActions} />
    </div>
  );
}
