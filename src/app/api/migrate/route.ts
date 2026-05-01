import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * One-time migration endpoint to fix missing columns.
 * Adds any columns that exist in the Prisma schema but are missing from the actual DB.
 * Uses "ADD COLUMN IF NOT EXISTS" so it's safe to run multiple times.
 *
 * PROTECTED: requires CRON_SECRET as Bearer token or query param.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '');
  const qsSecret = req.nextUrl.searchParams.get('secret');

  if (!secret || (bearer !== secret && qsSecret !== secret)) {
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

  // Invoices (NRS-ready)
  await addCol('Invoice', 'paymentId', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsSubmissionId', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsStatus', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsLastError', 'TEXT', 'NULL');
  await addCol('Invoice', 'nrsRetryCount', 'INTEGER NOT NULL', '0');
  await addCol('Invoice', 'nrsSubmittedAt', 'TIMESTAMP(3)', 'NULL');
  await addCol('Invoice', 'nrsAcceptedAt', 'TIMESTAMP(3)', 'NULL');

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
