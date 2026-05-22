import Link from 'next/link';
import {
  Settings as SettingsIcon,
  Wallet,
  Users,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Settings Overview row — 5 entry cards at the top of /settings.
 * Each card jumps to a specific section (anchor) within /settings/edit.
 */
export function SettingsOverviewRow() {
  const cards: {
    Icon: LucideIcon;
    label: string;
    description: string;
    href: string;
    tone: 'brand' | 'success' | 'owed' | 'rose' | 'violet';
  }[] = [
    {
      Icon: SettingsIcon,
      label: 'General Settings',
      description: 'Manage company details, contact information, and basic preferences.',
      href: '/settings/edit?tab=profile',
      tone: 'brand',
    },
    {
      Icon: Wallet,
      label: 'Business & Finance',
      description: 'Configure currency, tax rates, payment terms and financial preferences.',
      href: '/settings/edit?tab=tax',
      tone: 'success',
    },
    {
      Icon: Users,
      label: 'Users & Permissions',
      description: 'Manage users, roles, and permissions for system access.',
      href: '/team',
      tone: 'violet',
    },
    {
      Icon: Bell,
      label: 'Notifications',
      description: 'Configure invoice reminders, feedback requests and notification cadence.',
      href: '/settings/edit?tab=invoice',
      tone: 'owed',
    },
    {
      Icon: ShieldCheck,
      label: 'Account & Security',
      description: 'Change your email, password, and bank account details.',
      href: '/settings/edit?tab=account',
      tone: 'rose',
    },
  ];

  const TONE_BG: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-100 text-success-700',
    owed: 'bg-owed-50 text-owed-700',
    rose: 'bg-rose-50 text-rose-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-bold text-ink">Settings Overview</h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group flex items-start gap-3 rounded-2xl border border-border bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_BG[c.tone]}`}
            >
              <c.Icon size={18} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-ink">{c.label}</div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                {c.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
