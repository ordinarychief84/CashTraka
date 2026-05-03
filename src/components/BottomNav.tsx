'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Banknote, Plus, Clock3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuickAddSheet } from './QuickAddSheet';
import { MoreSheet } from './MoreSheet';

import type { AccessRole } from '@/lib/rbac';
import { can } from '@/lib/rbac';

type Props = {
  isPropManager?: boolean;
  /** Role of the logged-in principal. Used to hide the Quick-Add FAB when
   *  the principal can't actually create anything. */
  accessRole?: AccessRole;
  /** Forwarded to MoreSheet so the account card can render. */
  businessName?: string | null;
  /** Forwarded to MoreSheet to render the plan badge. */
  planLabel?: string | null;
};

/**
 * Floating pill bottom nav. Renders a rounded, elevated bar that hovers
 * above the page bottom (mobile only). Active items get a subtle brand
 * pill background; the centre slot is a raised brand-coloured FAB that
 * opens the QuickAddSheet.
 *
 * The bar sits inside a fixed wrapper with safe-area padding so it
 * clears iOS home-indicator and Android gesture areas.
 */
export function BottomNav({
  isPropManager,
  accessRole = 'OWNER',
  businessName,
  planLabel,
}: Props) {
  const canCreate =
    can(accessRole, 'payments.write') ||
    can(accessRole, 'debts.write') ||
    can(accessRole, 'customers.write');
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-3 md:hidden"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <nav
          className="pointer-events-auto flex w-full max-w-md items-center gap-1 rounded-full border border-slate-200/80 bg-white/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur"
          aria-label="Main"
        >
          <NavItem
            href="/dashboard"
            icon={Home}
            label="Home"
            active={isActive('/dashboard')}
          />
          <NavItem
            href="/payments"
            icon={Banknote}
            label={isPropManager ? 'Rent' : 'Pay'}
            active={isActive('/payments')}
          />

          {/* Centre FAB. Always renders to keep the layout stable; turns
              into a placeholder for read-only roles. */}
          {canCreate ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              aria-label="Quick add"
              className="mx-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_6px_16px_rgba(0,184,232,0.45)] transition active:scale-90"
            >
              <Plus size={22} strokeWidth={2.75} />
            </button>
          ) : (
            <div className="mx-0.5 h-12 w-12 shrink-0" aria-hidden />
          )}

          <NavItem
            href="/debts"
            icon={Clock3}
            label={isPropManager ? 'Unpaid' : 'Owed'}
            active={isActive('/debts')}
          />

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className={cn(
              'group flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-semibold transition',
              moreOpen
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-500 hover:text-slate-900 active:scale-95',
            )}
          >
            <LayoutGrid size={20} strokeWidth={moreOpen ? 2.5 : 2} />
            <span className="leading-none">More</span>
          </button>
        </nav>
      </div>

      <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        isPropManager={isPropManager}
        businessName={businessName}
        planLabel={planLabel}
      />
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
        'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 text-[10px] font-semibold transition',
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-slate-500 hover:text-slate-900 active:scale-95',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span className="leading-none">{label}</span>
    </Link>
  );
}
