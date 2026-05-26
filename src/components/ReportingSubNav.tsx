'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Valuation', href: '/reports/valuation' },
  { label: 'Reordering', href: '/reports/reordering' },
  { label: 'Ledger', href: '/reports/ledger' },
  { label: 'Stock counting', href: '/reports/stock-counting' },
  { label: 'Order statistics', href: '/reports/order-statistics' },
  { label: 'Sales statistics', href: '/reports/sales-statistics' },
  { label: 'Sales budgets', href: '/reports/sales-budgets' },
  { label: 'Purchasing statistics', href: '/reports/purchasing-statistics' },
  { label: 'Transactions', href: '/reports/transactions' },
];

export function ReportingSubNav() {
  const pathname = usePathname();

  return (
    <aside className="w-44 shrink-0 border-r border-slate-200 pr-4">
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Reporting
      </p>
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
