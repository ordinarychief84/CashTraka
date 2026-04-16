import Link from 'next/link';
import { ReactNode } from 'react';
import {
  Home,
  Wallet,
  Clock3,
  Users,
  LogOut,
  Receipt,
  Package,
  BarChart3,
  Users2,
  ListTodo,
  ClipboardList,
  Building2,
  Key,
  Settings as SettingsIcon,
} from 'lucide-react';
import { BottomNav } from './BottomNav';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';

type Props = {
  children: ReactNode;
  businessName?: string | null;
  userName?: string;
  businessType?: string | null;
};

export function AppShell({ children, businessName, userName, businessType }: Props) {
  const isPropManager = businessType === 'property_manager';

  return (
    <div className="min-h-screen">
      {/* ─── Desktop sidebar ─── */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-border bg-white md:flex">
        <div className="flex h-16 items-center px-5 border-b border-border">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Logo size="md" />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {/* Daily */}
          <SideLink href="/dashboard" icon={Home} label="Dashboard" />
          <SideLink href="/payments" icon={Wallet} label={isPropManager ? 'Rent Payments' : 'Payments'} />
          <SideLink href="/debts" icon={Clock3} label={isPropManager ? 'Unpaid Rent' : 'Money Owed'} />
          <SideLink
            href={isPropManager ? '/tenants' : '/customers'}
            icon={Users}
            label={isPropManager ? 'Tenants' : 'Customers'}
          />

          {/* Business */}
          <GroupLabel>Business</GroupLabel>
          {!isPropManager && <SideLink href="/products" icon={Package} label="Products" />}
          <SideLink href="/expenses" icon={Receipt} label="Expenses" />
          <SideLink href="/team" icon={Users2} label="Team" />

          {/* Property (conditional) */}
          {isPropManager && (
            <>
              <GroupLabel>Property</GroupLabel>
              <SideLink href="/properties" icon={Building2} label="Properties" />
              <SideLink href="/rent" icon={Key} label="Rent Tracker" />
            </>
          )}

          {/* Operations */}
          <GroupLabel>Operations</GroupLabel>
          <SideLink href="/tasks" icon={ListTodo} label="Tasks" />
          {!isPropManager && (
            <SideLink href="/checklists" icon={ClipboardList} label="Checklists" />
          )}

          {/* Bottom items */}
          <div className="mt-auto" />
          <SideLink href="/reports" icon={BarChart3} label="Reports" />
          <SideLink href="/settings" icon={SettingsIcon} label="Settings" />
        </nav>

        <div className="border-t border-border p-4">
          {businessName && (
            <div className="mb-1 truncate text-xs font-medium text-slate-700">{businessName}</div>
          )}
          {userName && (
            <div className="mb-3 truncate text-xs text-slate-500">Signed in as {userName}</div>
          )}
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-ink"
            >
              <LogOut size={14} />
              Log out
            </button>
          </form>
        </div>
      </aside>

      {/* ─── Desktop top bar (search) ─── */}
      <header className="sticky top-0 z-20 hidden h-14 border-b border-border bg-white/90 backdrop-blur md:block md:pl-56">
        <div className="flex h-full items-center px-6">
          <GlobalSearch />
        </div>
      </header>

      {/* ─── Mobile top bar ─── */}
      <header className="sticky top-0 z-30 border-b border-border bg-white md:hidden">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              aria-label="Settings"
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            >
              <SettingsIcon size={20} />
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                aria-label="Log out"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
              >
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <div className="container-app pb-3">
          <GlobalSearch />
        </div>
      </header>

      <main className="md:pl-56 pb-24 md:pb-10">
        <div className="container-app py-5 md:py-8">{children}</div>
      </main>

      <BottomNav isPropManager={isPropManager} />
    </div>
  );
}

function SideLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-ink"
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="mt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {children}
    </div>
  );
}
