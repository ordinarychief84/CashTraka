import Link from 'next/link';
import { ReactNode } from 'react';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { Logo } from './Logo';
import { GlobalSearch } from './GlobalSearch';
import { UpgradeBanner } from './UpgradeBanner';
import { NotificationsBell } from './NotificationsBell';
import { TopBarDateRange } from './dashboard/TopBarDateRange';
import { TopBarUserPill } from './dashboard/TopBarUserPill';
import { TopNav } from './TopNav';
import { can, type AccessRole, ROLE_LABELS } from '@/lib/rbac';

type Props = {
  children: ReactNode;
  businessName?: string | null;
  userName?: string;
  businessType?: string | null;
  accessRole?: AccessRole;
  principalName?: string;
  pendingTaskCount?: number;
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
  // Permission gates. `businessType` is retained as a prop for legacy
  // call-sites; the value is always 'seller' now that the property-
  // management vertical has been retired.
  void businessType;
  const show = {
    payments: can(accessRole, 'payments.read'),
    debts: can(accessRole, 'debts.read'),
    customers: can(accessRole, 'customers.read'),
    products: can(accessRole, 'products.read'),
    expenses: can(accessRole, 'expenses.read'),
    team: can(accessRole, 'team.read'),
    tasks: can(accessRole, 'tasks.read'),
    reports: can(accessRole, 'reports.read'),
    settings: can(accessRole, 'settings.read'),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UpgradeBanner />

      {/* ── Desktop: two-row sticky header ─────────────────────────────── */}

      {/* Row 1: Logo | Search | User */}
      <header className="sticky top-0 z-30 hidden h-14 border-b border-border bg-white shadow-[0_1px_0_0_rgba(15,23,42,0.04)] md:block">
        <div className="flex h-14 items-center gap-4 px-6">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-md transition-opacity hover:opacity-90"
          >
            <Logo size="md" />
          </Link>

          {/* Search — grows to fill remaining space */}
          <div className="min-w-0 max-w-sm flex-1">
            <GlobalSearch />
          </div>

          {/* Right actions */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <TopBarDateRange />
            <NotificationsBell />
            <TopBarUserPill
              name={principalName ?? userName ?? 'You'}
              role={ROLE_LABELS[accessRole] ?? 'Admin'}
            />
          </div>
        </div>
      </header>

      {/* Row 2: Horizontal nav tabs */}
      <div className="sticky top-14 z-20 hidden border-b border-border bg-white md:block">
        <TopNav
          showProducts={show.products}
          showPayments={show.payments}
          showCustomers={show.customers}
          showReports={show.reports}
          showExpenses={show.expenses}
          showTeam={show.team}
          showSettings={show.settings}
        />
      </div>

      {/* ── Mobile header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-white md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
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
        <div className="px-4 pb-3">
          <GlobalSearch />
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="pb-24 md:pb-10">
        <div className="container-app py-5 md:py-8">{children}</div>
      </main>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <BottomNav
        accessRole={accessRole}
        businessName={businessName}
        planLabel={planLabel}
      />
    </div>
  );
}
