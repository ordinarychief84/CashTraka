'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Minus } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';

type Props = {
  id: string;
  trackStock: boolean;
};

export function ProductRowActions({ id, trackStock }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function bumpStock(delta: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockDelta: delta }),
      });
      if (res.ok) {
        toast.success(delta > 0 ? 'Stock +1' : 'Stock -1');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Could not adjust stock');
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const actions: RowMenuAction[] = [];
  if (trackStock) {
    actions.push({
      label: 'Add 1 to stock',
      icon: <Plus size={16} />,
      disabled: busy,
      onClick: () => bumpStock(1),
    });
    actions.push({
      label: 'Remove 1 from stock',
      icon: <Minus size={16} />,
      disabled: busy,
      onClick: () => bumpStock(-1),
    });
  }
  actions.push({
    label: 'Edit',
    icon: <Pencil size={16} />,
    onClick: () => router.push(`/products/${id}/edit`),
  });
  actions.push({
    label: 'Archive',
    icon: <Trash2 size={16} />,
    danger: true,
    onClick: async () => {
      if (!confirm('Archive this product? Past sales keep their records.')) return;
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Product archived');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Could not archive');
      }
      router.refresh();
    },
  });

  return <RowMenu actions={actions} />;
}
