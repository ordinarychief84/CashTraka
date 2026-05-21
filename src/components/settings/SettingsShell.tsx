'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Shield, CreditCard, AlertTriangle, FileText, Receipt } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { AccountTab } from './AccountTab';
import { BillingTab } from './BillingTab';
import { DangerZoneTab } from './DangerZoneTab';
import { TaxTab } from './TaxTab';
import { InvoiceTab } from './InvoiceTab';

// Removed tabs:
//   - Appearance: shipped a fake theme picker no Tailwind styles
//     responded to. Removed in PR #99.
//   - Storefront: public catalog at /store/<slug> was a Yupoo-style
//     product gallery that linked to wa.me — it didn't integrate with
//     the production-planning workflow (no CustomerOrder created, no
//     production triggered). Out of scope for a back-office ops tool.
//     Its one survivor — the "Receipt prefix" field — moved into the
//     Invoices tab next to the other document prefixes.
type Tab = 'profile' | 'account' | 'invoice' | 'tax' | 'billing' | 'danger';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'invoice', label: 'Invoices', icon: Receipt },
  { id: 'tax', label: 'Tax & FIRS', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
];

type Props = {
  initialProfile: {
    name: string;
    businessName: string;
    businessAddress: string;
    whatsappNumber: string;
    receiptFooter: string;
    businessType: string;
  };
  initialAccount: {
    email: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  };
  initialTax: {
    tin: string;
    vatRegistered: boolean;
    vatRate: number;
    firsMerchantId: string;
    businessAddress: string;
  };
  businessType: string;
};

export function SettingsShell({
  initialProfile,
  initialAccount,
  initialTax,
  businessType,
}: Props) {
  const search = useSearchParams();

  // Stale `?tab=appearance` / `?tab=storefront` bookmarks fall back to
  // Profile so the right pane never renders empty. Same guard for any
  // future tab removal.
  const VALID_TABS: Tab[] = [
    'profile',
    'account',
    'invoice',
    'tax',
    'billing',
    'danger',
  ];
  const resolveTab = (raw: string | null): Tab => {
    return raw && (VALID_TABS as string[]).includes(raw)
      ? (raw as Tab)
      : 'profile';
  };

  const [activeTab, setActiveTab] = useState<Tab>(resolveTab(search.get('tab')));

  // Update if the URL changes externally (e.g. clicking nav links)
  useEffect(() => {
    setActiveTab(resolveTab(search.get('tab')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Manage your account, profile, and preferences</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar */}
        <nav className="w-full shrink-0 lg:w-56">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors first:rounded-t-xl last:rounded-b-xl ' +
                    (active
                      ? 'bg-success-50 text-success-700 border-l-2 border-success-600'
                      : tab.id === 'danger'
                        ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                  }
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {activeTab === 'profile' && (
            <ProfileTab initial={initialProfile} />
          )}
          {activeTab === 'account' && (
            <AccountTab initial={initialAccount} businessType={businessType} />
          )}
          {activeTab === 'invoice' && (
            <InvoiceTab />
          )}
          {activeTab === 'tax' && (
            <TaxTab initial={initialTax} />
          )}
          {activeTab === 'billing' && (
            <BillingTab />
          )}
          {activeTab === 'danger' && (
            <DangerZoneTab businessType={businessType} />
          )}
        </div>
      </div>
    </div>
  );
}
