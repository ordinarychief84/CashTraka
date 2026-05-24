'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SubLink = {
  href: string;
  label: string;
  icon?: ReactNode;
};

/**
 * Collapsible sidebar section with sub-links.
 * Auto-expands when the current path matches any child.
 */
export function SideSection({
  icon,
  label,
  links,
}: {
  icon: ReactNode;
  label: string;
  links: SubLink[];
}) {
  const pathname = usePathname();
  const hasActive = links.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + '/'),
  );
  const [open, setOpen] = useState(hasActive);

  return (
    <div>
      {/* Section trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          hasActive
            ? 'bg-brand-50 font-semibold text-brand-700'
            : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-ink',
        )}
      >
        {/* Active accent bar */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-1.5 left-0 w-[3px] rounded-r-full transition-opacity',
            hasActive ? 'bg-brand-500 opacity-100' : 'opacity-0',
          )}
        />
        <span
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center transition-colors',
            hasActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600',
          )}
        >
          {icon}
        </span>
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          size={14}
          className={cn(
            'shrink-0 transition-transform duration-150',
            open ? 'rotate-180' : '',
            hasActive ? 'text-brand-400' : 'text-slate-300',
          )}
        />
      </button>

      {/* Sub-links */}
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'bg-brand-50 font-semibold text-brand-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-ink',
                )}
              >
                {link.icon && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {link.icon}
                  </span>
                )}
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
