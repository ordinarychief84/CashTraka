import { guardWithPermission } from '@/lib/guard-rbac';
import { AppShell } from '@/components/AppShell';
import { SettingsSubNav } from '@/components/SettingsSubNav';
import {
  GeneralSettingsTabs,
  type GeneralProfile,
  type AddressRow,
  type BankRow,
} from '@/components/settings/GeneralSettingsTabs';
import { prisma } from '@/lib/prisma';
import {
  addressesService,
  bankAccountsService,
} from '@/lib/services/company-book.service';

export const dynamic = 'force-dynamic';

/**
 * General settings landing — Rackbeat-style 4-tab layout
 * (Numbers / Information / Addresses / Banking).
 *
 * Next-number values for each entity are computed from existing
 * rows so they stay accurate without a separate sequence table.
 * The "General starting number" anchor on User is the seed used
 * when an entity table is empty.
 */
export default async function SettingsGeneralPage() {
  const user = await guardWithPermission('settings.write');

  const [
    customerOrderCount,
    invoiceCount,
    offerCount,
    purchaseOrderCount,
    purchaseInvoiceCount,
    receiptCount,
    addresses,
    bankAccounts,
  ] = await Promise.all([
    prisma.customerOrder.count({ where: { userId: user.id, deletedAt: null } }).catch(() => 0),
    prisma.invoice.count({ where: { userId: user.id } }).catch(() => 0),
    prisma.offer.count({ where: { userId: user.id } }).catch(() => 0),
    prisma.purchaseOrder.count({ where: { userId: user.id, deletedAt: null } }).catch(() => 0),
    // Until we have a dedicated supplierInvoice table, treat purchase orders
    // that have been billed as proxies. Approximation OK for the Numbers panel.
    prisma.purchaseOrder.count({ where: { userId: user.id, deletedAt: null, status: { in: ['SENT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED'] } } }).catch(() => 0),
    prisma.receipt.count({ where: { userId: user.id } }).catch(() => 0),
    addressesService.listForUser(user.id),
    bankAccountsService.listForUser(user.id),
  ]);

  const anchor = (user as any).generalStartingNumber ?? 1001;
  const initialProfile: GeneralProfile = {
    generalStartingNumber: anchor,
    nextOrderNumber:           anchor + customerOrderCount,
    nextInvoiceNumber:         anchor + invoiceCount,
    nextOfferNumber:           anchor + offerCount,
    nextPurchaseOrderNumber:   anchor + purchaseOrderCount,
    nextPurchaseInvoiceNumber: anchor + purchaseInvoiceCount,
    nextPurchaseReceiptNumber: anchor + receiptCount,

    businessName: user.businessName ?? '',
    vatNumber: (user as any).vatNumber ?? '',
    eanNumber: (user as any).eanNumber ?? '',
    businessAddress: user.businessAddress ?? '',
    street2: (user as any).street2 ?? '',
    postcode: (user as any).postcode ?? '',
    city: (user as any).city ?? '',
    country: (user as any).country ?? '',
    phoneNumber: (user as any).phoneNumber ?? '',
    email: user.email,
    website: (user as any).website ?? '',
  };

  const initialAddresses: AddressRow[] = addresses.map((a) => ({
    id: a.id,
    name: a.name,
    street: a.street,
    street2: a.street2,
    postcode: a.postcode,
    city: a.city,
    country: a.country,
    phone: a.phone,
    email: a.email,
    attention: a.attention,
    location: a.location,
  }));

  const initialBanks: BankRow[] = bankAccounts.map((b) => ({
    id: b.id,
    name: b.name,
    bankName: b.bankName,
    registrationNo: b.registrationNo,
    accountNumber: b.accountNumber,
    iban: b.iban,
    swift: b.swift,
    fiNumber: b.fiNumber,
    isDefault: b.isDefault,
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
            <h1 className="text-xl font-bold text-ink md:text-2xl">General settings</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Company profile, numbering, addresses and banking. Changes save
              automatically on blur.
            </p>
          </div>

          <GeneralSettingsTabs
            initialProfile={initialProfile}
            initialAddresses={initialAddresses}
            initialBanks={initialBanks}
          />

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} CashTraka Ltd. All rights reserved.</span>
            <span>Logged in as {user.name ?? 'Admin'}</span>
          </footer>
        </div>
      </div>
    </AppShell>
  );
}
