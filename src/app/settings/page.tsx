import { Suspense } from 'react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { SettingsForm } from '@/components/SettingsForm';
import { BillingCard } from '@/components/billing/BillingCard';
import { UpgradeModal } from '@/components/billing/UpgradeModal';
import { PersonalBudgetCard } from '@/components/PersonalBudgetCard';
import { billingService } from '@/lib/services/billing.service';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await guardWithPermission('settings.write');

  // Cheap check: if their trial ended, downgrade them before rendering the
  // Billing card so the UI reflects reality.
  await billingService.expireTrialIfNeeded(user);

  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType} accessRole={user.accessRole} principalName={user.principalName}>
      <PageHeader title="Settings" subtitle={user.email} />
      <div className="space-y-6">
        {/* Suspense gates the useSearchParams() inside BillingCard for SSR safety. */}
        <Suspense fallback={<div className="card h-28 p-5" />}>
          <BillingCard />
        </Suspense>
        <SettingsForm
          initial={{
            businessName: user.businessName || '',
            whatsappNumber: user.whatsappNumber || '',
            receiptFooter: user.receiptFooter || '',
            bankName: user.bankName || '',
            bankAccountNumber: user.bankAccountNumber || '',
            bankAccountName: user.bankAccountName || '',
            businessType: user.businessType || 'seller',
          }}
        />
        <PersonalBudgetCard
          initial={{
            weekly: user.personalBudgetWeekly ?? null,
            monthly: user.personalBudgetMonthly ?? null,
          }}
        />
      </div>
      <Suspense fallback={null}>
        <UpgradeModal />
      </Suspense>
    </AppShell>
  );
}
