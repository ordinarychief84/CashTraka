'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';

type Props = {
  id: string;
  status: string;
};

export function TaskRowActions({ id, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function updateStatus(newStatus: string) {
    setBusy(true);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const actions: RowMenuAction[] = [];

  if (status !== 'done') {
    actions.push({
      label: 'Mark as done',
      icon: <Check size={16} />,
      disabled: busy,
      onClick: () => updateStatus('done'),
    });
  } else {
    actions.push({
      label: 'Reopen',
      icon: <RotateCcw size={16} />,
      disabled: busy,
      onClick: () => updateStatus('todo'),
    });
  }

  actions.push({
    label: 'Edit',
    icon: <Pencil size={16} />,
    onClick: () => router.push(`/tasks/${id}/edit`),
  });

  actions.push({
    label: 'Delete',
    icon: <Trash2 size={16} />,
    danger: true,
    onClick: async () => {
      if (!confirm('Delete this task? This cannot be undone.')) return;
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      router.refresh();
    },
  });

  return <RowMenu actions={actions} />;
}
