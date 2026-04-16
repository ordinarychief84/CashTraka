'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Four-button attendance toggle shown on the team list card.
 *
 * Tapping a chip upserts today's attendance for that staff member
 * (the unique(staffId, date) constraint guarantees one row/day). If they
 * tap the already-selected state, nothing visible changes.
 */

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';

type Props = {
  staffId: string;
  todayStatus: AttendanceStatus | null;
};

const OPTIONS: {
  value: AttendanceStatus;
  label: string;
  icon: typeof Check;
  tone: string;
}[] = [
  { value: 'present', label: 'Present', icon: Check, tone: 'brand' },
  { value: 'absent', label: 'Absent', icon: X, tone: 'red' },
  { value: 'half_day', label: 'Half day', icon: Clock, tone: 'amber' },
  { value: 'leave', label: 'Leave', icon: Plane, tone: 'slate' },
];

export function AttendanceActions({ staffId, todayStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<AttendanceStatus | null>(null);
  const [selected, setSelected] = useState<AttendanceStatus | null>(todayStatus);

  async function mark(status: AttendanceStatus) {
    setBusy(status);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Could not save');
        return;
      }
      setSelected(status);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((opt) => {
        const isSelected = selected === opt.value;
        const isBusy = busy === opt.value;
        const Icon = opt.icon;
        const toneClasses =
          opt.tone === 'brand'
            ? isSelected
              ? 'bg-brand-500 text-white border-brand-500'
              : 'text-brand-700 border-brand-200 hover:bg-brand-50'
            : opt.tone === 'red'
              ? isSelected
                ? 'bg-red-600 text-white border-red-600'
                : 'text-red-700 border-red-200 hover:bg-red-50'
              : opt.tone === 'amber'
                ? isSelected
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'text-amber-700 border-amber-200 hover:bg-amber-50'
                : isSelected
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50';
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => mark(opt.value)}
            disabled={isBusy}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border bg-white px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-60',
              toneClasses,
            )}
          >
            <Icon size={11} />
            {isBusy ? '…' : opt.label}
          </button>
        );
      })}
    </div>
  );
}
