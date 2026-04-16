import Link from 'next/link';
import type { ReactNode } from 'react';
import { LayoutDashboard, Users2, BarChart3, LogOut, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

type Props = {
  children: ReactNode;
  adminName?: string;
};

/**
 * Admin layout shell. Visually distinct from the seller app (dark sidebar,
 * lime accent) so it's obvious you're in the privileged area.
 */
export function AdminShell({ children, adminName }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 md:flex">
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
            <Logo size="md" />
            <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
              ADMIN
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-4 text-sm">
          <Side href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <Side href="/admin/users" icon={Users2} label="Users" />
          <Side href="/admin/analytics" icon={BarChart3} label="Analytics" />
        </nav>
        <div className="border-t border-slate-800 p-4">
          {adminName && (
            <div className="mb-3 truncate text-xs text-slate-400">
              Signed in as {adminName}
            </div>
          )}
          <Link
            href="/dashboard"
            className="mb-2 flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <ArrowLeft size={14} />
            Back to seller view
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              <LogOut size={14} />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-white md:hidden">
        <div className="container-app flex h-14 items-center justify-between">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2">
            <Logo size="sm" />
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-lime-400">
              ADMIN
            </span>
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
      </header>

      <main className="md:pl-60 pb-10">
        <div className="container-app py-5 md:py-8">{children}</div>
      </main>
    </div>
  );
}

function Side({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
