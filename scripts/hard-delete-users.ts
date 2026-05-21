/**
 * scripts/hard-delete-users.ts
 *
 * ⚠️  IRREVERSIBLE. DESTROYS NIGERIAN FIRS-REQUIRED TAX RETENTION.
 *
 * Hard-deletes every non-admin User AND every dependent row in
 * dependency order, inside a single transaction per user. Email
 * becomes immediately re-usable for signup. No trace remains in the
 * database.
 *
 * Per repo precedent, hard-delete was previously deemed unsafe and
 * the project shipped `cleanup-users.ts` (soft-delete only) instead.
 * Re-enabling hard-delete here is an explicit compliance decision by
 * the operator who accepts:
 *
 *   1. Nigerian FIRS regulations require 6-year retention on tax-
 *      relevant records (Receipt, Invoice, Payment, VatReturn,
 *      DocumentAuditLog, etc.). Running this script destroys that
 *      audit trail and may expose the operator to FIRS penalties if
 *      audited within the retention window.
 *   2. Sentry / Vercel / Paystack server logs MAY still hold copies
 *      of the deleted PII outside this database. This script touches
 *      only the Neon Postgres rows.
 *   3. Once committed, NO ROLLBACK. The transaction-per-user model
 *      means a mid-batch failure leaves earlier users hard-deleted.
 *   4. Admin (`role = 'ADMIN'`) users are skipped.
 *
 * ─── Selection criteria ──────────────────────────────────────────
 *   Deletes every User where: role != 'ADMIN'
 *   Optionally: filter by `WHERE_EMAIL_LIKE` env var for safer batches.
 *
 * ─── Safety controls ─────────────────────────────────────────────
 *   1. Dry-run by default. Prints the cohort + per-user FK counts.
 *   2. To actually mutate, set `CONFIRM_HARD_DELETE=yes`.
 *   3. To require extra typed acknowledgement, set
 *      `I_ACCEPT_FIRS_RETENTION_RISK=yes` AS WELL. Missing either
 *      flag aborts.
 *   4. Reads `DATABASE_URL` from env. The script prints the masked
 *      connection target BEFORE prompting; verify it before flipping
 *      the confirm flag.
 *
 * ─── Usage (Windows PowerShell) ──────────────────────────────────
 *   # Dry-run:
 *   npx tsx scripts/hard-delete-users.ts
 *
 *   # Commit (BOTH env vars required, both must equal 'yes'):
 *   $env:CONFIRM_HARD_DELETE="yes"
 *   $env:I_ACCEPT_FIRS_RETENTION_RISK="yes"
 *   npx tsx scripts/hard-delete-users.ts
 *
 *   # Target one address by partial match (safer first run):
 *   $env:WHERE_EMAIL_LIKE="mimi"
 *   npx tsx scripts/hard-delete-users.ts
 *
 * ─── Usage (POSIX) ───────────────────────────────────────────────
 *   npx tsx scripts/hard-delete-users.ts
 *   CONFIRM_HARD_DELETE=yes I_ACCEPT_FIRS_RETENTION_RISK=yes \
 *     npx tsx scripts/hard-delete-users.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const ARMED =
  process.env.CONFIRM_HARD_DELETE === 'yes' &&
  process.env.I_ACCEPT_FIRS_RETENTION_RISK === 'yes';

const EMAIL_LIKE = process.env.WHERE_EMAIL_LIKE ?? null;

function maskDbUrl(url: string): string {
  return url.replace(/:[^@/]+@/, ':***@');
}

/**
 * Counts of dependent rows tied to a given userId. Used in dry-run to
 * tell the operator what the blast radius looks like before they
 * commit.
 */
async function countDependents(userId: string) {
  // Children that must be cleaned BEFORE the Restrict-protected
  // parents can be deleted, plus the Restrict-protected parents
  // themselves. Cascade-only relations (Customer, Debt, RawMaterial,
  // Supplier, Recipe, ProductionOrder, CustomerOrder, PurchaseOrder,
  // Product, Notification, EmailVerification, PasswordResetToken,
  // StaffMember, etc.) are NOT counted here — they delete
  // automatically when the User row is dropped.
  const [
    invoices,
    receipts,
    payments,
    sales,
    expenses,
    creditNotes,
    documentArchives,
    documentAuditLogs,
    staffPayments,
    refunds,
    vatReturns,
    stockMovements,
  ] = await Promise.all([
    prisma.invoice.count({ where: { userId } }),
    prisma.receipt.count({ where: { userId } }),
    prisma.payment.count({ where: { userId } }),
    prisma.sale.count({ where: { userId } }),
    prisma.expense.count({ where: { userId } }),
    prisma.creditNote.count({ where: { userId } }),
    prisma.documentArchive.count({ where: { userId } }),
    prisma.documentAuditLog.count({ where: { userId } }),
    prisma.staffPayment.count({ where: { userId } }),
    prisma.refund.count({ where: { userId } }),
    prisma.vatReturn.count({ where: { userId } }),
    prisma.stockMovement.count({ where: { userId } }),
  ]);

  // Restrict-protected parents only. InvoiceItem / PaymentItem /
  // SaleItem / InvoiceReminder are Cascade children — they auto-delete
  // with their parent. Receipt and CreditNote have no `Item` child
  // model — they're flat single rows.
  return {
    invoices,
    receipts,
    payments,
    sales,
    expenses,
    creditNotes,
    documentArchives,
    documentAuditLogs,
    staffPayments,
    refunds,
    vatReturns,
    stockMovements,
  };
}

/**
 * Hard-delete one user inside a single transaction. The order matters
 * — we drain children of Restrict-protected parents first, then the
 * parents, then User itself (which cascades through all
 * onDelete:Cascade relations).
 */
