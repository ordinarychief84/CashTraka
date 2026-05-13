'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';

export function MarkAllReadButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    setSubmitting(true);
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting}
      className="btn-secondary inline-flex items-center gap-2 text-sm"
    >
      <CheckCheck size={14} />
      {submitting ? 'Marking…' : 'Mark all read'}
    </button>
  );
}
