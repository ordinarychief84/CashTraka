/**
 * scripts/migrate-audit.ts
 *
 * Step 1 of the migration-deploy switchover documented in issue #79.
 * Read-only audit of the live DB to figure out which path of #79's
 * "Step 2 — reconcile" applies:
 *
 *   Case A: `_prisma_migrations` ledger does NOT exist
 *           → the DB has been driftwood-managed via `prisma db push`
 *             and ad-hoc `/api/migrate` runs forever. Step 2 is to
 *             `prisma migrate resolve --applied <name>` every existing
 *             migration file so the ledger reflects reality.
 *
 *   Case B: `_prisma_migrations` ledger exists but is incomplete
 *           → some migrations are recorded, others aren't, but the
 *             schema has columns/tables from both. Reconcile per-file.
 *
 *   Case C: ledger is complete and matches the filesystem
 *           → safe to flip `vercel.json` to `prisma migrate deploy`
 *             on a preview branch immediately.
 *
 * Also probes for known patch columns / tables that were added via
 * `/api/migrate` rather than a migration file, so you know whether
 * the baseline-resync migration (`prisma/migrations/<timestamp>_
 * baseline_resync/`) needs to be marked as already applied.
 *
 * SAFETY:
 *   - Read-only. No `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`,
 *     or `DROP` statements anywhere in this file.
 *   - Reads `DATABASE_URL` from env. Verify the printed connection
 *     target before trusting the output.
 *
 * Usage (Windows PowerShell):
 *   npx tsx scripts/migrate-audit.ts
 *
 * Usage (POSIX):
 *   npx tsx scripts/migrate-audit.ts
 *
 * Output goes to stdout. Copy-paste it into PR / issue thread when
 * you're ready to do Step 2.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

// Columns + tables added via the raw `/api/migrate` route (rather
// than a Prisma migration file). The baseline-resync migration must
// include these. Spot-check whether they're actually on the live DB.
const PATCH_COLUMNS: Array<{ table: string; column: string; note: string }> = [
  { table: 'Customer', column: 'creditLimitKobo', note: 'added in PR #64' },
  {
    table: 'User',
    column: 'starterPackOfferedAt',
    note: 'added in PR #72, reverted in #74 — should NOT exist on live',
  },
  { table: 'Product', column: 'priceKobo', note: 'kobo dual-write rollout' },
  { table: 'Product', column: 'costKobo', note: 'kobo dual-write rollout' },
  { table: 'Payment', column: 'amountKobo', note: 'kobo dual-write rollout' },
  { table: 'Debt', column: 'amountOwedKobo', note: 'kobo dual-write rollout' },
];

const PATCH_TABLES: Array<{ table: string; note: string }> = [
  { table: 'ProductionTemplate', note: 'added in PR #65' },
  { table: 'ProductionTemplateItem', note: 'added in PR #65' },
  { table: 'CustomerOrder', note: 'operational planning pivot — should exist' },
  { table: 'ProductionOrder', note: 'operational planning pivot — should exist' },
  { table: 'PurchaseOrder', note: 'operational planning pivot — should exist' },
  { table: 'Recipe', note: 'operational planning pivot — should exist' },
  { table: 'RawMaterial', note: 'operational planning pivot — should exist' },
  { table: 'StockMovement', note: 'operational planning pivot — should exist' },
  { table: 'Album', note: 'storefront retired in #100 — column may still exist' },
  { table: 'CatalogEvent', note: 'storefront retired in #100 — column may still exist' },
];

function maskDbUrl(url: string): string {
  return url.replace(/:[^@/]+@/, ':***@');
}

async function main() {
  console.log('=== migrate-audit ===');
  console.log(`DATABASE_URL = ${maskDbUrl(process.env.DATABASE_URL ?? '<unset>')}`);
  console.log('');

  // ── Q1: does the `_prisma_migrations` ledger table exist? ──────────
  console.log('Q1. Does `_prisma_migrations` ledger exist?');
  const ledgerExists = await prisma.$queryRaw<{ to_regclass: string | null }[]>`
    SELECT to_regclass('_prisma_migrations') AS to_regclass
  `;
  const hasLedger = ledgerExists[0]?.to_regclass !== null;
  console.log(`   → ${hasLedger ? 'YES' : 'NO'}`);
  console.log('');

  // ── Q2: ledger contents, if it exists ──────────────────────────────
  let appliedMigrations: string[] = [];
  if (hasLedger) {
    console.log('Q2. Ledger contents (applied migrations):');
    const rows = await prisma.$queryRaw<
      { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
    >(Prisma.sql`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations
      ORDER BY started_at
    `);
    if (rows.length === 0) {
      console.log('   → ledger exists but is EMPTY');
    } else {
      for (const r of rows) {
        const status = r.rolled_back_at
          ? `ROLLED BACK ${r.rolled_back_at.toISOString()}`
          : r.finished_at
            ? `applied ${r.finished_at.toISOString()}`
            : 'IN PROGRESS';
        console.log(`   • ${r.migration_name}  [${status}]`);
        if (r.finished_at && !r.rolled_back_at) {
          appliedMigrations.push(r.migration_name);
        }
      }
    }
    console.log('');
  }

  // ── Q3: which migration files exist on the filesystem? ─────────────
  console.log('Q3. Migration files on disk:');
  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  let fsMigrations: string[] = [];
  try {
    fsMigrations = readdirSync(migrationsDir)
      .filter((name) => {
        try {
          return statSync(join(migrationsDir, name)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
    for (const m of fsMigrations) {
      const applied = appliedMigrations.includes(m);
      console.log(`   • ${m}  ${applied ? '✓ applied' : '✗ NOT in ledger'}`);
    }
    if (fsMigrations.length === 0) {
      console.log('   → no migration directories found');
    }
  } catch (e) {
    console.log(`   → could not read ${migrationsDir}: ${(e as Error).message}`);
  }
  console.log('');

  // ── Q4: do the known patch columns / tables actually exist? ────────
  console.log('Q4. Patch columns/tables (added via `/api/migrate` or pivot):');
  for (const { table, column, note } of PATCH_COLUMNS) {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${table}
          AND column_name = ${column}
      ) AS exists
    `);
    const present = result[0]?.exists ?? false;
    console.log(
      `   ${present ? '✓' : '✗'} ${table}.${column.padEnd(24)} ${present ? 'present' : 'MISSING'}  (${note})`,
    );
  }
  console.log('');

  for (const { table, note } of PATCH_TABLES) {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) AS exists
    `);
    const present = result[0]?.exists ?? false;
    console.log(
      `   ${present ? '✓' : '✗'} table ${table.padEnd(28)} ${present ? 'present' : 'MISSING'}  (${note})`,
    );
  }
  console.log('');

  // ── Verdict ────────────────────────────────────────────────────────
  console.log('=== verdict ===');
  if (!hasLedger) {
    console.log(
      "Case A: `_prisma_migrations` doesn't exist on the live DB.\n" +
        '  → Next step is to mark every existing migration file as `--applied`\n' +
        '    via `prisma migrate resolve` (#79 step 2).',
    );
  } else if (
    appliedMigrations.length === fsMigrations.length &&
    fsMigrations.every((m) => appliedMigrations.includes(m))
  ) {
    console.log(
      'Case C: ledger is complete and matches the filesystem.\n' +
        '  → Safe to flip `vercel.json` build command to\n' +
        '    `prisma migrate deploy && prisma generate && next build`\n' +
        '    on a preview branch (#79 step 4).',
    );
  } else {
    console.log(
      'Case B: ledger exists but is incomplete.\n' +
        '  → Reconcile per-file via `prisma migrate resolve --applied <name>`\n' +
        '    (#79 step 2). Skip files that the schema obviously already has.',
    );
  }
}

main()
  .catch((err) => {
    console.error('[migrate-audit] FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
