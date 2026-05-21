-- 20260521_baseline_resync
-- ─────────────────────────────────────────────────────────────────────
-- Idempotent capture of every schema change that was applied to the
-- live DB via raw `/api/migrate` calls instead of a Prisma migration
-- file. Marking THIS file as `--applied` (rather than running it)
-- closes the drift gap so `prisma migrate deploy` can run cleanly on
-- every subsequent build.
--
-- Step in the issue #79 plan: 3 ("capture the patch columns as a real
-- migration").
--
-- Safety: every statement uses `IF NOT EXISTS` / conditional checks.
-- Running this against a database that already has all these columns
-- and tables is a no-op. Safe to run on dev / staging too.
--
-- Resolve strategy (production, after running `migrate-audit.ts`):
--
--   # Verify the migration is already represented in the schema:
--   npx tsx scripts/migrate-audit.ts
--
--   # Mark as applied without running:
--   npx prisma migrate resolve --applied 20260521_baseline_resync
--
-- ─────────────────────────────────────────────────────────────────────

-- ── kobo dual-write columns (rollout was incremental) ────────────────
ALTER TABLE "Product"  ADD COLUMN IF NOT EXISTS "priceKobo"      INTEGER;
ALTER TABLE "Product"  ADD COLUMN IF NOT EXISTS "costKobo"       INTEGER;
ALTER TABLE "Payment"  ADD COLUMN IF NOT EXISTS "amountKobo"     INTEGER;
ALTER TABLE "Debt"     ADD COLUMN IF NOT EXISTS "amountOwedKobo" INTEGER;
ALTER TABLE "Debt"     ADD COLUMN IF NOT EXISTS "amountPaidKobo" INTEGER;
ALTER TABLE "Expense"  ADD COLUMN IF NOT EXISTS "amountKobo"     INTEGER;
ALTER TABLE "Invoice"  ADD COLUMN IF NOT EXISTS "totalKobo"      INTEGER;
ALTER TABLE "Invoice"  ADD COLUMN IF NOT EXISTS "subtotalKobo"   INTEGER;
ALTER TABLE "Invoice"  ADD COLUMN IF NOT EXISTS "taxKobo"        INTEGER;
ALTER TABLE "Invoice"  ADD COLUMN IF NOT EXISTS "discountKobo"   INTEGER;

-- ── credit-limit (PR #64) ────────────────────────────────────────────
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "creditLimitKobo" INTEGER;

-- ── customer order / production order / purchase order pivot ────────
-- These tables ship inside `20260513_add_operational_planning_core/`
-- but were also partially applied via `/api/migrate` in some envs.
-- This block is a defensive re-assert; the unique constraints + FK
-- declarations live in the original pivot migration.

-- ── batch-cost intelligence (PR #88, PR #97 follow-up) ──────────────
ALTER TABLE "ProductionOrder"
  ADD COLUMN IF NOT EXISTS "labourCostKobo"          INTEGER,
  ADD COLUMN IF NOT EXISTS "overheadCostKobo"        INTEGER,
  ADD COLUMN IF NOT EXISTS "materialCostKobo"        INTEGER,
  ADD COLUMN IF NOT EXISTS "totalCostKobo"           INTEGER,
  ADD COLUMN IF NOT EXISTS "revenueKobo"             INTEGER,
  ADD COLUMN IF NOT EXISTS "grossMarginBps"          INTEGER,
  ADD COLUMN IF NOT EXISTS "costPerUnitKobo"         INTEGER,
  ADD COLUMN IF NOT EXISTS "hasUnpricedMaterials"    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "batchCostCalculatedAt"   TIMESTAMP(3);

-- ── bank-SMS parser state (PR #86) ──────────────────────────────────
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "parseSource" TEXT DEFAULT 'AUTO';

-- ── trial state (signup flow rewired in caa4a3e, May 15) ────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS "trialEndsAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd"   TIMESTAMP(3);

-- ── onboarding flag (used by guard() to redirect new users) ─────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT false;

-- ── deletedAt on the User row (cleanup-users.ts soft-delete path) ──
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ── isSuspended (admin freeze) ──────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN DEFAULT false;

-- ── lastLoginAt (set by login route) ────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- ── DELIBERATELY OMITTED ────────────────────────────────────────────
-- User.starterPackOfferedAt    — was added in PR #72, REVERTED in #74.
--                                Must NOT exist on live. If
--                                migrate-audit.ts reports it present,
--                                drop it via `/api/migrate` first.
-- ─────────────────────────────────────────────────────────────────────
