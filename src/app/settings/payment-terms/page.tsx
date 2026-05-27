import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import { TermsManager, type TermRow } from '@/components/settings/TermsManager';
import { paymentTermsService } from '@/lib/services/terms.service';

export const dynamic = 'force-dynamic';

export default async function SettingsPaymentTermsPage() {
  const user = await guardWithPermission('settings.read');
  const rows = await paymentTermsService.listForUser(user.id);
  const initial: TermRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    netDays: r.netDays,
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
          <div className="mb-5">
            <h1 className="text-xl font-bold text-ink">Payment terms</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              The payment windows you offer customers and suppliers (Net 30, Net 60,
              Immediate, …). Terms appear as options in the customer and supplier
              create forms.
            </p>
          </div>

          <TermsManager
            initialRows={initial}
            endpoint="payment-terms"
            showNetDays
            singular="payment term"
          />
        </div>
      </div>
    </AppShell>
  );
}
