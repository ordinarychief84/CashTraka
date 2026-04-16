import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { SettingsForm } from '@/components/SettingsForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await guard();
  return (
    <AppShell businessName={user.businessName} userName={user.name} businessType={user.businessType}>
      <PageHeader title="Settings" subtitle={user.email} />
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
    </AppShell>
  );
}
