'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  X,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  isPropManager?: boolean;
};

export function MoreSheet({ open, onClose, isPropManager }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sections = [
    {
      label: 'Business',
      items: [
        ...(isPropManager
          ? []
          : [
              { href: '/showroom', icon: GalleryHorizontalEnd, label: 'Showroom' },
              { href: '/sales', icon: ShoppingBag, label: 'Sales' },
            ]),
        { href: '/expenses', icon: Receipt, label: 'Expenses' },
        { href: '/team', icon: Users2, label: 'Team' },
      ],
    },
    ...(isPropManager
      ? []
      : [
          {
            label: 'Collections',
            items: [
              { href: '/paylinks', icon: Send, label: 'PayLinks' },
              { href: '/collections', icon: Target, label: 'Collections' },
            ],
          },
        ]),
    {
      label: 'Operations',
      items: [
        { href: '/tasks', icon: ListTodo, label: 'Task Management' },
        ...(isPropManager
          ? []
          : [{ href: '/checklists', icon: ClipboardList, label: 'Checklists' }]),
        { href: '/follow-up', icon: MessageCircle, label: 'Follow-up' },
      ],
    },
    ...(isPropManager
      ? [
          {
            label: 'Property',
            items: [
              { href: '/properties', icon: Building2, label: 'Properties' },
              { href: '/rent', icon: Key, label: 'Rent tracker' },
              { href: '/tenants', icon: Users, label: 'Tenants' },
            ],
          },
        ]
      : []),
    {
      label: '',
      items: [
        { href: '/reports', icon: BarChart3, label: 'Reports' },
        { href: '/settings', icon: Settings, label: 'Settings' },
      ],
    },
  ];

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-900/50 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl transition-transform duration-300 md:hidden',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">More</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          {sections.map((sec, si) => (
            <div key={si}>
              {sec.label && (
                <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {sec.label}
                </div>
              )}
              <div className="space-y-0.5">
                {sec.items.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-ink"
                  >
                    <it.icon size={18} />
                    {it.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
