'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  ClipboardList,
  Truck,
  Receipt,
  Users,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const SALES: SubNavItem[] = [
  { label: 'Offers', href: '/sales/offers', icon: <FileText size={14} /> },
  { label: 'Orders', href: '/orders', icon: <ClipboardList size={14} /> },
  { label: 'Shipments', href: '/sales/shipments', icon: <Truck size={14} /> },
  { label: 'Invoices', href: '/invoices', icon: <Receipt size={14} /> },
];

const CUSTOMERS: SubNavItem[] = [
  { label: 'Customers', href: '/customers', icon: <Users size={14} /> },
  { label: 'Customer groups', href: '/customer-groups', icon: <Layers size={14} /> },
];

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?');
}

function SubLink({ item }: { item: SubNavItem }) {
  const active = useActive(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-brand-50 font-semibold text-brand-700'
          : 'font-normal text-slate-600 hover:bg-slate-100 hover:text-ink',
      )}
    >
      <span className={active ? 'text-brand-600' : 'text-slate-400'}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

function MobilePill({ item }: { item: SubNavItem }) {
  const active = useActive(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700'
          : 'border-slate-200 bg-white font-normal text-slate-600 hover:bg-slate-50',
      )}
    >
      <span className={active ? 'text-brand-600' : 'text-slate-400'}>{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function SalesSubNav() {
  return (
    <>
      {/* Mobile: horizontal scroll pill bar */}
      <nav
        aria-label="Sales sub-navigation"
        className="md:hidden -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {[...SALES, ...CUSTOMERS].map((item) => (
          <MobilePill key={item.href} item={item} />
        ))}
      </nav>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden w-44 shrink-0 border-r border-slate-200 pr-2 md:block">
        <div className="mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Sales
        </div>
        <nav className="flex flex-col gap-0.5">
          {SALES.map((item) => (
            <SubLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="mb-1 mt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Customers
        </div>
        <nav className="flex flex-col gap-0.5">
          {CUSTOMERS.map((item) => (
            <SubLink key={item.href} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
}
