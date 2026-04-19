'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';

export function StartChecklistButton({ checklistId }: { checklistId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch(`/api/checklists/${checklistId}/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not start');
        return;
      }
      router.push(`/checklists/${checklistId}/run?runId=${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-500 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
    >
      <Play size={12} fill="currentColor" />
      {busy ? 'Starting…' : 'Start'}
    </button>
  );
}
