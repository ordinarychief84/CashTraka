'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, Plus, Clock3, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAddSheet } from './QuickAddSheet';
import { MoreSheet } from './MoreSheet';

type Props = {
  isPropManager?: boolean;
};

export function BottomNav({ isPropManager }: Props) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-white md:hidden">
        <div className="mx-auto grid max-w-screen-md grid-cols-5">
          <NavItem href="/dashboard" icon={Home} label="Home" active={isActive('/dashboard')} />
          <NavItem href="/payments" icon={Wallet} label="Payments" active={isActive('/payments')} />

          {/* Center FAB — Add button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-md transition active:scale-95"
              aria-label="Quick add"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>

          <NavItem href="/debts" icon={Clock3} label="Owed" active={isActive('/debts')} />

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium',
              moreOpen ? 'text-brand-600' : 'text-slate-500',
            )}
          >
            <MoreHorizontal size={22} />
            More
          </button>
        </div>
      </nav>

      <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} isPropManager={isPropManager} />
    </>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof Home;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium',
        active ? 'text-brand-600' : 'text-slate-500',
      )}
    >
      <Icon size={22} />
      {label}
    </Link>
  );
}
