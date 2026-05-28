DO $$
BEGIN
  -- Extend PaymentTermDef with the new "Type" field shown in the Rackbeat
  -- create form (Current month / Net / Paid in cash / Prepayment / Due date /
  -- Factoring / Current week starting Monday).
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='PaymentTermDef' AND column_name='type') THEN
    ALTER TABLE "PaymentTermDef" ADD COLUMN "type" TEXT;
  END IF;

  -- Adjustment categories — reason codes for stock adjustments / write-offs.
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='AdjustmentCategory') THEN
    CREATE TABLE "AdjustmentCategory" (
      "id"        TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "name"      TEXT NOT NULL,
      "type"      TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "AdjustmentCategory_userId_deletedAt_idx" ON "AdjustmentCategory"("userId","deletedAt");
  END IF;

  -- Document/UI languages. Pre-seeded with English + French (this product
  -- is built for an African market, Nigeria first, where French is the
  -- second most-common business language across ECOWAS / Francophone Africa).
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='LanguageDef') THEN
    CREATE TABLE "LanguageDef" (
      "id"        TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "name"      TEXT NOT NULL,
      "code"      TEXT NOT NULL,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "LanguageDef_userId_deletedAt_idx" ON "LanguageDef"("userId","deletedAt");
  END IF;

  -- Projects — group orders / expenses / invoices for cost-tracking.
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ProjectDef') THEN
    CREATE TABLE "ProjectDef" (
      "id"          TEXT PRIMARY KEY,
      "userId"      TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "number"      TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      "description" TEXT,
      "deletedAt"   TIMESTAMP(3),
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "ProjectDef_userId_deletedAt_idx" ON "ProjectDef"("userId","deletedAt");
  END IF;
END $$;
