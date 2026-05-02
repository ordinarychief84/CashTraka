import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { ManualReceiptForm } from '@/components/receipts/ManualReceiptForm';

export const dynamic = 'force-dynamic';

export default async function NewReceiptPage() {
  const user = await guard();

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <ManualReceiptForm
        sellerVatRegistered={!!user.vatRegistered}
        sellerVatRate={typeof user.vatRate === 'number' ? user.vatRate : 7.5}
        sellerHasTin={!!user.tin}
      />
    </AppShell>
  );
}
