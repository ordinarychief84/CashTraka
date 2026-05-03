import { Landmark } from 'lucide-react';
import { guard } from '@/lib/guard';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { effectivePlan, limitsFor } from '@/lib/plan-limits';
import { monoBankService } from '@/lib/services/mono-bank.service';
import { ConnectBankButton } from './ConnectBankButton';
import { LinkedAccountsList } from './LinkedAccountsList';
import { UnmatchedTransactionsList } from './UnmatchedTransactionsList';

export const dynamic = 'force-dynamic';

/**
 * Bank sync dashboard, Tax+ tier feature.
 *
 * Page surface:
 *   - "Connect a bank" button (Mono integration stub for now)
 *   - Linked accounts list with Sync + Disconnect actions
 *   - Unmatched transactions list (last 100) with a "Match to invoice"
 *     inline picker per row.
 *
 * If the seller's plan does not include `bankSync`, render a soft
 * upgrade nudge instead of the controls so the page still loads
 * cleanly for downgraded users.
 */
export default async function BanksPage() {
  const user = await guard();
  const eff = effectivePlan(user);
  const limits = limitsFor(eff.plan);

  if (!limits.bankSync) {
    return (
      <AppShell
        businessName={user.businessName}
        userName={user.name}
        businessType={user.businessType}
        accessRole={user.accessRole}
        principalName={user.principalName}
      >
        <PageHeader
          title="Bank sync"
          subtitle="Connect your bank to auto-match transactions to invoices."
        />
        <EmptyState
          icon={Landmark}
          title="Bank sync is part of Tax+"
          description="Upgrade to the Tax+ tier to link your bank account, pull transactions automatically, and reconcile against invoices."
          actionHref="/settings?upgrade=tax_plus_quarterly"
          actionLabel="See Tax+ plans"
        />
      </AppShell>
    );
  }

  const [accounts, transactions] = await Promise.all([
    monoBankService.listLinkedAccounts(user.id),
    monoBankService.listTransactions(user.id, { matchStatus: 'UNMATCHED', limit: 100 }),
  ]);

  return (
    <AppShell
      businessName={user.businessName}
      userName={user.name}
      businessType={user.businessType}
      accessRole={user.accessRole}
      principalName={user.principalName}
    >
      <PageHeader
        title="Bank sync"
        subtitle="Connect your bank to auto-match transactions to invoices. No more pasting bank SMS."
        action={<ConnectBankButton />}
      />

      <section className="mb-6">
        <div className="mb-2 text-sm font-semibold text-ink">Linked accounts</div>
        {accounts.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No linked accounts yet"
            description="Connect a bank account to start auto-matching transactions to your invoices."
          />
        ) : (
          <LinkedAccountsList
            accounts={accounts.map((a) => ({
              id: a.id,
              bankName: a.bankName,
              accountName: a.accountName,
              accountNumber: a.accountNumber,
              status: a.status,
              lastSyncAt: a.lastSyncAt ? a.lastSyncAt.toISOString() : null,
              errorMessage: a.errorMessage,
            }))}
          />
        )}
      </section>

      <section>
        <div className="mb-2 text-sm font-semibold text-ink">Unmatched transactions</div>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-slate-500">
            No unmatched transactions. New credits and debits land here after a sync.
          </div>
        ) : (
          <UnmatchedTransactionsList
            transactions={transactions.map((t) => ({
              id: t.id,
              direction: t.direction,
              amountKobo: t.amountKobo,
              description: t.description,
              reference: t.reference,
              occurredAt: t.occurredAt.toISOString(),
            }))}
          />
        )}
      </section>
    </AppShell>
  );
}
