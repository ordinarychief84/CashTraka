'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

export function SideLink({
  href,
  icon: Icon,
  label,
  badge,
  badgeTone = 'brand',
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  badgeTone?: 'brand' | 'danger';
}) {
  const pathname = usePathname();
  const isActive =
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
        (isActive
          ? 'bg-brand-50 text-brand-700 font-semibold'
          : 'text-slate-700 hover:bg-slate-50 hover:text-ink')
      }
    >
      <Icon size={18} className={isActive ? 'text-brand-600' : ''} />
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={
            'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ' +
            (badgeTone === 'danger'
              ? 'bg-red-600 text-white'
              : 'bg-brand-500 text-white')
          }
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
