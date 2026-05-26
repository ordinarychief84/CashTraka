'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingBag,
  ClipboardList,
  Factory,
  FolderOpen,
  Tag,
  Ruler,
  GitBranch,
  MapPin,
  Archive,
  SlidersHorizontal,
  ArrowLeftRight,
  Package,
  Layers,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const ITEMS: SubNavItem[] = [
  { label: 'Products', href: '/products', icon: <ShoppingBag size={14} /> },
  { label: 'Bills of Materials', href: '/recipes', icon: <ClipboardList size={14} /> },
  { label: 'Production', href: '/production', icon: <Factory size={14} /> },
  { label: 'Mfg Tasks', href: '/manufacturing-tasks', icon: <ClipboardCheck size={14} /> },
  { label: 'Item groups', href: '/item-groups', icon: <FolderOpen size={14} /> },
  { label: 'Discount groups', href: '/discount-groups', icon: <Tag size={14} /> },
  { label: 'Units', href: '/units', icon: <Ruler size={14} /> },
  { label: 'Variations', href: '/variations', icon: <GitBranch size={14} /> },
  { label: 'Locations', href: '/locations', icon: <MapPin size={14} /> },
  { label: 'Collections', href: '/item-collections', icon: <Archive size={14} /> },
];

const INVENTORY: SubNavItem[] = [
  { label: 'Adjustments', href: '/inventory/adjustments', icon: <SlidersHorizontal size={14} /> },
  { label: 'Movements', href: '/inventory/movements', icon: <ArrowLeftRight size={14} /> },
  { label: 'Stock counts', href: '/inventory/all', icon: <Package size={14} /> },
  { label: 'Transport mvts', href: '/inventory/transfers', icon: <Layers size={14} /> },
];

function SubLink({ item }: { item: SubNavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + '/');

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

export function ItemsSubNav() {
  return (
    <aside className="hidden w-44 shrink-0 border-r border-slate-200 pr-2 md:block">
      <div className="mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Items
      </div>
      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((item) => (
          <SubLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="mb-1 mt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Inventory
      </div>
      <nav className="flex flex-col gap-0.5">
        {INVENTORY.map((item) => (
          <SubLink key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
