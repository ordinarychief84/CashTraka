import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { LanguagesManager, type LanguageRow } from '@/components/settings/LanguagesManager';
import { languagesService } from '@/lib/services/settings-extras.service';

export const dynamic = 'force-dynamic';

export default async function SettingsLanguagesPage() {
  const user = await guardWithPermission('settings.read');
  // listForUser lazily seeds English + French on the user's first
  // visit — CashTraka is Africa-first; ECOWAS spans both Anglophone
  // (Nigeria/Ghana/SL/Gambia/Liberia) and Francophone markets.
  const rows = await languagesService.listForUser(user.id);
  const initial: LanguageRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
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
          <div className="mb-5">
            <h1 className="text-xl font-bold text-ink md:text-2xl">Languages</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Languages available for customer-facing documents (invoices,
              receipts, reminders). Every workspace ships with English and
              Français pre-configured to cover Anglophone and Francophone
              West Africa.
            </p>
          </div>

          <LanguagesManager initialRows={initial} />
        </div>
      </div>
    </AppShell>
  );
}
