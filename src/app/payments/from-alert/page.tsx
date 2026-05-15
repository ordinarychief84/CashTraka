import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { BankAlertIngestForm } from '@/components/payments/BankAlertIngestForm';

export const dynamic = 'force-dynamic';

export default async function FromAlertPage() {
  const user = await guard();

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Record from bank SMS"
        subtitle="Paste your bank alert — we'll extract the amount, sender, and reference, then create an unverified payment for you to confirm."
        backHref="/payments"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <BankAlertIngestForm />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold text-ink">How it works</h2>
          <ol className="list-decimal space-y-2 pl-4 text-sm text-slate-600">
            <li>Forward the bank-debit-alert SMS to yourself or copy it from your phone.</li>
            <li>Paste it on the left. The parser reads amount, payer name, bank, and reference.</li>
            <li>We create an unverified Payment row and try to match the payer to one of your existing customers.</li>
            <li>You confirm or edit on the next screen — nothing is auto-verified.</li>
          </ol>
          <hr className="my-4 border-border" />
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Supported banks
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            GTBank · UBA · Access · Zenith · First Bank · FCMB · Sterling · Stanbic · Wema / ALAT · Kuda · Opay · Palmpay · Moniepoint
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            Don't see your bank? The parser works on any SMS that includes the amount and a CR / credit indicator — most Nigerian banks follow that format.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
