import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Users2,
  BarChart3,
  Mail,
  Settings,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  Shield,
  RefreshCw,
  Headphones,
  Bell,
  ClipboardList,
  FileText,
  Heart,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import type { AdminSection } from '@/lib/admin-rbac';
import { adminSections } from '@/lib/admin-rbac';
import type { AdminRole } from '@/lib/admin-rbac';

type Props = {
  children: ReactNode;
  adminName?: string;
  activePath?: string;
  adminRole?: string;
};

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  section: AdminSection;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'dashboard' },
  { href: '/admin/users', icon: Users2, label: 'Users', section: 'users' },
  { href: '/admin/roles', icon: Shield, label: 'Roles', section: 'roles' },
  { href: '/admin/support', icon: Headphones, label: 'Support', section: 'support' },
  { href: '/admin/refunds', icon: RefreshCw, label: 'Refunds', section: 'refunds' },
  { href: '/admin/invoices', icon: FileText, label: 'Invoices', section: 'invoices' },
  { href: '/admin/recurring-invoices', icon: RefreshCw, label: 'Recurring', section: 'recurring' },
  { href: '/admin/firs', icon: ShieldCheck, label: 'FIRS', section: 'firs' },
  { href: '/admin/document-audit', icon: ClipboardList, label: 'Doc Audit', section: 'docAudit' },
  { href: '/admin/feedback', icon: Heart, label: 'Feedback', section: 'feedback' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications', section: 'notifications' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics', section: 'analytics' },
  { href: '/admin/emails', icon: Mail, label: 'Email Logs', section: 'emails' },
  { href: '/admin/blog', icon: FileText, label: 'Blog', section: 'blog' },
  { href: '/admin/audit', icon: ClipboardList, label: 'Audit Log', section: 'audit' },
  { href: '/admin/settings', icon: Settings, label: 'Settings', section: 'settings' },
];

const ROLE_BADGE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'SUPER ADMIN',
  BLOG_MANAGER: 'BLOG',
  BILLING_MANAGER: 'BILLING',
  SUPPORT_AGENT: 'SUPPORT',
  PROPERTY_MANAGER: 'PROPERTY',
  REPORTS_VIEWER: 'REPORTS',
};

export function AdminShell({ children, adminName, activePath, adminRole = 'SUPER_ADMIN' }: Props) {
  const role = adminRole as AdminRole;
  const allowedSections = adminSections(role);
  const visibleItems = NAV_ITEMS.filter((item) => allowedSections.includes(item.section));
  const badgeLabel = ROLE_BADGE_LABELS[adminRole] || 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 md:flex">
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
            <Logo size="md" variant="light" />
          </Link>
          <span className="rounded-full bg-success-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
            {badgeLabel}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-4 text-sm">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Platform
          </div>
          {visibleItems.map((item) => (
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
              <ShieldCheck size={12} className="text-success-400" />
              {adminName}
            </div>
          )}
          <div className="mb-3 text-[10px] uppercase tracking-wider text-slate-500">
            {adminRole === 'SUPER_ADMIN' ? 'Platform operator' : badgeLabel.toLowerCase()}
          </div>
          {adminRole === 'SUPER_ADMIN' && (
            <Link
              href="/dashboard"
              className="mb-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <ArrowLeft size={14} />
              Back to app
            </Link>
          )}
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
            <span className="rounded-full bg-success-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
              {badgeLabel}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {adminRole === 'SUPER_ADMIN' && (
              <Link
                href="/dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800"
              >
                <ArrowLeft size={18} />
              </Link>
            )}
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
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ' +
                  (isActive
                    ? 'bg-success-400 text-slate-900'
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
          ? 'bg-success-400/10 text-success-400'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white')
      }
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
