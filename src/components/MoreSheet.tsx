'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  Search,
  MessageCircle,
  Bell,
  ClipboardList,
  HelpCircle,
  ShoppingBag,
  UserCircle2,
  Home,
  Banknote,
  Clock3,
  Users,
  GalleryHorizontalEnd,
  Receipt,
  FileText,
  FileMinus,
  Repeat,
  Send,
  Target,
  ListTodo,
  CheckSquare,
  BarChart3,
  Settings as SettingsIcon,
  Building2,
  Key,
  Users2,
  Heart,
  Landmark,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  isPropManager?: boolean;
  businessName?: string | null;
  /// Human-readable plan, e.g. "Free", "Starter", "Business". When set,
  /// the account card shows a "Plan · See Plans" pill that links to
  /// /settings?tab=billing.
  planLabel?: string | null;
};

type MenuItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

/**
 * Full-screen mobile navigation drawer styled after modern point-of-sale
 * apps (Square, Toast, Lightspeed).
 *
 *   - Slides in from the right edge over the page.
 *   - Top row: page title placeholder + X close.
 *   - Utility icon strip (search, chat, alerts, tasks, help, store,
 *     profile) gives one-tap access to common cross-cutting actions.
 *   - Account card surfaces business name + current plan with an
 *     upgrade link.
 *   - Vertical menu list groups every reachable section, with the
 *     current route highlighted.
 */
export function MoreSheet({
  open,
  onClose,
  isPropManager,
  businessName,
  planLabel,
}: Props) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const menu: MenuItem[] = useMemo(() => {
    const seller: MenuItem[] = [
      { href: '/dashboard', icon: Home, label: 'Home' },
      { href: '/reports', icon: BarChart3, label: 'Reports' },
      { href: '/payments', icon: Banknote, label: 'Payments' },
      { href: '/debts', icon: Clock3, label: 'Money owed' },
      { href: '/customers', icon: Users, label: 'Customers' },
      { href: '/receipts', icon: Receipt, label: 'Receipts' },
      { href: '/invoices', icon: FileText, label: 'Invoices' },
      { href: '/service-check', icon: Heart, label: 'Service Check' },
      { href: '/banks', icon: Landmark, label: 'Bank sync' },
      { href: '/credit-notes', icon: FileMinus, label: 'Credit notes' },
      {
        href: '/recurring-invoices',
        icon: Repeat,
        label: 'Recurring invoices',
      },
      { href: '/paylinks', icon: Send, label: 'PayLinks' },
      { href: '/collections', icon: Target, label: 'Collections' },
      { href: '/expenses', icon: Receipt, label: 'Expenses' },
      { href: '/team', icon: Users2, label: 'Team' },
      { href: '/settings', icon: SettingsIcon, label: 'Settings' },
    ];

    const landlord: MenuItem[] = [
      { href: '/dashboard', icon: Home, label: 'Home' },
      { href: '/reports', icon: BarChart3, label: 'Reports' },
      { href: '/payments', icon: Banknote, label: 'Rent payments' },
      { href: '/debts', icon: Clock3, label: 'Unpaid rent' },
      { href: '/properties', icon: Building2, label: 'Properties' },
      { href: '/rent', icon: Key, label: 'Rent tracker' },
      { href: '/tenants', icon: Users, label: 'Tenants' },
      { href: '/receipts', icon: Receipt, label: 'Receipts' },
      { href: '/invoices', icon: FileText, label: 'Invoices' },
      { href: '/service-check', icon: Heart, label: 'Service Check' },
      { href: '/expenses', icon: Receipt, label: 'Expenses' },
      { href: '/team', icon: Users2, label: 'Team' },
      { href: '/settings', icon: SettingsIcon, label: 'Settings' },
    ];

    return isPropManager ? landlord : seller;
  }, [isPropManager]);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  // Utility shortcuts at the top, mirroring the icon strip seen in modern
  // POS dashboards. Each is a one-tap deep link.
  const utilities: { icon: LucideIcon; href: string; label: string }[] = [
    { icon: Search, href: '/dashboard', label: 'Search' },
    { icon: MessageCircle, href: '/follow-up', label: 'Messages' },
    { icon: Bell, href: '/follow-up', label: 'Alerts' },
    { icon: ClipboardList, href: '/tasks', label: 'Tasks' },
    { icon: HelpCircle, href: '/contact', label: 'Help' },
    { icon: ShoppingBag, href: '/showroom', label: 'Storefront' },
    { icon: UserCircle2, href: '/settings', label: 'Profile' },
  ];

  const initials =
    (businessName ?? '')
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CT';

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[2px] transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-[0_0_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out md:hidden',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <h2 className="text-2xl font-bold tracking-tight text-ink">Menu</h2>
        </div>

        {/* Utility strip */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 active:scale-95"
          >
            <X size={20} strokeWidth={2.25} />
          </button>
          {utilities.map((u) => {
            const Icon = u.icon;
            return (
              <Link
                key={u.label}
                href={u.href}
                onClick={onClose}
                aria-label={u.label}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 active:scale-95"
              >
                <Icon size={19} strokeWidth={2} />
              </Link>
            );
          })}
        </div>

        {/* Account card */}
        <Link
          href="/settings"
          onClick={onClose}
          className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-300 hover:bg-brand-50/30 active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-ink">
              {businessName?.trim() || 'Your business'}
            </div>
            {planLabel ? (
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                <span>{planLabel}</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-brand-700 underline-offset-2 group-hover:underline">
                  See plans
                </span>
              </div>
            ) : null}
          </div>
        </Link>

        {/* Menu list */}
        <nav className="mt-4 flex-1 overflow-y-auto px-2 pb-4">
          <ul className="space-y-0.5">
            {menu.map((it) => {
              const Icon = it.icon;
              const active = isActive(it.href);
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-4 rounded-xl px-3 py-3 transition active:scale-[0.99]',
                      active
                        ? 'bg-slate-100 font-semibold text-ink'
                        : 'text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.5 : 2}
                      className={active ? 'text-brand-600' : 'text-slate-500'}
                    />
                    <span className="flex-1 text-[15px]">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
