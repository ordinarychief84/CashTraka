'use client';

import Link from 'next/link';
import { BarChart3, DollarSign } from 'lucide-react';

const tabs = [
  { key: 'overview', label: 'Overview', href: '/reports', icon: BarChart3 },
  { key: 'pnl', label: 'Profit & Loss', href: '/reports/pnl', icon: DollarSign },
] as const;

type Tab = (typeof tabs)[number]['key'];

export function ReportsTabNav({ active }: { active: Tab }) {
  return (
    <nav className="mb-6 flex gap-1 rounded-lg border border-border bg-white p-1">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
