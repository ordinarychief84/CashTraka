import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

/**
 * One-time migration endpoint to fix missing columns.
 * Adds any columns that exist in the Prisma schema but are missing from the actual DB.
 * Uses "ADD COLUMN IF NOT EXISTS" so it's safe to run multiple times.
 *
 * PROTECTED: requires CRON_SECRET as Bearer token. Query string fallback was
 * removed — secrets in URLs leak via referrers and access logs.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results: string[] = [];

  // Helper: safely add a column
  async function addCol(table: string, col: string, type: string, dflt?: string) {
    try {
      const defaultClause = dflt !== undefined ? ` DEFAULT ${dflt}` : '';
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${type}${defaultClause}`
      );
      results.push(`OK: ${table}.${col}`);
    } catch (e: any) {
      results.push(`FAIL: ${table}.${col} - ${e.message?.substring(0, 100)}`);
    }
  }

  // ===== User table missing columns =====
  await addCol('User', 'role', 'TEXT NOT NULL', "'USER'");
  await addCol('User', 'isSuspended', 'BOOLEAN NOT NULL', 'false');
  await addCol('User', 'plan', 'TEXT NOT NULL', "'free'");
  await addCol('User', 'businessName', 'TEXT', 'NULL');
  await addCol('User', 'whatsappNumber', 'TEXT', 'NULL');
  await addCol('User', 'receiptFooter', 'TEXT', 'NULL');
  await addCol('User', 'businessAddress', 'TEXT', 'NULL');
  await addCol('User', 'logoUrl', 'TEXT', 'NULL');
  await addCol('User', 'bankName', 'TEXT', 'NULL');
  await addCol('User', 'bankAccountNumber', 'TEXT', 'NULL');
  await addCol('User', 'bankAccountName', 'TEXT', 'NULL');
  await addCol('User', 'subscriptionStatus', 'TEXT NOT NULL', "'free'");
  await addCol('User', 'trialEndsAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('User', 'currentPeriodEnd', 'TIMESTAMP(3)', 'NULL');
  await addCol('User', 'paystackCustomerCode', 'TEXT', 'NULL');
  await addCol('User', 'paystackSubscriptionCode', 'TEXT', 'NULL');
  await addCol('User', 'pendingPlan', 'TEXT', 'NULL');
  await addCol('User', 'personalBudgetWeekly', 'INTEGER', 'NULL');
  await addCol('User', 'personalBudgetMonthly', 'INTEGER', 'NULL');

  // ===== Customer table =====
  await addCol('Customer', 'totalPaid', 'INTEGER NOT NULL', '0');
  await addCol('Customer', 'totalOwed', 'INTEGER NOT NULL', '0');
  await addCol('Customer', 'lastActivityAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Customer', 'notes', 'TEXT', 'NULL');
  await addCol('Customer', 'tags', 'TEXT', 'NULL');
  await addCol('Customer', 'behaviorTag', 'TEXT', 'NULL');
  await addCol('Customer', 'avgPayDays', 'DOUBLE PRECISION', 'NULL');
  await addCol('Customer', 'totalReminders', 'INTEGER NOT NULL', '0');
  await addCol('Customer', 'lastRemindedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Customer', 'transactionCount', 'INTEGER NOT NULL', '0');

  // ===== Payment table =====
  await addCol('Payment', 'notes', 'TEXT', 'NULL');
  await addCol('Payment', 'channel', 'TEXT', 'NULL');
  await addCol('Payment', 'receiptNumber', 'TEXT', 'NULL');

  // ===== Debt table =====
  await addCol('Debt', 'notes', 'TEXT', 'NULL');
  await addCol('Debt', 'reminderSentAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Debt', 'autoRemind', 'BOOLEAN NOT NULL', 'false');

  // ===== Product table =====
  await addCol('Product', 'description', 'TEXT', 'NULL');
  await addCol('Product', 'isActive', 'BOOLEAN NOT NULL', 'true');

  // ===== Expense table =====
  await addCol('Expense', 'isPersonal', 'BOOLEAN NOT NULL', 'false');
  // Tax+ tier: input VAT (kobo) the seller paid on this expense.
  await addCol('Expense', 'vatPaid', 'INTEGER NOT NULL', '0');

  // ===== Invoice table =====
  await addCol('Invoice', 'paidAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Invoice', 'publicToken', 'TEXT', 'NULL');
  await addCol('Invoice', 'taxRate', 'DOUBLE PRECISION', 'NULL');
  await addCol('Invoice', 'discountAmount', 'INTEGER', 'NULL');
  await addCol('Invoice', 'notes', 'TEXT', 'NULL');
  await addCol('Invoice', 'currency', 'TEXT NOT NULL', "'NGN'");

  // ===== StaffMember table =====
  await addCol('StaffMember', 'accessRole', 'TEXT NOT NULL', "'NONE'");
  await addCol('StaffMember', 'passwordHash', 'TEXT', 'NULL');
  await addCol('StaffMember', 'status', 'TEXT NOT NULL', "'active'");
  await addCol('StaffMember', 'inviteToken', 'TEXT', 'NULL');
  await addCol('StaffMember', 'invitedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('StaffMember', 'joinedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('StaffMember', 'lastClockIn', 'TIMESTAMP(3)', 'NULL');
  await addCol('StaffMember', 'phone', 'TEXT', 'NULL');

  // ===== ClockEntry table =====
  await addCol('ClockEntry', 'note', 'TEXT', 'NULL');
  await addCol('ClockEntry', 'approvedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('ClockEntry', 'approvedBy', 'TEXT', 'NULL');

  // ===== Tenant table =====
  await addCol('Tenant', 'leaseStart', 'TIMESTAMP(3)', 'NULL');
  await addCol('Tenant', 'leaseEnd', 'TIMESTAMP(3)', 'NULL');
  await addCol('Tenant', 'deposit', 'INTEGER', 'NULL');
  await addCol('Tenant', 'notes', 'TEXT', 'NULL');
  await addCol('Tenant', 'isActive', 'BOOLEAN NOT NULL', 'true');

  // ===== Property table =====
  await addCol('Property', 'units', 'INTEGER NOT NULL', '1');
  await addCol('Property', 'notes', 'TEXT', 'NULL');

  // ===== RentPayment table =====
  await addCol('RentPayment', 'notes', 'TEXT', 'NULL');
  await addCol('RentPayment', 'receiptNumber', 'TEXT', 'NULL');

  // ===== FraudReport table =====
  await addCol('FraudReport', 'evidence', 'TEXT', 'NULL');
  await addCol('FraudReport', 'resolution', 'TEXT', 'NULL');
  await addCol('FraudReport', 'resolvedAt', 'TIMESTAMP(3)', 'NULL');

  // ===== Receipt Engine + Sell + NRS Invoice extensions (2026-05-01) =====
  // Receipt Engine
  await addCol('User', 'receiptPrefix', 'TEXT', "'CT'");
  await addCol('User', 'slug', 'TEXT', 'NULL');
  await addCol('User', 'catalogEnabled', 'BOOLEAN NOT NULL', 'false');
  await addCol('User', 'catalogTagline', 'TEXT', 'NULL');

  await addCol('Receipt', 'balanceRemaining', 'INTEGER', 'NULL');
  await addCol('Receipt', 'source', 'TEXT NOT NULL', "'MANUAL'");

  // Sell (catalog) — extends Product
  await addCol('Product', 'images', 'TEXT[] NOT NULL', "'{}'");
  await addCol('Product', 'sku', 'TEXT', 'NULL');
  await addCol('Product', 'isPublished', 'BOOLEAN NOT NULL', 'false');
  await addCol('Product', 'catalogStatus', 'TEXT NOT NULL', "'AVAILABLE'");

  // Invoices (legacy NRS field names — kept for backwards compat; new code uses firs* below)
  await addCol('Invoice', 'paymentId', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsSubmissionId', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsStatus', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsLastError', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsRetryCount', 'INTEGER NOT NULL', '0');
  await addCol('Invoice', 'nrsSubmittedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Invoice', 'nrsAcceptedAt', 'TIMESTAMP(3)', 'NULL');

  // ===== Nigerian tax / FIRS e-invoicing compliance (2026-05-01) =====
  // User: TIN, VAT registration, FIRS merchant ID
  await addCol('User', 'tin', 'TEXT', 'NULL');
  await addCol('User', 'vatRegistered', 'BOOLEAN NOT NULL', 'false');
  await addCol('User', 'vatRate', 'DOUBLE PRECISION NOT NULL', '7.5');
  await addCol('User', 'firsMerchantId', 'TEXT', 'NULL');

  // Invoice: buyer details, VAT snapshot, currency, FIRS submission state
  await addCol('Invoice', 'buyerTin', 'TEXT', 'NULL');
  await addCol('Invoice', 'buyerAddress', 'TEXT', 'NULL');
  await addCol('Invoice', 'vatApplied', 'BOOLEAN NOT NULL', 'false');
  await addCol('Invoice', 'vatRate', 'DOUBLE PRECISION NOT NULL', '0');
  // currency is already added above (line ~85), no-op re-run is safe
  await addCol('Invoice', 'firsTransmissionRef', 'TEXT', 'NULL');
  await addCol('Invoice', 'firsIrn', 'TEXT', 'NULL');
  await addCol('Invoice', 'firsQrPayload', 'TEXT', 'NULL');
  await addCol('Invoice', 'firsStatus', 'TEXT', 'NULL');
  await addCol('Invoice', 'firsLastError', 'TEXT', 'NULL');
  await addCol('Invoice', 'firsRetryCount', 'INTEGER NOT NULL', '0');
  await addCol('Invoice', 'firsSubmittedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Invoice', 'firsAcceptedAt', 'TIMESTAMP(3)', 'NULL');

  // InvoiceItem: classification + HS code + VAT-exempt flag
  await addCol('InvoiceItem', 'itemType', 'TEXT NOT NULL', "'GOODS'");
  await addCol('InvoiceItem', 'hsCode', 'TEXT', 'NULL');
  await addCol('InvoiceItem', 'vatExempt', 'BOOLEAN NOT NULL', 'false');

  // ===== Yupoo-style albums (2026-05-02) =====
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Album" (
        "id"               TEXT        NOT NULL,
        "userId"           TEXT        NOT NULL,
        "slug"             TEXT        NOT NULL,
        "title"            TEXT        NOT NULL,
        "description"      TEXT,
        "coverImageUrl"    TEXT,
        "passcodeRequired" BOOLEAN     NOT NULL DEFAULT false,
        "passcodeHash"     TEXT,
        "isPublished"      BOOLEAN     NOT NULL DEFAULT true,
        "position"         INTEGER     NOT NULL DEFAULT 0,
        "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"        TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push('OK: Album table');
  } catch (e: any) {
    results.push('FAIL: Album table - ' + e.message?.substring(0, 100));
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AlbumProduct" (
        "albumId"   TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        "position"  INTEGER NOT NULL DEFAULT 0,
        "addedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AlbumProduct_pkey" PRIMARY KEY ("albumId", "productId")
      )
    `);
    results.push('OK: AlbumProduct table');
  } catch (e: any) {
    results.push('FAIL: AlbumProduct table - ' + e.message?.substring(0, 100));
  }

  const albumIndexes: Array<[string, string]> = [
    ['Album_userId_slug_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Album_userId_slug_key" ON "Album"("userId", "slug")`],
    ['Album_userId_isPublished_idx', `CREATE INDEX IF NOT EXISTS "Album_userId_isPublished_idx" ON "Album"("userId", "isPublished")`],
    ['AlbumProduct_albumId_position_idx', `CREATE INDEX IF NOT EXISTS "AlbumProduct_albumId_position_idx" ON "AlbumProduct"("albumId", "position")`],
    ['AlbumProduct_productId_idx', `CREATE INDEX IF NOT EXISTS "AlbumProduct_productId_idx" ON "AlbumProduct"("productId")`],
  ];
  for (const [name, sql] of albumIndexes) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push('OK: ' + name);
    } catch (e: any) {
      results.push('INDEX FAIL: ' + name + ' - ' + e.message?.substring(0, 80));
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Album_userId_fkey') THEN
          ALTER TABLE "Album" ADD CONSTRAINT "Album_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AlbumProduct_albumId_fkey') THEN
          ALTER TABLE "AlbumProduct" ADD CONSTRAINT "AlbumProduct_albumId_fkey"
            FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AlbumProduct_productId_fkey') THEN
          ALTER TABLE "AlbumProduct" ADD CONSTRAINT "AlbumProduct_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    results.push('OK: Album + AlbumProduct foreign keys');
  } catch (e: any) {
    results.push('FK FAIL: Album/AlbumProduct - ' + e.message?.substring(0, 100));
  }

  // ===== Full invoicing upgrade (2026-05-02) =====
  // User: invoice settings
  await addCol('User', 'defaultCurrency', 'TEXT NOT NULL', "'NGN'");
  await addCol('User', 'invoicePrefix', 'TEXT', "'INV'");
  await addCol('User', 'creditNotePrefix', 'TEXT', "'CN'");
  await addCol('User', 'offerPrefix', 'TEXT', "'OFF'");
  await addCol('User', 'deliveryNotePrefix', 'TEXT', "'DN'");
  await addCol('User', 'orderPrefix', 'TEXT', "'ORD'");
  await addCol('User', 'taxEnabled', 'BOOLEAN NOT NULL', 'false');
  await addCol('User', 'paymentInstructions', 'TEXT', 'NULL');
  await addCol('User', 'invoiceAccentColor', 'TEXT', "'#00B8E8'");
  await addCol('User', 'invoiceTemplate', 'TEXT', "'professional'");

  // Workflow defaults — per-user preferences inside an unlocked plan.
  await addCol('User', 'firsAutoSubmit', 'BOOLEAN NOT NULL', 'false');
  await addCol('User', 'defaultInvoiceDueDays', 'INTEGER', 'NULL');
  await addCol('User', 'defaultPaymentTerms', 'VARCHAR(120)', 'NULL');
  await addCol('User', 'invoiceReminderCadence', 'TEXT NOT NULL', "'OFF'");
  await addCol('User', 'autoArchiveDays', 'INTEGER', 'NULL');
  await addCol('User', 'recurringAutoSendDefault', 'BOOLEAN NOT NULL', 'false');
  await addCol('User', 'xmlGenerateOnFirs', 'BOOLEAN NOT NULL', 'true');
  await addCol('User', 'documentRetentionMonths', 'INTEGER NOT NULL', '72');

  // Service Check (customer feedback) — per-user toggles + template.
  await addCol('User', 'autoSendFeedback', 'BOOLEAN NOT NULL', 'false');
  await addCol('User', 'feedbackAfterReceipt', 'BOOLEAN NOT NULL', 'true');
  await addCol('User', 'feedbackAfterPayment', 'BOOLEAN NOT NULL', 'true');
  await addCol('User', 'feedbackAfterInvoicePaid', 'BOOLEAN NOT NULL', 'true');
  await addCol('User', 'feedbackLinkExpiryDays', 'INTEGER', '14');
  await addCol('User', 'feedbackMessageTemplate', 'TEXT', 'NULL');

  // Platform fee opt-in (1% take rate, capped at ₦5,000 per transaction).
  await addCol('User', 'platformFeeOptIn', 'BOOLEAN NOT NULL', 'false');

  // Tax+ two-person rule: optional second-approver staff id on a credit note.
  await addCol('CreditNote', 'approvedById', 'TEXT', 'NULL');

  // Invoice: extra columns
  await addCol('Invoice', 'discount', 'INTEGER NOT NULL', '0');
  await addCol('Invoice', 'paymentTerms', 'TEXT', 'NULL');
  await addCol('Invoice', 'amountPaid', 'INTEGER NOT NULL', '0');
  await addCol('Invoice', 'viewedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Invoice', 'sentAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Invoice', 'publicToken', 'TEXT', 'NULL');
  await addCol('Invoice', 'xmlUrl', 'TEXT', 'NULL');
  await addCol('Invoice', 'xmlGeneratedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Invoice', 'electronicStatus', 'TEXT', 'NULL');
  await addCol('Invoice', 'recurringRuleId', 'TEXT', 'NULL');

  // New tables
  const newTables: Array<[string, string]> = [
    [
      'InvoiceReminder',
      `CREATE TABLE IF NOT EXISTS "InvoiceReminder" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
         "type" TEXT NOT NULL DEFAULT 'FRIENDLY_REMINDER',
         "channel" TEXT NOT NULL, "message" TEXT NOT NULL,
         "sentAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'QUEUED',
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "InvoiceReminder_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'CreditNote',
      `CREATE TABLE IF NOT EXISTS "CreditNote" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "invoiceId" TEXT NOT NULL,
         "creditNoteNumber" TEXT NOT NULL, "reason" TEXT,
         "subtotal" INTEGER NOT NULL DEFAULT 0,
         "taxAmount" INTEGER NOT NULL DEFAULT 0,
         "total" INTEGER NOT NULL DEFAULT 0,
         "pdfUrl" TEXT, "publicToken" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'RecurringInvoiceRule',
      `CREATE TABLE IF NOT EXISTS "RecurringInvoiceRule" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "customerId" TEXT,
         "frequency" TEXT NOT NULL,
         "startDate" TIMESTAMP(3) NOT NULL,
         "nextRunAt" TIMESTAMP(3) NOT NULL,
         "endDate" TIMESTAMP(3),
         "autoSend" BOOLEAN NOT NULL DEFAULT false,
         "status" TEXT NOT NULL DEFAULT 'ACTIVE',
         "templateData" TEXT NOT NULL,
         "runsCompleted" INTEGER NOT NULL DEFAULT 0,
         "lastRunAt" TIMESTAMP(3), "lastRunError" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "updatedAt" TIMESTAMP(3) NOT NULL,
         CONSTRAINT "RecurringInvoiceRule_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'DeliveryNote',
      `CREATE TABLE IF NOT EXISTS "DeliveryNote" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "customerId" TEXT,
         "customerName" TEXT NOT NULL, "customerPhone" TEXT, "customerAddress" TEXT,
         "deliveryNoteNumber" TEXT NOT NULL,
         "status" TEXT NOT NULL DEFAULT 'DRAFT',
         "deliveryDate" TIMESTAMP(3), "notes" TEXT, "pdfUrl" TEXT,
         "convertedInvoiceId" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "updatedAt" TIMESTAMP(3) NOT NULL,
         CONSTRAINT "DeliveryNote_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'DeliveryNoteItem',
      `CREATE TABLE IF NOT EXISTS "DeliveryNoteItem" (
         "id" TEXT NOT NULL, "deliveryNoteId" TEXT NOT NULL, "productId" TEXT,
         "description" TEXT NOT NULL,
         "quantity" INTEGER NOT NULL DEFAULT 1,
         CONSTRAINT "DeliveryNoteItem_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'Offer',
      `CREATE TABLE IF NOT EXISTS "Offer" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "customerId" TEXT,
         "customerName" TEXT NOT NULL, "customerPhone" TEXT, "customerEmail" TEXT,
         "offerNumber" TEXT NOT NULL,
         "status" TEXT NOT NULL DEFAULT 'DRAFT',
         "validUntil" TIMESTAMP(3),
         "subtotal" INTEGER NOT NULL DEFAULT 0,
         "taxAmount" INTEGER NOT NULL DEFAULT 0,
         "total" INTEGER NOT NULL DEFAULT 0,
         "notes" TEXT, "pdfUrl" TEXT, "publicToken" TEXT,
         "convertedInvoiceId" TEXT,
         "convertedOrderConfirmationId" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "updatedAt" TIMESTAMP(3) NOT NULL,
         CONSTRAINT "Offer_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'OfferItem',
      `CREATE TABLE IF NOT EXISTS "OfferItem" (
         "id" TEXT NOT NULL, "offerId" TEXT NOT NULL, "productId" TEXT,
         "description" TEXT NOT NULL,
         "unitPrice" INTEGER NOT NULL,
         "quantity" INTEGER NOT NULL DEFAULT 1,
         CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'OrderConfirmation',
      `CREATE TABLE IF NOT EXISTS "OrderConfirmation" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "offerId" TEXT,
         "customerId" TEXT, "customerName" TEXT NOT NULL,
         "orderNumber" TEXT NOT NULL,
         "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
         "total" INTEGER NOT NULL DEFAULT 0,
         "notes" TEXT, "pdfUrl" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "updatedAt" TIMESTAMP(3) NOT NULL,
         CONSTRAINT "OrderConfirmation_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'DocumentArchive',
      `CREATE TABLE IF NOT EXISTS "DocumentArchive" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL,
         "documentType" TEXT NOT NULL, "documentId" TEXT NOT NULL,
         "documentNumber" TEXT, "pdfUrl" TEXT, "xmlUrl" TEXT,
         "status" TEXT NOT NULL DEFAULT 'ACTIVE',
         "retentionUntil" TIMESTAMP(3),
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "DocumentArchive_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'DocumentAuditLog',
      `CREATE TABLE IF NOT EXISTS "DocumentAuditLog" (
         "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "actorId" TEXT,
         "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL,
         "action" TEXT NOT NULL, "metadata" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id"))`,
    ],
    [
      'Feedback',
      `CREATE TABLE IF NOT EXISTS "Feedback" (
         "id" TEXT NOT NULL,
         "userId" TEXT NOT NULL,
         "customerId" TEXT,
         "paymentId" TEXT,
         "receiptId" TEXT,
         "invoiceId" TEXT,
         "rating" TEXT NOT NULL,
         "reason" TEXT,
         "comment" TEXT,
         "source" TEXT NOT NULL,
         "publicToken" TEXT NOT NULL,
         "submittedAt" TIMESTAMP(3),
         "expiresAt" TIMESTAMP(3),
         "isNegative" BOOLEAN NOT NULL DEFAULT false,
         "isResolved" BOOLEAN NOT NULL DEFAULT false,
         "resolvedAt" TIMESTAMP(3),
         "responseAction" TEXT,
         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
         "updatedAt" TIMESTAMP(3) NOT NULL,
         CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id"))`,
    ],
  ];

  for (const [name, sql] of newTables) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push('OK: ' + name + ' table');
    } catch (e: any) {
      results.push('FAIL: ' + name + ' table - ' + e.message?.substring(0, 100));
    }
  }

  // Indexes for the new tables
  const newInvoicingIndexes: Array<[string, string]> = [
    ['Invoice_publicToken_key2', `CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_publicToken_key2" ON "Invoice"("publicToken") WHERE "publicToken" IS NOT NULL`],
    ['Invoice_userId_dueDate_idx', `CREATE INDEX IF NOT EXISTS "Invoice_userId_dueDate_idx" ON "Invoice"("userId", "dueDate")`],
    ['Invoice_userId_status_idx', `CREATE INDEX IF NOT EXISTS "Invoice_userId_status_idx" ON "Invoice"("userId", "status")`],
    ['Invoice_recurringRuleId_idx', `CREATE INDEX IF NOT EXISTS "Invoice_recurringRuleId_idx" ON "Invoice"("recurringRuleId")`],
    ['CreditNote_creditNoteNumber_key', `CREATE UNIQUE INDEX IF NOT EXISTS "CreditNote_creditNoteNumber_key" ON "CreditNote"("creditNoteNumber")`],
    ['CreditNote_publicToken_key', `CREATE UNIQUE INDEX IF NOT EXISTS "CreditNote_publicToken_key" ON "CreditNote"("publicToken") WHERE "publicToken" IS NOT NULL`],
    ['CreditNote_userId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "CreditNote_userId_createdAt_idx" ON "CreditNote"("userId", "createdAt")`],
    ['CreditNote_invoiceId_idx', `CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId")`],
    ['InvoiceReminder_userId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "InvoiceReminder_userId_createdAt_idx" ON "InvoiceReminder"("userId", "createdAt")`],
    ['InvoiceReminder_invoiceId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "InvoiceReminder_invoiceId_createdAt_idx" ON "InvoiceReminder"("invoiceId", "createdAt")`],
    ['RecurringInvoiceRule_userId_status_idx', `CREATE INDEX IF NOT EXISTS "RecurringInvoiceRule_userId_status_idx" ON "RecurringInvoiceRule"("userId", "status")`],
    ['RecurringInvoiceRule_nextRunAt_status_idx', `CREATE INDEX IF NOT EXISTS "RecurringInvoiceRule_nextRunAt_status_idx" ON "RecurringInvoiceRule"("nextRunAt", "status")`],
    ['DeliveryNote_deliveryNoteNumber_key', `CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryNote_deliveryNoteNumber_key" ON "DeliveryNote"("deliveryNoteNumber")`],
    ['DeliveryNote_convertedInvoiceId_key', `CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryNote_convertedInvoiceId_key" ON "DeliveryNote"("convertedInvoiceId") WHERE "convertedInvoiceId" IS NOT NULL`],
    ['DeliveryNote_userId_status_idx', `CREATE INDEX IF NOT EXISTS "DeliveryNote_userId_status_idx" ON "DeliveryNote"("userId", "status")`],
    ['DeliveryNote_userId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "DeliveryNote_userId_createdAt_idx" ON "DeliveryNote"("userId", "createdAt")`],
    ['DeliveryNoteItem_deliveryNoteId_idx', `CREATE INDEX IF NOT EXISTS "DeliveryNoteItem_deliveryNoteId_idx" ON "DeliveryNoteItem"("deliveryNoteId")`],
    ['Offer_offerNumber_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Offer_offerNumber_key" ON "Offer"("offerNumber")`],
    ['Offer_publicToken_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Offer_publicToken_key" ON "Offer"("publicToken") WHERE "publicToken" IS NOT NULL`],
    ['Offer_convertedInvoiceId_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Offer_convertedInvoiceId_key" ON "Offer"("convertedInvoiceId") WHERE "convertedInvoiceId" IS NOT NULL`],
    ['Offer_convertedOrderConfirmationId_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Offer_convertedOrderConfirmationId_key" ON "Offer"("convertedOrderConfirmationId") WHERE "convertedOrderConfirmationId" IS NOT NULL`],
    ['Offer_userId_status_idx', `CREATE INDEX IF NOT EXISTS "Offer_userId_status_idx" ON "Offer"("userId", "status")`],
    ['Offer_userId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "Offer_userId_createdAt_idx" ON "Offer"("userId", "createdAt")`],
    ['OfferItem_offerId_idx', `CREATE INDEX IF NOT EXISTS "OfferItem_offerId_idx" ON "OfferItem"("offerId")`],
    ['OrderConfirmation_orderNumber_key', `CREATE UNIQUE INDEX IF NOT EXISTS "OrderConfirmation_orderNumber_key" ON "OrderConfirmation"("orderNumber")`],
    ['OrderConfirmation_userId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "OrderConfirmation_userId_createdAt_idx" ON "OrderConfirmation"("userId", "createdAt")`],
    ['DocumentArchive_unique_doc', `CREATE UNIQUE INDEX IF NOT EXISTS "DocumentArchive_documentType_documentId_key" ON "DocumentArchive"("documentType", "documentId")`],
    ['DocumentArchive_userId_documentType_createdAt_idx', `CREATE INDEX IF NOT EXISTS "DocumentArchive_userId_documentType_createdAt_idx" ON "DocumentArchive"("userId", "documentType", "createdAt")`],
    ['DocumentArchive_userId_documentNumber_idx', `CREATE INDEX IF NOT EXISTS "DocumentArchive_userId_documentNumber_idx" ON "DocumentArchive"("userId", "documentNumber")`],
    ['DocumentAuditLog_entity_idx', `CREATE INDEX IF NOT EXISTS "DocumentAuditLog_entity_idx" ON "DocumentAuditLog"("userId", "entityType", "entityId", "createdAt")`],
    ['DocumentAuditLog_action_idx', `CREATE INDEX IF NOT EXISTS "DocumentAuditLog_action_idx" ON "DocumentAuditLog"("userId", "action", "createdAt")`],
    ['Feedback_publicToken_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Feedback_publicToken_key" ON "Feedback"("publicToken")`],
    ['Feedback_userId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt")`],
    ['Feedback_customerId_idx', `CREATE INDEX IF NOT EXISTS "Feedback_customerId_idx" ON "Feedback"("customerId")`],
    ['Feedback_receiptId_idx', `CREATE INDEX IF NOT EXISTS "Feedback_receiptId_idx" ON "Feedback"("receiptId")`],
    ['Feedback_paymentId_idx', `CREATE INDEX IF NOT EXISTS "Feedback_paymentId_idx" ON "Feedback"("paymentId")`],
    ['Feedback_rating_idx', `CREATE INDEX IF NOT EXISTS "Feedback_rating_idx" ON "Feedback"("rating")`],
    ['Feedback_userId_isNegative_idx', `CREATE INDEX IF NOT EXISTS "Feedback_userId_isNegative_idx" ON "Feedback"("userId", "isNegative")`],
    ['Feedback_userId_isResolved_idx', `CREATE INDEX IF NOT EXISTS "Feedback_userId_isResolved_idx" ON "Feedback"("userId", "isResolved")`],
  ];
  for (const [name, sql] of newInvoicingIndexes) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push('OK: ' + name);
    } catch (e: any) {
      results.push('INDEX FAIL: ' + name + ' - ' + e.message?.substring(0, 80));
    }
  }

  // Foreign keys for the new invoicing tables (idempotent via DO blocks)
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceReminder_userId_fkey') THEN
          ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceReminder_invoiceId_fkey') THEN
          ALTER TABLE "InvoiceReminder" ADD CONSTRAINT "InvoiceReminder_invoiceId_fkey"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreditNote_userId_fkey') THEN
          ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreditNote_invoiceId_fkey') THEN
          ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecurringInvoiceRule_userId_fkey') THEN
          ALTER TABLE "RecurringInvoiceRule" ADD CONSTRAINT "RecurringInvoiceRule_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_recurringRuleId_fkey') THEN
          ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recurringRuleId_fkey"
            FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringInvoiceRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DeliveryNote_userId_fkey') THEN
          ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DeliveryNote_customerId_fkey') THEN
          ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_customerId_fkey"
            FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DeliveryNoteItem_deliveryNoteId_fkey') THEN
          ALTER TABLE "DeliveryNoteItem" ADD CONSTRAINT "DeliveryNoteItem_deliveryNoteId_fkey"
            FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DeliveryNoteItem_productId_fkey') THEN
          ALTER TABLE "DeliveryNoteItem" ADD CONSTRAINT "DeliveryNoteItem_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Offer_userId_fkey') THEN
          ALTER TABLE "Offer" ADD CONSTRAINT "Offer_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Offer_customerId_fkey') THEN
          ALTER TABLE "Offer" ADD CONSTRAINT "Offer_customerId_fkey"
            FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OfferItem_offerId_fkey') THEN
          ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_offerId_fkey"
            FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OfferItem_productId_fkey') THEN
          ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderConfirmation_userId_fkey') THEN
          ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderConfirmation_offerId_fkey') THEN
          ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_offerId_fkey"
            FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrderConfirmation_customerId_fkey') THEN
          ALTER TABLE "OrderConfirmation" ADD CONSTRAINT "OrderConfirmation_customerId_fkey"
            FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentArchive_userId_fkey') THEN
          ALTER TABLE "DocumentArchive" ADD CONSTRAINT "DocumentArchive_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAuditLog_userId_fkey') THEN
          ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_userId_fkey') THEN
          ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_customerId_fkey') THEN
          ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_customerId_fkey"
            FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_paymentId_fkey') THEN
          ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_paymentId_fkey"
            FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_receiptId_fkey') THEN
          ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_receiptId_fkey"
            FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Feedback_invoiceId_fkey') THEN
          ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_invoiceId_fkey"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserOverride_userId_fkey') THEN
          ALTER TABLE "UserOverride" ADD CONSTRAINT "UserOverride_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    results.push('OK: invoicing FKs');
  } catch (e: any) {
    results.push('FK FAIL: invoicing - ' + e.message?.substring(0, 100));
  }

  // UserOverride table — per-user feature/quota overrides for ops control.
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserOverride" (
        "id"           TEXT         NOT NULL,
        "userId"       TEXT         NOT NULL,
        "overrides"    TEXT         NOT NULL,
        "discountKobo" INTEGER,
        "reason"       TEXT,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserOverride_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push('OK: UserOverride table');
  } catch (e: any) {
    results.push('FAIL: UserOverride table - ' + e.message?.substring(0, 100));
  }

  try {
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UserOverride_userId_key" ON "UserOverride"("userId")`,
    );
    results.push('OK: UserOverride_userId_key');
  } catch (e: any) {
    results.push('INDEX FAIL: UserOverride_userId_key - ' + e.message?.substring(0, 80));
  }

  // CatalogEvent table — public storefront activity log
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CatalogEvent" (
        "id"            TEXT        NOT NULL,
        "userId"        TEXT        NOT NULL,
        "productId"     TEXT,
        "type"          TEXT        NOT NULL,
        "ipHash"        TEXT,
        "userAgent"     TEXT,
        "referrer"      TEXT,
        "customerName"  TEXT,
        "customerPhone" TEXT,
        "note"          TEXT,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CatalogEvent_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push('OK: CatalogEvent table');
  } catch (e: any) {
    results.push('FAIL: CatalogEvent table - ' + e.message?.substring(0, 100));
  }

  // ===== Unique indexes that might be missing =====
  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_publicToken_key" ON "Invoice"("publicToken") WHERE "publicToken" IS NOT NULL`);
    results.push('OK: Invoice.publicToken unique index');
  } catch (e: any) {
    results.push('INDEX: ' + e.message?.substring(0, 80));
  }

  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "StaffMember_inviteToken_key" ON "StaffMember"("inviteToken") WHERE "inviteToken" IS NOT NULL`);
    results.push('OK: StaffMember.inviteToken unique index');
  } catch (e: any) {
    results.push('INDEX: ' + e.message?.substring(0, 80));
  }

  // Indexes + FKs for the new schema bits
  const newIndexes: Array<[string, string]> = [
    ['User_slug_key', `CREATE UNIQUE INDEX IF NOT EXISTS "User_slug_key" ON "User"("slug") WHERE "slug" IS NOT NULL`],
    ['Product_userId_isPublished_idx', `CREATE INDEX IF NOT EXISTS "Product_userId_isPublished_idx" ON "Product"("userId", "isPublished")`],
    ['Receipt_userId_source_idx', `CREATE INDEX IF NOT EXISTS "Receipt_userId_source_idx" ON "Receipt"("userId", "source")`],
    ['Invoice_paymentId_key', `CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_paymentId_key" ON "Invoice"("paymentId") WHERE "paymentId" IS NOT NULL`],
    ['CatalogEvent_userId_createdAt_idx', `CREATE INDEX IF NOT EXISTS "CatalogEvent_userId_createdAt_idx" ON "CatalogEvent"("userId", "createdAt")`],
    ['CatalogEvent_productId_idx', `CREATE INDEX IF NOT EXISTS "CatalogEvent_productId_idx" ON "CatalogEvent"("productId")`],
    ['CatalogEvent_userId_type_idx', `CREATE INDEX IF NOT EXISTS "CatalogEvent_userId_type_idx" ON "CatalogEvent"("userId", "type")`],
  ];
  for (const [name, sql] of newIndexes) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push('OK: ' + name);
    } catch (e: any) {
      results.push('INDEX FAIL: ' + name + ' - ' + e.message?.substring(0, 80));
    }
  }

  // CatalogEvent foreign keys (skipped if already present — no IF NOT EXISTS for FK in Postgres,
  // so we wrap in a conditional DO block).
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CatalogEvent_userId_fkey'
        ) THEN
          ALTER TABLE "CatalogEvent" ADD CONSTRAINT "CatalogEvent_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CatalogEvent_productId_fkey'
        ) THEN
          ALTER TABLE "CatalogEvent" ADD CONSTRAINT "CatalogEvent_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    results.push('OK: CatalogEvent foreign keys');
  } catch (e: any) {
    results.push('FK FAIL: CatalogEvent - ' + e.message?.substring(0, 100));
  }

  // ===== Tax+ tier: VatReturn table (2026-05-02) =====
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VatReturn" (
        "id"             TEXT         NOT NULL,
        "userId"         TEXT         NOT NULL,
        "period"         TEXT         NOT NULL DEFAULT 'QUARTERLY',
        "periodStart"    TIMESTAMP(3) NOT NULL,
        "periodEnd"      TIMESTAMP(3) NOT NULL,
        "outputVatKobo"  INTEGER      NOT NULL DEFAULT 0,
        "inputVatKobo"   INTEGER      NOT NULL DEFAULT 0,
        "netVatKobo"     INTEGER      NOT NULL DEFAULT 0,
        "invoiceCount"   INTEGER      NOT NULL DEFAULT 0,
        "expenseCount"   INTEGER      NOT NULL DEFAULT 0,
        "status"         TEXT         NOT NULL DEFAULT 'DRAFT',
        "filedAt"        TIMESTAMP(3),
        "filedBy"        TEXT,
        "firsReference"  TEXT,
        "pdfUrl"         TEXT,
        "csvUrl"         TEXT,
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VatReturn_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push('OK: VatReturn table');
  } catch (e: any) {
    results.push('FAIL: VatReturn table - ' + e.message?.substring(0, 100));
  }

  const vatReturnIndexes: Array<[string, string]> = [
    [
      'VatReturn_userId_periodStart_periodEnd_key',
      `CREATE UNIQUE INDEX IF NOT EXISTS "VatReturn_userId_periodStart_periodEnd_key" ON "VatReturn"("userId", "periodStart", "periodEnd")`,
    ],
    [
      'VatReturn_userId_status_idx',
      `CREATE INDEX IF NOT EXISTS "VatReturn_userId_status_idx" ON "VatReturn"("userId", "status")`,
    ],
    [
      'VatReturn_userId_periodStart_idx',
      `CREATE INDEX IF NOT EXISTS "VatReturn_userId_periodStart_idx" ON "VatReturn"("userId", "periodStart")`,
    ],
  ];
  for (const [name, sql] of vatReturnIndexes) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push('OK: ' + name);
    } catch (e: any) {
      results.push('INDEX FAIL: ' + name + ' - ' + e.message?.substring(0, 80));
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VatReturn_userId_fkey') THEN
          ALTER TABLE "VatReturn" ADD CONSTRAINT "VatReturn_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    results.push('OK: VatReturn foreign key');
  } catch (e: any) {
    results.push('FK FAIL: VatReturn - ' + e.message?.substring(0, 100));
  }

  // ===== Tax+ tier: Bank sync + Virtual account stubs (2026-05-02) =====
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LinkedBankAccount" (
        "id"            TEXT         NOT NULL,
        "userId"        TEXT         NOT NULL,
        "provider"      TEXT         NOT NULL DEFAULT 'MONO',
        "externalId"    TEXT         NOT NULL,
        "bankName"      TEXT         NOT NULL,
        "accountName"   TEXT         NOT NULL,
        "accountNumber" TEXT         NOT NULL,
        "lastSyncAt"    TIMESTAMP(3),
        "status"        TEXT         NOT NULL DEFAULT 'ACTIVE',
        "errorMessage"  TEXT,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LinkedBankAccount_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push('OK: LinkedBankAccount table');
  } catch (e: any) {
    results.push('FAIL: LinkedBankAccount table - ' + e.message?.substring(0, 100));
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BankTransaction" (
        "id"               TEXT         NOT NULL,
        "accountId"        TEXT         NOT NULL,
        "externalId"       TEXT         NOT NULL,
        "direction"        TEXT         NOT NULL,
        "amountKobo"       INTEGER      NOT NULL,
        "description"      TEXT,
        "reference"        TEXT,
        "occurredAt"       TIMESTAMP(3) NOT NULL,
        "matchStatus"      TEXT         NOT NULL DEFAULT 'UNMATCHED',
        "matchedInvoiceId" TEXT,
        "matchedPaymentId" TEXT,
        "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push('OK: BankTransaction table');
  } catch (e: any) {
    results.push('FAIL: BankTransaction table - ' + e.message?.substring(0, 100));
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "VirtualAccount" (
        "id"            TEXT         NOT NULL,
        "userId"        TEXT         NOT NULL,
        "invoiceId"     TEXT,
        "provider"      TEXT         NOT NULL,
        "externalId"    TEXT         NOT NULL,
        "accountNumber" TEXT         NOT NULL,
        "accountName"   TEXT         NOT NULL,
        "bankName"      TEXT         NOT NULL,
        "status"        TEXT         NOT NULL DEFAULT 'ACTIVE',
        "expiresAt"     TIMESTAMP(3),
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VirtualAccount_pkey" PRIMARY KEY ("id")
      )
    `);
    results.push('OK: VirtualAccount table');
  } catch (e: any) {
    results.push('FAIL: VirtualAccount table - ' + e.message?.substring(0, 100));
  }

  const bankSyncIndexes: Array<[string, string]> = [
    [
      'LinkedBankAccount_externalId_key',
      `CREATE UNIQUE INDEX IF NOT EXISTS "LinkedBankAccount_externalId_key" ON "LinkedBankAccount"("externalId")`,
    ],
    [
      'LinkedBankAccount_userId_status_idx',
      `CREATE INDEX IF NOT EXISTS "LinkedBankAccount_userId_status_idx" ON "LinkedBankAccount"("userId", "status")`,
    ],
    [
      'BankTransaction_externalId_key',
      `CREATE UNIQUE INDEX IF NOT EXISTS "BankTransaction_externalId_key" ON "BankTransaction"("externalId")`,
    ],
    [
      'BankTransaction_accountId_occurredAt_idx',
      `CREATE INDEX IF NOT EXISTS "BankTransaction_accountId_occurredAt_idx" ON "BankTransaction"("accountId", "occurredAt")`,
    ],
    [
      'BankTransaction_accountId_matchStatus_idx',
      `CREATE INDEX IF NOT EXISTS "BankTransaction_accountId_matchStatus_idx" ON "BankTransaction"("accountId", "matchStatus")`,
    ],
    [
      'BankTransaction_matchedInvoiceId_idx',
      `CREATE INDEX IF NOT EXISTS "BankTransaction_matchedInvoiceId_idx" ON "BankTransaction"("matchedInvoiceId")`,
    ],
    [
      'VirtualAccount_externalId_key',
      `CREATE UNIQUE INDEX IF NOT EXISTS "VirtualAccount_externalId_key" ON "VirtualAccount"("externalId")`,
    ],
    [
      'VirtualAccount_invoiceId_key',
      `CREATE UNIQUE INDEX IF NOT EXISTS "VirtualAccount_invoiceId_key" ON "VirtualAccount"("invoiceId") WHERE "invoiceId" IS NOT NULL`,
    ],
    [
      'VirtualAccount_userId_status_idx',
      `CREATE INDEX IF NOT EXISTS "VirtualAccount_userId_status_idx" ON "VirtualAccount"("userId", "status")`,
    ],
  ];
  for (const [name, sql] of bankSyncIndexes) {
    try {
      await prisma.$executeRawUnsafe(sql);
      results.push('OK: ' + name);
    } catch (e: any) {
      results.push('INDEX FAIL: ' + name + ' - ' + e.message?.substring(0, 80));
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LinkedBankAccount_userId_fkey') THEN
          ALTER TABLE "LinkedBankAccount" ADD CONSTRAINT "LinkedBankAccount_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BankTransaction_accountId_fkey') THEN
          ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_accountId_fkey"
            FOREIGN KEY ("accountId") REFERENCES "LinkedBankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VirtualAccount_userId_fkey') THEN
          ALTER TABLE "VirtualAccount" ADD CONSTRAINT "VirtualAccount_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VirtualAccount_invoiceId_fkey') THEN
          ALTER TABLE "VirtualAccount" ADD CONSTRAINT "VirtualAccount_invoiceId_fkey"
            FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    results.push('OK: bank sync foreign keys');
  } catch (e: any) {
    results.push('FK FAIL: bank sync - ' + e.message?.substring(0, 100));
  }

  // Final test: try creating and deleting a user
  let finalTest = 'NOT_RUN';
  try {
    const testUser = await prisma.user.create({
      data: {
        name: 'Migration Test',
        email: 'migration-test-' + Date.now() + '@test.com',
        passwordHash: '$2a$10$test',
        businessType: 'seller',
        lastLoginAt: new Date(),
      },
    });
    await prisma.user.delete({ where: { id: testUser.id } });
    finalTest = 'PASS - User create/delete works!';
  } catch (e: any) {
    finalTest = 'FAIL: ' + e.message?.substring(0, 200);
  }

  return NextResponse.json({
    migration: results,
    finalTest,
    totalColumns: results.length,
    failures: results.filter(r => r.startsWith('FAIL')).length
  });
}
