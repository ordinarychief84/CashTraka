'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RowMenuAction = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
};

type Props = {
  actions: RowMenuAction[];
  align?: 'left' | 'right';
};

export function RowMenu({ actions, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={a.disabled}
              onClick={async () => {
                setOpen(false);
                await a.onClick();
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
                a.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-ink',
                a.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
              )}
            >
              {a.icon && <span className="shrink-0">{a.icon}</span>}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