async function hardDeleteOne(userId: string) {
  await prisma.$transaction(
    async (tx) => {
      // Restrict-protected parents only. InvoiceItem / PaymentItem /
      // SaleItem / InvoiceReminder are Cascade children — they
      // auto-delete with their parent below. Receipt and CreditNote
      // are flat single rows (no `Item` children).
      //
      // Order matters: CreditNote.invoiceId → Invoice is itself a
      // Restrict relation, so CreditNote MUST come before Invoice.
      // Refund references Payment via paymentAttempt (SetNull), so
      // either order is fine for those two; deleting Refund first
      // mirrors the same safety stance.
      await tx.refund.deleteMany({ where: { userId } });
      await tx.documentAuditLog.deleteMany({ where: { userId } });
      await tx.documentArchive.deleteMany({ where: { userId } });
      await tx.staffPayment.deleteMany({ where: { userId } });
      await tx.stockMovement.deleteMany({ where: { userId } });
      await tx.vatReturn.deleteMany({ where: { userId } });
      // CreditNote BEFORE Invoice — Restrict FK.
      await tx.creditNote.deleteMany({ where: { userId } });
      await tx.invoice.deleteMany({ where: { userId } });
      await tx.receipt.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.sale.deleteMany({ where: { userId } });
      await tx.expense.deleteMany({ where: { userId } });

      // 3. The User row. Every onDelete:Cascade relation
      //    (Customer, Debt, Product, RawMaterial, Supplier, Recipe,
      //    ProductionOrder, CustomerOrder, PurchaseOrder,
      //    Notification, EmailVerification, PasswordResetToken,
      //    StaffMember, PayLink, Promise, BatchCostLineItem,
      //    WhatsAppSendLog, Subscription, BillingEvent,
      //    AdminNoteAuthor/Target, Ticket, Task, Template,
      //    PaymentMethod, AccessAuditLog, etc.) auto-deletes here.
      await tx.user.delete({ where: { id: userId } });
    },
    {
      // 30s timeout per user (Neon can take a moment on first cold start).
      timeout: 30_000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '<unset>';
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  hard-delete-users.ts');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  DATABASE_URL: ${maskDbUrl(dbUrl)}`);
  console.log(`  CONFIRM_HARD_DELETE      = ${process.env.CONFIRM_HARD_DELETE ?? '<unset>'}`);
  console.log(`  I_ACCEPT_FIRS_RETENTION_RISK = ${process.env.I_ACCEPT_FIRS_RETENTION_RISK ?? '<unset>'}`);
  console.log(`  WHERE_EMAIL_LIKE         = ${EMAIL_LIKE ?? '<none>'}`);
  console.log(`  Armed for actual delete? ${ARMED ? '⚠️  YES' : 'no (dry-run)'}`);
  console.log('───────────────────────────────────────────────────────────');

  const where: Prisma.UserWhereInput = {
    role: { not: 'ADMIN' },
    ...(EMAIL_LIKE ? { email: { contains: EMAIL_LIKE, mode: 'insensitive' } } : {}),
  };

  const cohort = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (cohort.length === 0) {
    console.log('No matching non-admin users found. Done.');
    return;
  }

  console.log(`Matched ${cohort.length} user(s) to hard-delete:`);
  for (const u of cohort) {
    const counts = await countDependents(u.id);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const flag = u.deletedAt ? '(already soft-deleted)' : '';
    console.log(
      `  ${u.id}  role=${u.role}  ${u.email.padEnd(40)}  ` +
        `dependents=${total}  created=${u.createdAt.toISOString()}  ${flag}`,
    );
    // Show the breakdown for the FIRST 3 users so the operator sees the
    // detail without an enormous wall of output.
    if (cohort.indexOf(u) < 3) {
      const nonZero = Object.entries(counts).filter(([, n]) => n > 0);
      for (const [k, n] of nonZero) {
        console.log(`    └─ ${k}: ${n}`);
      }
    }
  }

  if (!ARMED) {
    console.log('───────────────────────────────────────────────────────────');
    console.log('DRY-RUN — no rows mutated.');
    console.log('To commit:');
    console.log('  $env:CONFIRM_HARD_DELETE="yes"');
    console.log('  $env:I_ACCEPT_FIRS_RETENTION_RISK="yes"');
    console.log('  npx tsx scripts/hard-delete-users.ts');
    return;
  }

  console.log('───────────────────────────────────────────────────────────');
  console.log('⚠️  ARMED. Hard-deleting in 5 seconds. Ctrl+C now to abort.');
  for (let s = 5; s > 0; s--) {
    process.stdout.write(`${s}…  `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write('\n');

  let ok = 0;
  let failed = 0;
  const errors: { id: string; email: string; error: string }[] = [];
  for (const u of cohort) {
    try {
      await hardDeleteOne(u.id);
      ok++;
      console.log(`  ✓ hard-deleted ${u.id}  ${u.email}`);
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ id: u.id, email: u.email, error: message });
      console.error(`  ✗ FAILED ${u.id}  ${u.email}: ${message}`);
    }
  }

  console.log('───────────────────────────────────────────────────────────');
  console.log(`Result: ${ok} succeeded, ${failed} failed.`);
  if (errors.length > 0) {
    console.log('Failures:');
    for (const e of errors) {
      console.log(`  ${e.id}  ${e.email}: ${e.error}`);
    }
    console.log(
      'Survivors may have orphaned children. Investigate the schema for' +
        ' new FK relations that the script doesn\'t handle yet.',
    );
  }
}

main()
  .catch((err) => {
    console.error('[hard-delete-users] FATAL:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
