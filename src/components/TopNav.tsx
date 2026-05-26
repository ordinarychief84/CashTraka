'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavChild {
  label: string;
  href: string;
  disabled?: boolean;
  divider?: boolean;
}

interface NavGroup {
  label: string;
  href?: string;
  /** Regex patterns that match this tab as "active" */
  match: string[];
  children?: NavChild[];
}

interface Props {
  showProducts: boolean;
  showPayments: boolean;
  showCustomers: boolean;
  showReports: boolean;
  showExpenses: boolean;
  showTeam: boolean;
  showSettings: boolean;
  isPropManager: boolean;
}

export function TopNav({
  showProducts,
  showPayments,
  showCustomers,
  showReports,
  showExpenses,
  showTeam,
  showSettings,
  isPropManager,
}: Props) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Close on route change
  useEffect(() => { setOpenMenu(null); }, [pathname]);

  const toggle = useCallback((label: string) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  }, []);

  function isActive(match: string[]) {
    return match.some((m) => pathname === m || pathname.startsWith(m + '/') || pathname.startsWith(m + '?'));
  }

  // ── Nav structure ──────────────────────────────────────────────────────
  const groups: NavGroup[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      match: ['/dashboard'],
    },
  ];

  if (!isPropManager) {
    // Items tab (products, materials, inventory)
    const itemChildren: NavChild[] = [];
    if (showProducts) {
      itemChildren.push(
        { label: 'Products', href: '/products' },
        { label: 'Bills of Materials', href: '/recipes' },
        { label: 'Production', href: '/production' },
        { label: 'Item groups', href: '/item-groups' },
        { label: 'Discount groups', href: '/discount-groups' },
        { label: 'Units', href: '/units' },
        { label: 'Variations', href: '/variations' },
        { label: 'Locations', href: '/locations' },
        { label: 'Collections', href: '/collections' },
      );
    }
    itemChildren.push(
      { label: 'Adjustments', href: '/inventory/adjustments', divider: true },
      { label: 'Movements', href: '/inventory/movements' },
      { label: 'Stock counts', href: '/inventory/all' },
      { label: 'Transport movements', href: '/inventory/transfers' },
    );
    if (showProducts) {
      groups.push({
        label: 'Items',
        match: [
          '/products',
          '/recipes',
          '/production',
          '/manufacturing-tasks',
          '/materials',
          '/inventory',
          '/item-groups',
          '/discount-groups',
          '/units',
          '/variations',
          '/locations',
          '/collections',
        ],
        children: itemChildren,
      });
    }

    // Purchasing tab
    groups.push({
      label: 'Purchasing',
      match: ['/purchase-orders', '/suppliers', '/inventory/receipts', '/inventory/releases'],
      children: [
        { label: 'Purchase orders', href: '/purchase-orders' },
        { label: 'Inventory receipts', href: '/inventory/receipts' },
        { label: 'Inventory releases', href: '/inventory/releases' },
        { label: 'Suppliers', href: '/suppliers', divider: true },
        { label: 'Raw materials', href: '/materials' },
      ],
    });

    // Sales tab
    const salesChildren: NavChild[] = [];
    salesChildren.push({ label: 'Customer orders', href: '/orders' });
    if (showPayments) {
      salesChildren.push(
        { label: 'Invoices', href: '/invoices' },
        { label: 'Receipts', href: '/receipts' },
      );
    }
    if (showCustomers) {
      salesChildren.push({ label: 'Customers', href: '/customers', divider: true });
    }
    if (showPayments) {
      salesChildren.push(
        { label: 'Payments', href: '/payments' },
        { label: 'Debts', href: '/debts' },
      );
    }
    if (salesChildren.length > 0) {
      groups.push({
        label: 'Sales',
        match: ['/orders', '/invoices', '/receipts', '/customers', '/payments', '/debts'],
        children: salesChildren,
      });
    }
  }

  // Property manager: simplified nav
  if (isPropManager) {
    if (showPayments) {
      groups.push(
        { label: 'Invoices', href: '/invoices', match: ['/invoices'] },
        { label: 'Receipts', href: '/receipts', match: ['/receipts'] },
      );
    }
    if (showCustomers) {
      groups.push({ label: 'Tenants', href: '/customers', match: ['/customers'] });
    }
  }

  // Reporting
  if (showReports) {
    groups.push({ label: 'Reporting', href: '/reports', match: ['/reports'] });
  }

  // Admin (settings, team, etc.)
  const adminChildren: NavChild[] = [];
  if (showTeam) adminChildren.push({ label: 'Team', href: '/team' });
  if (showSettings) adminChildren.push({ label: 'Settings', href: '/settings' });
  if (showExpenses) adminChildren.push({ label: 'Expenses', href: '/expenses', divider: adminChildren.length > 0 });
  adminChildren.push({ label: 'Billing', href: '/billing', divider: adminChildren.length > 0 && !showExpenses });

  if (adminChildren.length > 0) {
    groups.push({
      label: 'More',
      match: ['/team', '/settings', '/expenses', '/billing'],
      children: adminChildren,
    });
  }

  return (
    <div ref={navRef} className="flex h-10 items-center gap-0.5 px-4">
      {groups.map((group) => {
        const active = isActive(group.match);
        const isOpen = openMenu === group.label;

        if (!group.children) {
          // Direct link
          return (
            <Link
              key={group.label}
              href={group.href!}
              className={cn(
                'flex h-full items-center px-3 text-[13px] font-medium border-b-2 transition-colors',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-600 hover:text-ink hover:border-slate-300',
              )}
            >
              {group.label}
            </Link>
          );
        }

        return (
          <div key={group.label} className="relative flex h-full items-center">
            <button
              type="button"
              onClick={() => toggle(group.label)}
              className={cn(
                'flex h-full items-center gap-1 px-3 text-[13px] font-medium border-b-2 transition-colors',
                active
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-600 hover:text-ink hover:border-slate-300',
              )}
            >
              {group.label}
              <ChevronDown
                size={13}
                className={cn('transition-transform', isOpen && 'rotate-180')}
              />
            </button>

            {isOpen && (
              <div className="absolute left-0 top-full z-50 min-w-[200px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {group.children.map((item) => (
                  <div key={item.href}>
                    {item.divider && (
                      <div className="my-1 border-t border-slate-100" />
                    )}
                    {item.disabled ? (
                      <span className="block cursor-not-allowed px-4 py-2 text-[13px] text-slate-400">
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'block px-4 py-2 text-[13px] transition-colors hover:bg-slate-50',
                          pathname === item.href || pathname.startsWith(item.href + '/')
                            ? 'font-semibold text-brand-700 bg-brand-50'
                            : 'text-slate-700',
                        )}
                      >
                        {item.label}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
