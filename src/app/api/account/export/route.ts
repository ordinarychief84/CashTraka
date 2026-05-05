import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { securityLog } from '@/lib/security-log';

export const runtime = 'nodejs';

/**
 * GET /api/account/export — NDPR data-portability download.
 *
 * The Nigerian Data Protection Regulation gives every data subject the right
 * to receive their personal data in a structured, commonly-used, and
 * machine-readable format. This endpoint produces a single JSON file that
 * bundles every record this user owns across the platform — so they can move
 * to a competitor, archive their books, or just satisfy themselves that they
 * know what we have.
 *
 * Critically: this is a legal right, not a feature. It is **not** gated by
 * plan tier. Every authenticated owner can call it.
 *
 * Rate limit: 3 calls per IP per hour. The export is large enough that
 * scraping it as a polling loop would be expensive for both sides.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = clientIp(req);
  const limited = await rateLimit(`account-export:${user.id}`, ip, {
    max: 3,
    windowMs: 60 * 60_000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: `Too many export attempts. Try again in ${Math.ceil(limited.retryAfter / 60)} min.` },
      { status: 429 },
    );
  }

  const userId = user.id;

  // Pull everything the user owns. Each query is owner-scoped via userId.
  // Sensitive secrets (passwordHash, Paystack codes, TOTP secrets, invite
  // tokens) are stripped from the user profile below — they're for the
  // platform's bookkeeping, not the user's records.
  const [
    profile,
    customers,
    payments,
    paymentItems,
    debts,
    invoices,
    invoiceItems,
    expenses,
    sales,
    saleItems,
    products,
    receipts,
    paymentRequests,
    promiseToPays,
    promisePayments,
    installmentPlans,
    installmentCharges,
    vatReturns,
    creditNotes,
    offers,
    offerItems,
    orderConfirmations,
    refunds,
    staffMembers,
    staffPayments,
    properties,
    tenants,
    rentPayments,
    feedbacks,
    catalogEvents,
    documentArchives,
    notifications,
    linkedBankAccounts,
    bankTransactions,
    virtualAccounts,
    albums,
    reminderRules,
    reminderLogs,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        businessAddress: true,
        businessType: true,
        whatsappNumber: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
        receiptFooter: true,
        receiptPrefix: true,
        invoicePrefix: true,
        slug: true,
        catalogEnabled: true,
        catalogTagline: true,
        tin: true,
        vatRegistered: true,
        vatRate: true,
        plan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        personalBudgetWeekly: true,
        personalBudgetMonthly: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        deletedAt: true,
        // Explicitly omitted: passwordHash, paystackCustomerCode,
        // paystackSubscriptionCode, pendingPlan, isSuspended, role,
        // firsMerchantId, anything else that is platform-internal.
      },
    }),
    prisma.customer.findMany({ where: { userId } }),
    prisma.payment.findMany({ where: { userId } }),
    prisma.paymentItem.findMany({ where: { payment: { userId } } }),
    prisma.debt.findMany({ where: { userId } }),
    prisma.invoice.findMany({ where: { userId } }),
    prisma.invoiceItem.findMany({ where: { invoice: { userId } } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.sale.findMany({ where: { userId } }),
    prisma.saleItem.findMany({ where: { sale: { userId } } }),
    prisma.product.findMany({ where: { userId } }),
    prisma.receipt.findMany({ where: { userId } }),
    prisma.paymentRequest.findMany({ where: { userId } }),
    prisma.promiseToPay.findMany({ where: { userId } }),
    prisma.promisePayment.findMany({ where: { promiseToPay: { userId } } }),
    prisma.installmentPlan.findMany({ where: { userId } }),
    prisma.installmentCharge.findMany({ where: { userId } }),
    prisma.vatReturn.findMany({ where: { userId } }),
    prisma.creditNote.findMany({ where: { userId } }),
    prisma.offer.findMany({ where: { userId } }),
    prisma.offerItem.findMany({ where: { offer: { userId } } }),
    prisma.orderConfirmation.findMany({ where: { userId } }),
    prisma.refund.findMany({ where: { userId } }),
    // Strip staff secrets (passwordHash, inviteToken).
    prisma.staffMember.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        accessRole: true,
        payType: true,
        payAmount: true,
        payAmountKobo: true,
        startDate: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
        nextOfKinName: true,
        nextOfKinPhone: true,
        notes: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.staffPayment.findMany({ where: { userId } }),
    prisma.property.findMany({ where: { userId } }),
    prisma.tenant.findMany({ where: { userId } }),
    prisma.rentPayment.findMany({ where: { userId } }),
    prisma.feedback.findMany({ where: { userId } }),
    prisma.catalogEvent.findMany({ where: { userId } }),
    prisma.documentArchive.findMany({ where: { userId } }),
    prisma.notification.findMany({ where: { userId } }),
    prisma.linkedBankAccount.findMany({ where: { userId } }),
    prisma.bankTransaction.findMany({ where: { account: { userId } } }),
    prisma.virtualAccount.findMany({ where: { userId } }),
    prisma.album.findMany({ where: { userId } }),
    prisma.reminderRule.findMany({ where: { userId } }),
    prisma.reminderLog.findMany({ where: { userId } }),
  ]);

  if (!profile) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  const exportPayload = {
    meta: {
      exportedAt: new Date().toISOString(),
      regulation: 'NDPR',
      schemaVersion: 1,
      notice:
        'This file contains every record CashTraka holds on you that is owned by your account. ' +
        'Some monetary fields appear in two columns during the kobo migration window — *Kobo is ' +
        'the canonical kobo integer, the bare field name is the legacy naira integer (multiply by 100 to compare). ' +
        'See docs/kobo-migration-plan.md in the CashTraka GitHub repo for context.',
    },
    profile,
    records: {
      customers,
      payments,
      paymentItems,
      debts,
      invoices,
      invoiceItems,
      expenses,
      sales,
      saleItems,
      products,
      receipts,
      paymentRequests,
      promiseToPays,
      promisePayments,
      installmentPlans,
      installmentCharges,
      vatReturns,
      creditNotes,
      offers,
      offerItems,
      orderConfirmations,
      refunds,
      staffMembers,
      staffPayments,
      properties,
      tenants,
      rentPayments,
      feedbacks,
      catalogEvents,
      documentArchives,
      notifications,
      linkedBankAccounts,
      bankTransactions,
      virtualAccounts,
      albums,
      reminderRules,
      reminderLogs,
    },
    counts: {
      customers: customers.length,
      payments: payments.length,
      paymentItems: paymentItems.length,
      debts: debts.length,
      invoices: invoices.length,
      invoiceItems: invoiceItems.length,
      expenses: expenses.length,
      sales: sales.length,
      saleItems: saleItems.length,
      products: products.length,
      receipts: receipts.length,
      paymentRequests: paymentRequests.length,
      promiseToPays: promiseToPays.length,
      promisePayments: promisePayments.length,
      installmentPlans: installmentPlans.length,
      installmentCharges: installmentCharges.length,
      vatReturns: vatReturns.length,
      creditNotes: creditNotes.length,
      offers: offers.length,
      offerItems: offerItems.length,
      orderConfirmations: orderConfirmations.length,
      refunds: refunds.length,
      staffMembers: staffMembers.length,
      staffPayments: staffPayments.length,
      properties: properties.length,
      tenants: tenants.length,
      rentPayments: rentPayments.length,
      feedbacks: feedbacks.length,
      catalogEvents: catalogEvents.length,
      documentArchives: documentArchives.length,
      notifications: notifications.length,
      linkedBankAccounts: linkedBankAccounts.length,
      bankTransactions: bankTransactions.length,
      virtualAccounts: virtualAccounts.length,
      albums: albums.length,
      reminderRules: reminderRules.length,
      reminderLogs: reminderLogs.length,
    },
  };

  // Audit trail. NDPR doesn't strictly require this but it's the kind of
  // event that should be findable post-incident.
  securityLog({
    event: 'NDPR_DATA_EXPORT',
    actorId: userId,
    ip,
    meta: {
      totalRecords: Object.values(exportPayload.counts).reduce((s, n) => s + n, 0),
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `cashtraka-data-${profile.id.slice(-8)}-${stamp}.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
