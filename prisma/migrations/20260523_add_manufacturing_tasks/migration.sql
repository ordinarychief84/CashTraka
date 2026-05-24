-- Manufacturing Tasks module — additive migration.
-- All operations are ADDITIVE. No existing tables are modified.
-- Money: no kobo fields needed (tasks track qty, not money).
-- Status fields: TEXT literals matching existing convention.
-- Soft-delete: deletedAt per-model, append-only activity log.
-- Tenant-scoped via userId on every table.

-- ── ManufacturingTask ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ManufacturingTask" (
    "id"                TEXT         NOT NULL,
    "userId"            TEXT         NOT NULL,
    "taskNumber"        TEXT         NOT NULL,
    "productionOrderId" TEXT,
    "title"             TEXT         NOT NULL,
    "description"       TEXT,
    "status"            TEXT         NOT NULL DEFAULT 'PENDING',
    "priority"          TEXT         NOT NULL DEFAULT 'NORMAL',
    "taskType"          TEXT         NOT NULL DEFAULT 'OTHER',
    "targetQty"         INTEGER,
    "completedQty"      INTEGER,
    "progress"          INTEGER      NOT NULL DEFAULT 0,
    "plannedStartAt"    TIMESTAMP(3),
    "plannedEndAt"      TIMESTAMP(3),
    "startedAt"         TIMESTAMP(3),
    "completedAt"       TIMESTAMP(3),
    "notes"             TEXT,
    "deletedAt"         TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManufacturingTask_pkey" PRIMARY KEY ("id")
);

-- Unique task number
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingTask_taskNumber_key'
  ) THEN
    ALTER TABLE "ManufacturingTask"
      ADD CONSTRAINT "ManufacturingTask_taskNumber_key" UNIQUE ("taskNumber");
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "ManufacturingTask_userId_status_createdAt_idx"
    ON "ManufacturingTask"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "ManufacturingTask_userId_productionOrderId_idx"
    ON "ManufacturingTask"("userId", "productionOrderId");
CREATE INDEX IF NOT EXISTS "ManufacturingTask_userId_deletedAt_idx"
    ON "ManufacturingTask"("userId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ManufacturingTask_userId_plannedEndAt_idx"
    ON "ManufacturingTask"("userId", "plannedEndAt");
CREATE INDEX IF NOT EXISTS "ManufacturingTask_userId_priority_plannedEndAt_idx"
    ON "ManufacturingTask"("userId", "priority", "plannedEndAt");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingTask_userId_fkey'
  ) THEN
    ALTER TABLE "ManufacturingTask"
      ADD CONSTRAINT "ManufacturingTask_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingTask_productionOrderId_fkey'
  ) THEN
    ALTER TABLE "ManufacturingTask"
      ADD CONSTRAINT "ManufacturingTask_productionOrderId_fkey"
      FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── ManufacturingTaskWorker ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ManufacturingTaskWorker" (
    "id"                  TEXT         NOT NULL,
    "manufacturingTaskId" TEXT         NOT NULL,
    "staffMemberId"       TEXT         NOT NULL,
    "role"                TEXT         NOT NULL DEFAULT 'WORKER',
    "assignedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManufacturingTaskWorker_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ManufacturingTaskWorker_manufacturingTaskId_staffMemberId_key'
  ) THEN
    ALTER TABLE "ManufacturingTaskWorker"
      ADD CONSTRAINT "ManufacturingTaskWorker_manufacturingTaskId_staffMemberId_key"
      UNIQUE ("manufacturingTaskId", "staffMemberId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ManufacturingTaskWorker_manufacturingTaskId_idx"
    ON "ManufacturingTaskWorker"("manufacturingTaskId");
CREATE INDEX IF NOT EXISTS "ManufacturingTaskWorker_staffMemberId_idx"
    ON "ManufacturingTaskWorker"("staffMemberId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingTaskWorker_manufacturingTaskId_fkey'
  ) THEN
    ALTER TABLE "ManufacturingTaskWorker"
      ADD CONSTRAINT "ManufacturingTaskWorker_manufacturingTaskId_fkey"
      FOREIGN KEY ("manufacturingTaskId") REFERENCES "ManufacturingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingTaskWorker_staffMemberId_fkey'
  ) THEN
    ALTER TABLE "ManufacturingTaskWorker"
      ADD CONSTRAINT "ManufacturingTaskWorker_staffMemberId_fkey"
      FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── ManufacturingTaskActivity ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ManufacturingTaskActivity" (
    "id"                  TEXT         NOT NULL,
    "manufacturingTaskId" TEXT         NOT NULL,
    "userId"              TEXT         NOT NULL,
    "type"                TEXT         NOT NULL,
    "note"                TEXT,
    "fromStatus"          TEXT,
    "toStatus"            TEXT,
    "progress"            INTEGER,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManufacturingTaskActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ManufacturingTaskActivity_manufacturingTaskId_createdAt_idx"
    ON "ManufacturingTaskActivity"("manufacturingTaskId", "createdAt");
CREATE INDEX IF NOT EXISTS "ManufacturingTaskActivity_userId_createdAt_idx"
    ON "ManufacturingTaskActivity"("userId", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingTaskActivity_manufacturingTaskId_fkey'
  ) THEN
    ALTER TABLE "ManufacturingTaskActivity"
      ADD CONSTRAINT "ManufacturingTaskActivity_manufacturingTaskId_fkey"
      FOREIGN KEY ("manufacturingTaskId") REFERENCES "ManufacturingTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ManufacturingTaskActivity_userId_fkey'
  ) THEN
    ALTER TABLE "ManufacturingTaskActivity"
      ADD CONSTRAINT "ManufacturingTaskActivity_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
