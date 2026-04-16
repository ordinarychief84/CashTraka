'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { RowMenu, type RowMenuAction } from './RowMenu';

export function TemplateRowActions({ id }: { id: string }) {
  const router = useRouter();
  const actions: RowMenuAction[] = [
    {
      label: 'Edit',
      icon: <Pencil size={16} />,
      onClick: () => router.push(`/templates/${id}/edit`),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: async () => {
        if (!confirm('Delete this template?')) return;
        await fetch(`/api/templates/${id}`, { method: 'DELETE' });
        router.refresh();
      },
    },
  ];
  return <RowMenu actions={actions} />;
}
