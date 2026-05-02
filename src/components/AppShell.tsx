import Link from 'next/link';
import { ReactNode } from 'react';
import {
  Home,
  Banknote,
  Clock3,
  Users,
  LogOut,
  Receipt,
  BarChart3,
  Users2,
  ListTodo,
  ClipboardList,
  Building2,
  Key,
  Settings as SettingsIcon,
  Send,
  Target,
  FileText,
  ShoppingBag,
  GalleryHorizontalEnd,
} from 'lucide-react';
import { BottomNav } from './BottomNav';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';
import { UpgradeBanner } from './UpgradeBanner';
import { SideLink } from './SideLink';
import { can, type AccessRole, ROLE_LABELS } from '@/lib/rbac';

type Props = {
  children: ReactNode;
  businessName?: string | null;
  userName?: string;
  businessType?: string | null;
  accessRole?: AccessRole;
  principalName?: string;
  pendingTaskCount?: number;
};

export function AppShell({
  children,
  businessName,
  userName,
  businessType,
  accessRole = 'OWNER',
  principalName,
  pendingTaskCount,
}: Props) {
  const isPropManager = businessType === 'property_manager';

  const show = {
    payments: can(accessRole, 'payments.read'),
    debts: can(accessRole, 'debts.read'),
    customers: can(accessRole, 'customers.read'),
    products: can(accessRole, 'products.read') && !isPropManager,
    sales: can(accessRole, 'products.read') && !isPropManager,
    expenses: can(accessRole, 'expenses.read'),
    team: can(accessRole, 'team.read'),
    properties: can(accessRole, 'products.read') && isPropManager,
    tasks: can(accessRole, 'tasks.read'),
    checklists: can(accessRole, 'checklists.read') && !isPropManager,
    reports: can(accessRole, 'reports.read'),
    settings: can(accessRole, 'settings.read'),
  };

  return (
    <div className="min-h-screen">
      <UpgradeBanner />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-border bg-white md:flex">
        <div className="flex h-16 items-center px-5 border-b border-border">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Logo size="md" />
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          <SideLink href="/dashboard" icon={<Home size={18} />} label="Dashboard" />
          {show.payments && (
            <SideLink
              href="/payments"
              icon={<Banknote size={18} />}
              label={isPropManager ? 'Rent Payments' : 'Payments'}
            />
          )}
          {show.debts && (
            <SideLink
              href="/debts"
              icon={<Clock3 size={18} />}
              label={isPropManager ? 'Unpaid Rent' : 'Money Owed'}
            />
          )}
          {show.customers && (
            <SideLink
              href={isPropManager ? '/tenants' : '/customers'}
              icon={<Users size={18} />}
              label={isPropManager ? 'Tenants' : 'Customers'}
            />
          )}
          {show.payments && !isPropManager && (
            <SideLink href="/receipts" icon={<Receipt size={18} />} label="Receipts" />
          )}

          {/* Collections */}
          {!isPropManager && show.payments && (
            <>
              <GroupLabel>Collections</GroupLabel>
              <SideLink href="/paylinks" icon={<Send size={18} />} label="PayLinks" />
              <SideLink href="/promises" icon={<FileText size={18} />} label="Promises" />
              <SideLink href="/collections" icon={<Target size={18} />} label="Collections" />
            </>
          )}

          {(show.products || show.sales || show.expenses || show.team) && <GroupLabel>Business</GroupLabel>}
          {show.products && <SideLink href="/showroom" icon={<GalleryHorizontalEnd size={18} />} label="Showroom" />}
          {show.sales && <SideLink href="/sales" icon={<ShoppingBag size={18} />} label="Sales" />}
          {show.expenses && <SideLink href="/expenses" icon={<Receipt size={18} />} label="Expense Mgt" />}
          {show.team && <SideLink href="/team" icon={<Users2 size={18} />} label="Team" />}

          {isPropManager && show.properties && (
            <>
              <GroupLabel>Property</GroupLabel>
              <SideLink href="/properties" icon={<Building2 size={18} />} label="Properties" />
              <SideLink href="/rent" icon={<Key size={18} />} label="Rent Tracker" />
            </>
          )}

          {(show.tasks || show.checklists) && <GroupLabel>Operations</GroupLabel>}
          {show.tasks && (
            <SideLink
              href="/tasks"
              icon={<ListTodo size={18} />}
              label="Task Management"
              badge={pendingTaskCount}
            />
          )}
          {show.checklists && (
            <SideLink href="/checklists" icon={<ClipboardList size={18} />} label="Checklists" />
          )}

          <div className="mt-auto" />
          {show.reports && <SideLink href="/reports" icon={<BarChart3 size={18} />} label="Reports" />}
          {show.settings && <SideLink href="/settings" icon={<SettingsIcon size={18} />} label="Settings" />}
        </nav>

        <div className="border-t border-border p-4">
          {businessName && (
            <div className="mb-1 truncate text-xs font-medium text-slate-700">{businessName}</div>
          )}
          {(principalName || userName) && (
            <div className="mb-1 truncate text-xs text-slate-500">
              Signed in as {principalName ?? userName}
            </div>
          )}
          {accessRole !== 'OWNER' && (
            <div className="mb-3 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {ROLE_LABELS[accessRole]}
            </div>
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

      <header className="sticky top-0 z-20 hidden h-14 border-b border-border bg-white/90 backdrop-blur md:block md:pl-56">
        <div className="flex h-full items-center px-6">
          <GlobalSearch />
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-border bg-white md:hidden">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            {show.settings && (
              <Link
                href="/settings"
                aria-label="Settings"
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
              >
                <SettingsIcon size={20} />
              </Link>
            )}
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

      <BottomNav isPropManager={isPropManager} accessRole={accessRole} />
    </div>
  );
}


function GroupLabel({ children }: { children: string }) {
  return (
    <div className="mt-4 px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {children}
    </div>
  );
}