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
