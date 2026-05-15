'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * User pill rendered on the right of the top bar. Avatar circle + name +
 * role label + chevron. Clicking opens a small menu with Profile,
 * Settings, and Log out. The log-out action submits to /api/auth/logout
 * via a normal POST form so the existing session flow stays unchanged.
 */
export function TopBarUserPill({
  name,
  role = 'Admin',
  initials,
}: {
  name: string;
  role?: string;
  initials?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const computedInitials =
    initials ??
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 transition',
          open
            ? 'bg-slate-100'
            : 'hover:bg-slate-100',
        )}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-success-400 text-[11px] font-bold text-white"
          aria-hidden
        >
          {computedInitials || <User size={14} />}
        </span>
        <span className="flex flex-col items-start leading-tight">
          <span className="text-xs font-bold text-ink">{name}</span>
          <span className="text-[10px] text-slate-500">{role}</span>
        </span>
        <ChevronDown
          size={12}
          className={cn(
            'text-slate-400 transition',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          <div className="border-b border-border bg-slate-50/50 px-3 py-2">
            <div className="truncate text-xs font-bold text-ink">{name}</div>
            <div className="text-[10px] text-slate-500">{role}</div>
          </div>
          <nav className="py-1 text-sm">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
            >
              <SettingsIcon size={14} className="text-slate-400" />
              Settings
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-700 hover:bg-rose-50"
              >
                <LogOut size={14} className="text-rose-500" />
                Log out
              </button>
            </form>
          </nav>
        </div>
      )}
    </div>
  );
}
