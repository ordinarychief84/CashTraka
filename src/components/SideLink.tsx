'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function SideLink({
  href,
  icon,
  label,
  badge,
  badgeTone = 'brand',
}: {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  badgeTone?: 'brand' | 'danger';
}) {
  const pathname = usePathname();
  const isActive =
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/');

  // Stripe/Linear-style nav row: muted by default, soft-blue background +
  // bold weight when active. A 3px accent bar slides in on the left edge
  // so the active page reads at a glance even from the corner of the eye.
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={
        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ' +
        (isActive
          ? 'bg-brand-50 font-semibold text-brand-700'
          : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-ink')
      }
    >
      {/* Active-state accent bar — pinned to the left, fades in/out. */}
      <span
        aria-hidden
        className={
          'absolute inset-y-1.5 left-0 w-[3px] rounded-r-full transition-opacity ' +
          (isActive ? 'bg-brand-500 opacity-100' : 'opacity-0')
        }
      />
      <span
        className={
          'flex h-5 w-5 shrink-0 items-center justify-center transition-colors ' +
          (isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')
        }
      >
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={
            'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ' +
            (badgeTone === 'danger'
              ? 'bg-rose-500 text-white'
              : 'bg-brand-500 text-white')
          }
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
