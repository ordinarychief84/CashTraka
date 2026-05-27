import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { CurrenciesManager, type CurrencyRow } from '@/components/settings/CurrenciesManager';
import { currenciesService } from '@/lib/services/currencies.service';

export const dynamic = 'force-dynamic';

export default async function SettingsCurrenciesPage() {
  const user = await guardWithPermission('settings.read');

  // listForUser() lazily seeds NGN as the default on first visit —
  // CashTraka is Africa-first, Nigeria first.
  const rows = await currenciesService.listForUser(user.id);
  const initial: CurrencyRow[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    exchangeRate: r.exchangeRate,
    isDefault: r.isDefault,
  }));

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <div className="flex flex-col md:flex-row md:min-h-[calc(100vh-8rem)] md:gap-6">
        <SettingsSubNav />
        <div className="flex-1 min-w-0">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink md:text-2xl">Currency</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Configure the currencies you invoice in. CashTraka starts every
                workspace with the Nigerian Naira (NGN) set as default —
                additional African and international currencies can be enabled
                and re-quoted relative to it.
              </p>
            </div>
          </div>

          <CurrenciesManager initialRows={initial} />

          <p className="mt-4 text-[11px] text-slate-400">
            Exchange rates are entered manually. CashTraka does not currently
            auto-refresh rates from an upstream feed — quote the live rate at
            the start of each accounting period.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
