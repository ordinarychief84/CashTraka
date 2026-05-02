'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Shield, CreditCard, Palette, AlertTriangle, Store, FileText } from 'lucide-react';
import { ProfileTab } from './ProfileTab';
import { AccountTab } from './AccountTab';
import { BillingTab } from './BillingTab';
import { AppearanceTab } from './AppearanceTab';
import { DangerZoneTab } from './DangerZoneTab';
import { StorefrontTab } from './StorefrontTab';
import { TaxTab } from './TaxTab';

type Tab = 'profile' | 'account' | 'storefront' | 'tax' | 'billing' | 'appearance' | 'danger';

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'storefront', label: 'Storefront', icon: Store },
  { id: 'tax', label: 'Tax & FIRS', icon: FileText },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'appearance', label: 'Appearance', icon: Palette },
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
  initialStorefront: {
    slug: string;
    catalogEnabled: boolean;
    catalogTagline: string;
    receiptPrefix: string;
    appUrl: string;
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
  initialStorefront,
  initialTax,
  businessType,
}: Props) {
  const search = useSearchParams();
  const initialTab = ((search.get('tab') as Tab) || 'profile') as Tab;
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Update if the URL changes externally (e.g. clicking nav links)
  useEffect(() => {
    const t = (search.get('tab') as Tab) || 'profile';
    setActiveTab(t);
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
          {activeTab === 'storefront' && (
            <StorefrontTab initial={initialStorefront} />
          )}
          {activeTab === 'tax' && (
            <TaxTab initial={initialTax} />
          )}
          {activeTab === 'billing' && (
            <BillingTab />
          )}
          {activeTab === 'appearance' && (
            <AppearanceTab />
          )}
          {activeTab === 'danger' && (
            <DangerZoneTab businessType={businessType} />
          )}
        </div>
      </div>
    </div>
  );
}
