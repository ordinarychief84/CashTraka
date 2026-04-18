import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Users2,
  BarChart3,
  Mail,
  Settings,
  CreditCard,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  Menu,
  Shield,
  RefreshCw,
  Headphones,
  Bell,
  ClipboardList,
} from 'lucide-react';
import { Logo } from '@/components/Logo';

type Props = {
  children: ReactNode;
  adminName?: string;
  activePath?: string;
};

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users2, label: 'Users' },
  { href: '/admin/roles', icon: Shield, label: 'Roles' },
  { href: '/admin/support', icon: Headphones, label: 'Support' },
  { href: '/admin/refunds', icon: RefreshCw, label: 'Refunds' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/emails', icon: Mail, label: 'Email Logs' },
  { href: '/admin/audit', icon: ClipboardList, label: 'Audit Log' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminShell({ children, adminName, activePath }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 md:flex">
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
            <Logo size="md" variant="light" />
          </Link>
          <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
            ADMIN
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-4 text-sm">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Platform
          </div>
          {NAV_ITEMS.map((item) => (
            <SideLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={activePath === item.href}
            />
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          {adminName && (
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <ShieldCheck size={12} className="text-lime-400" />
              {adminName}
            </div>
          )}
          <div className="mb-3 text-[10px] uppercase tracking-wider text-slate-500">
            Platform operator
          </div>
          <Link
            href="/dashboard"
            className="mb-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <ArrowLeft size={14} />
            Back to app
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <LogOut size={14} />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-slate-900 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
            <Logo size="sm" variant="light" />
            <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
              ADMIN
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800"
            >
              <ArrowLeft size={18} />
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                aria-label="Log out"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <div className="flex gap-0.5 overflow-x-auto px-4 pb-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ' +
                  (isActive
                    ? 'bg-lime-400 text-slate-900'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white')
                }
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="md:pl-60 pb-10">
        <div className="mx-auto w-full max-w-screen-xl px-4 py-5 md:px-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}

function SideLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        'flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition ' +
        (active
          ? 'bg-lime-400/10 text-lime-400'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white')
      }
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
