'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
        const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Template deleted');
        } else {
          const data = await res.json().catch(() => ({}));
          toast.error(data?.error || 'Could not delete');
        }
        router.refresh();
      },
    },
  ];
  return <RowMenu actions={actions} />;
}
