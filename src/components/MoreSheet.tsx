'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Search,
  GalleryHorizontalEnd,
  ShoppingBag,
  Receipt,
  Users2,
  ListTodo,
  ClipboardList,
  BarChart3,
  Settings,
  Building2,
  Key,
  Users,
  MessageCircle,
  Send,
  Target,
  FileText,
  FileMinus,
  Repeat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  isPropManager?: boolean;
};

type Tile = {
  href: string;
  icon: LucideIcon;
  label: string;
  /// Tailwind classes for the small coloured tile background.
  tone: string;
};

/**
 * Bottom sheet shown when the user taps "More" on the mobile nav.
 *
 * Modern app-tray feel:
 *   - Drag handle pill at the top
 *   - Search bar that filters tiles live
 *   - Sectioned grid of coloured icon tiles (3 cols on phone, 4 on
 *     tablet) — each tile is a tap target around 80px tall, easy to hit
 *   - Sheet bottom respects iOS home-indicator safe area
 */
export function MoreSheet({ open, onClose, isPropManager }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset the search box every time the sheet closes so a stale filter
  // doesn't surprise the user next time they open it.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const sections = useMemo(() => {
    const business: Tile[] = isPropManager
      ? []
      : [
          {
            href: '/showroom',
            icon: GalleryHorizontalEnd,
            label: 'Showroom',
            tone: 'bg-fuchsia-50 text-fuchsia-700',
          },
          {
            href: '/sales',
            icon: ShoppingBag,
            label: 'Sales',
            tone: 'bg-emerald-50 text-emerald-700',
          },
          {
            href: '/invoices',
            icon: FileText,
            label: 'Invoices',
            tone: 'bg-brand-50 text-brand-700',
          },
          {
            href: '/credit-notes',
            icon: FileMinus,
            label: 'Credit notes',
            tone: 'bg-amber-50 text-amber-700',
          },
          {
            href: '/recurring-invoices',
            icon: Repeat,
            label: 'Recurring',
            tone: 'bg-indigo-50 text-indigo-700',
          },
        ];

    const businessCommon: Tile[] = [
      {
        href: '/expenses',
        icon: Receipt,
        label: 'Expenses',
        tone: 'bg-rose-50 text-rose-700',
      },
      {
        href: '/team',
        icon: Users2,
        label: 'Team',
        tone: 'bg-violet-50 text-violet-700',
      },
    ];

    const collections: Tile[] = isPropManager
      ? []
      : [
          {
            href: '/paylinks',
            icon: Send,
            label: 'PayLinks',
            tone: 'bg-sky-50 text-sky-700',
          },
          {
            href: '/collections',
            icon: Target,
            label: 'Collections',
            tone: 'bg-orange-50 text-orange-700',
          },
        ];

    const operations: Tile[] = [
      {
        href: '/tasks',
        icon: ListTodo,
        label: 'Tasks',
        tone: 'bg-teal-50 text-teal-700',
      },
      ...(isPropManager
        ? []
        : [
            {
              href: '/checklists',
              icon: ClipboardList,
              label: 'Checklists',
              tone: 'bg-cyan-50 text-cyan-700',
            },
          ]),
      {
        href: '/follow-up',
        icon: MessageCircle,
        label: 'Follow-up',
        tone: 'bg-lime-50 text-lime-700',
      },
    ];

    const property: Tile[] = isPropManager
      ? [
          {
            href: '/properties',
            icon: Building2,
            label: 'Properties',
            tone: 'bg-blue-50 text-blue-700',
          },
          {
            href: '/rent',
            icon: Key,
            label: 'Rent',
            tone: 'bg-emerald-50 text-emerald-700',
          },
          {
            href: '/tenants',
            icon: Users,
            label: 'Tenants',
            tone: 'bg-violet-50 text-violet-700',
          },
        ]
      : [];

    const insights: Tile[] = [
      {
        href: '/reports',
        icon: BarChart3,
        label: 'Reports',
        tone: 'bg-purple-50 text-purple-700',
      },
      {
        href: '/settings',
        icon: Settings,
        label: 'Settings',
        tone: 'bg-slate-100 text-slate-700',
      },
    ];

    return [
      { label: 'Business', items: [...business, ...businessCommon] },
      ...(collections.length ? [{ label: 'Collections', items: collections }] : []),
      { label: 'Operations', items: operations },
      ...(property.length ? [{ label: 'Property', items: property }] : []),
      { label: 'Account', items: insights },
    ];
  }, [isPropManager]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sections
        .map((s) => ({
          ...s,
          items: s.items.filter((it) => it.label.toLowerCase().includes(q)),
        }))
        .filter((s) => s.items.length > 0)
    : sections;

  const hasResults = filtered.some((s) => s.items.length > 0);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-[2px] transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out md:hidden',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" aria-hidden />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <h2 className="text-lg font-bold text-ink">More</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        {/* Tiles */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {!hasResults ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              Nothing matches &quot;{query}&quot;.
            </div>
          ) : (
            <div className="space-y-5">
              {filtered.map((sec) => (
                <section key={sec.label}>
                  <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {sec.label}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {sec.items.map((it) => {
                      const Icon = it.icon;
                      return (
                        <Link
                          key={it.href}
                          href={it.href}
                          onClick={onClose}
                          className="group flex flex-col items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-100 transition hover:ring-brand-200 active:scale-[0.97]"
                        >
                          <div
                            className={cn(
                              'flex h-11 w-11 items-center justify-center rounded-xl',
                              it.tone,
                            )}
                          >
                            <Icon size={20} strokeWidth={2.25} />
                          </div>
                          <span className="text-center text-[12px] font-medium leading-tight text-slate-700 group-hover:text-ink">
                            {it.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
