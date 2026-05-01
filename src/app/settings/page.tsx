import { Suspense } from 'react';
import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsShell } from '@/components/settings/SettingsShell';
import { billingService } from '@/lib/services/billing.service';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await guardWithPermission('settings.write');
  await billingService.expireTrialIfNeeded(user);

  const initialProfile = {
    name: user.name || '',
    businessName: user.businessName || '',
    businessAddress: user.businessAddress || '',
    whatsappNumber: user.whatsappNumber || '',
    receiptFooter: user.receiptFooter || '',
    businessType: user.businessType || 'seller',
  };

  const initialAccount = {
    email: user.email,
    bankName: user.bankName || '',
    bankAccountNumber: user.bankAccountNumber || '',
    bankAccountName: user.bankAccountName || '',
  };

  const initialStorefront = {
    slug: user.slug || '',
    catalogEnabled: !!user.catalogEnabled,
    catalogTagline: user.catalogTagline || '',
    receiptPrefix: user.receiptPrefix || 'CT',
    appUrl: process.env.APP_URL || '',
  };

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-100" />}>
        <SettingsShell
          initialProfile={initialProfile}
          initialAccount={initialAccount}
          initialStorefront={initialStorefront}
          businessType={user.businessType || 'seller'}
        />
      </Suspense>
    </AppShell>
  );
}
