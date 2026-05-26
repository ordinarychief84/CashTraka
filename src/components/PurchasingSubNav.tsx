'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  PackageCheck,
  FileText,
  Building2,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  count?: number;
}

const PURCHASING: SubNavItem[] = [
  { label: 'Purchase orders', href: '/purchase-orders', icon: <ShoppingCart size={14} /> },
  { label: 'Receipts', href: '/inventory/receipts', icon: <PackageCheck size={14} /> },
  { label: 'Invoices', href: '/purchasing/invoices', icon: <FileText size={14} /> },
];

const SUPPLIERS: SubNavItem[] = [
  { label: 'Suppliers', href: '/suppliers', icon: <Building2 size={14} /> },
  { label: 'Supplier groups', href: '/supplier-groups', icon: <Layers size={14} /> },
];

function SubLink({ item }: { item: SubNavItem }) {
  const pathname = usePathname();
  const active =
    pathname === item.href ||
    pathname.startsWith(item.href + '/') ||
    pathname.startsWith(item.href + '?');

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
      <span className="flex-1">{item.label}</span>
      {item.count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
            active ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-500',
          )}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}

export function PurchasingSubNav() {
  return (
    <aside className="hidden w-44 shrink-0 border-r border-slate-200 pr-2 md:block">
      <div className="mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Purchasing
      </div>
      <nav className="flex flex-col gap-0.5">
        {PURCHASING.map((item) => (
          <SubLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="mb-1 mt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Suppliers
      </div>
      <nav className="flex flex-col gap-0.5">
        {SUPPLIERS.map((item) => (
          <SubLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
