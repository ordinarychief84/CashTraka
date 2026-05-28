'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SubNavItem {
  label: string;
  href: string;
}

interface NavGroup {
  label: string;
  items: SubNavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Company',
    items: [
      { label: 'General',              href: '/settings' },
      { label: 'Currencies',           href: '/settings/currencies' },
      { label: 'Employees',            href: '/team' },
      { label: 'Layouts',              href: '/settings/layouts' },
      { label: 'Payment terms',        href: '/settings/payment-terms' },
      { label: 'Delivery terms',       href: '/settings/delivery-terms' },
      { label: 'Adjustment categories',href: '/settings/adjustment-categories' },
      { label: 'Languages',            href: '/settings/languages' },
      { label: 'Projects',             href: '/settings/projects' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users',              href: '/settings/users' },
      { label: 'Billing',            href: '/billing' },
      { label: 'Integrations',       href: '/settings/integrations' },
      { label: 'Integration issues', href: '/settings/integration-issues' },
      { label: 'E-mail log',         href: '/settings/email-log' },
      { label: 'Add-ons',            href: '/settings/add-ons' },
      { label: 'Data export',        href: '/settings/data-export' },
    ],
  },
  {
    label: 'Developer',
    items: [
      { label: 'API',      href: '/settings/api' },
      { label: 'Tabs',     href: '/settings/tabs' },
      { label: 'Webhooks', href: '/settings/webhooks' },
    ],
  },
];

function useActive(href: string) {
  const pathname = usePathname();
  // Exact /settings shouldn't light up for /settings/anything-else
  if (href === '/settings') return pathname === '/settings';
  return pathname === href || pathname.startsWith(href + '/');
}

function SubLink({ item }: { item: SubNavItem }) {
  const active = useActive(item.href);
  return (
    <Link
      href={item.href}
      className={cn(
        'block rounded-md px-3 py-1.5 text-[13px] transition-colors',
        active
          ? 'bg-brand-50 font-semibold text-brand-700'
          : 'font-normal text-slate-600 hover:bg-slate-100 hover:text-ink',
      )}
    >
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
        'inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[12px] transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700'
          : 'border-slate-200 bg-white font-normal text-slate-600 hover:bg-slate-50',
      )}
    >
      {item.label}
    </Link>
  );
}

export function SettingsSubNav() {
  const allItems = GROUPS.flatMap((g) => g.items);

  return (
    <>
      {/* Mobile: horizontal scroll pill bar */}
      <nav
        aria-label="Settings sub-navigation"
        className="md:hidden -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {allItems.map((item) => (
          <MobilePill key={item.href} item={item} />
        ))}
      </nav>

      {/* Desktop: vertical sidebar with 3 sections */}
      <aside className="hidden w-52 shrink-0 border-r border-slate-200 pr-2 md:block">
        {GROUPS.map((group, idx) => (
          <div key={group.label} className={cn(idx > 0 && 'mt-5')}>
            <div className="mb-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {group.label}
            </div>
            <nav className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <SubLink key={item.href} item={item} />
              ))}
            </nav>
          </div>
        ))}
      </aside>
    </>
  );
}
