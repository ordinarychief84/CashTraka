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
  CreditCard,
  Send,
  Target,
  FileText,
  ShoppingBag,
  GalleryHorizontalEnd,
  Heart,
  Landmark,
  Factory,
  Boxes,
  BookOpen,
  Truck,
} from 'lucide-react';
import { BottomNav } from './BottomNav';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';
import { UpgradeBanner } from './UpgradeBanner';
import { SideLink } from './SideLink';
import { NotificationsBell } from './NotificationsBell';
import { SidebarBusinessPlan } from './dashboard/SidebarBusinessPlan';
import { TopBarDateRange } from './dashboard/TopBarDateRange';
import { TopBarUserPill } from './dashboard/TopBarUserPill';
import { can, type AccessRole, ROLE_LABELS } from '@/lib/rbac';

type Props = {
  children: ReactNode;
  businessName?: string | null;
  userName?: string;
  businessType?: string | null;
  accessRole?: AccessRole;
  principalName?: string;
  pendingTaskCount?: number;
  /** Optional plan label rendered in the mobile drawer's account card. */
  planLabel?: string | null;
};

export function AppShell({
  children,
  businessName,
  userName,
  businessType,
  accessRole = 'OWNER',
  principalName,
  pendingTaskCount,
  planLabel,
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-white md:flex">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md transition-opacity hover:opacity-90"
          >
            <Logo size="md" />
          </Link>
        </div>

        {/* Sidebar trimmed to surfaces that were rebuilt or substantively
            extended in the autopilot release. Inventory is reachable as a
            route but not in the nav (redundant with Materials). Shortages,
            Work history and Certificates are reachable via deep links but
            de-prioritised in the chrome. */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-3 pb-2">
          <SideLink href="/dashboard" icon={<Home size={18} />} label="Dashboard" />
          <SideLink href="/orders" icon={<ClipboardList size={18} />} label="Orders" />
          <SideLink href="/production" icon={<Factory size={18} />} label="Production" />
          {show.products && !isPropManager && (
            <SideLink href="/products" icon={<ShoppingBag size={18} />} label="Products" />
          )}
          <SideLink href="/materials" icon={<Boxes size={18} />} label="Materials" />
          <SideLink href="/purchase-orders" icon={<Truck size={18} />} label="Purchases" />
          <SideLink href="/suppliers" icon={<Users2 size={18} />} label="Suppliers" />
          {show.payments && !isPropManager && (
            <SideLink href="/invoices" icon={<FileText size={18} />} label="Invoices" />
          )}
          {show.payments && !isPropManager && (
            <SideLink href="/receipts" icon={<Receipt size={18} />} label="Receipts" />
          )}
          {show.reports && (
            <SideLink href="/reports" icon={<BarChart3 size={18} />} label="Reports" />
          )}
          {show.customers && (
            <SideLink href="/customers" icon={<Users size={18} />} label="Customers" />
          )}
          <SideLink href="/service-check" icon={<Heart size={18} />} label="Service Check" />
          {show.team && <SideLink href="/team" icon={<Users2 size={18} />} label="Team" />}
          {show.settings && (
            <SideLink href="/settings" icon={<SettingsIcon size={18} />} label="Settings" />
          )}
          <SideLink href="/billing" icon={<CreditCard size={18} />} label="Billing" />

          {/* Supporting surfaces — extended this session. */}
          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              More
            </div>
            <SideLink href="/recipes" icon={<BookOpen size={18} />} label="Recipes" />
            {show.expenses && (
              <SideLink href="/expenses" icon={<Banknote size={18} />} label="Expenses" />
            )}
            {show.payments && (
              <SideLink href="/payments" icon={<Banknote size={18} />} label="Payments" />
            )}
          </div>
        </nav>

        {/* Bottom: Business Plan card — replaces the inline logout
            (now moved into the top-bar user pill dropdown). Top divider
            visually separates the plan card from the nav above. */}
        <div className="border-t border-border/60">
          <SidebarBusinessPlan
            planLabel={planLabel ?? 'Business Plan'}
            isActive
            teamUsed={8}
            teamMax={20}
            storagePct={65}
          />
        </div>
      </aside>

      <header className="sticky top-0 z-20 hidden h-16 border-b border-border bg-white/95 backdrop-blur-sm shadow-[0_1px_0_0_rgba(15,23,42,0.04)] md:block md:pl-60">
        <div className="container-app flex h-16 items-center justify-between gap-3">
          <div className="min-w-0 max-w-md flex-1">
            <GlobalSearch />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TopBarDateRange />
            <NotificationsBell />
            <TopBarUserPill
              name={principalName ?? userName ?? 'You'}
              role={ROLE_LABELS[accessRole] ?? 'Admin'}
            />
          </div>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-border bg-white md:hidden">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationsBell />
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

      <main className="md:pl-60 pb-24 md:pb-10">
        <div className="container-app py-5 md:py-8">{children}</div>
      </main>

      <BottomNav
        isPropManager={isPropManager}
        accessRole={accessRole}
        businessName={businessName}
        planLabel={planLabel}
      />
    </div>
  );
}


