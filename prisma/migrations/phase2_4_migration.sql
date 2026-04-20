-- Phase 2-4 Migration: Auto Follow-Up, Behavior Tracking, Collection Score
-- Run this in Neon SQL Editor against the CashTraka database.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Extend Customer table with behavior tracking fields
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "behaviorTag" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "avgPayDays" DOUBLE PRECISION;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "totalReminders" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastRemindedAt" TIMESTAMP(3);

-- Index for behavior queries
CREATE INDEX IF NOT EXISTS "Customer_userId_behaviorTag_idx" ON "Customer"("userId", "behaviorTag");

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Extend Debt table with reminder tracking fields
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "lastRemindedAt" TIMESTAMP(3);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. Create ReminderRule table (Phase 2 — auto follow-up rules)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "ReminderRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'gentle',
    "intervalDays" INTEGER NOT NULL DEFAULT 3,
    "maxReminders" INTEGER NOT NULL DEFAULT 5,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "nextFireAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReminderRule_userId_enabled_nextFireAt_idx" ON "ReminderRule"("userId", "enabled", "nextFireAt");
CREATE INDEX IF NOT EXISTS "ReminderRule_debtId_idx" ON "ReminderRule"("debtId");

ALTER TABLE "ReminderRule" ADD CONSTRAINT "ReminderRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderRule" ADD CONSTRAINT "ReminderRule_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════
-- 4. Create ReminderLog table (audit log of all sent reminders)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "ReminderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT,
    "debtId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'gentle',
    "deliveryRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReminderLog_userId_createdAt_idx" ON "ReminderLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReminderLog_ruleId_idx" ON "ReminderLog"("ruleId");

ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ReminderRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════
-- 5. Create CollectionScore table (Phase 4 — performance snapshots)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS "CollectionScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 50,
    "onTimeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCollectionDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "collectedAmount" INTEGER NOT NULL DEFAULT 0,
    "outstandingAmount" INTEGER NOT NULL DEFAULT 0,
    "activeReminders" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CollectionScore_userId_periodStart_key" ON "CollectionScore"("userId", "periodStart");
CREATE INDEX IF NOT EXISTS "CollectionScore_userId_createdAt_idx" ON "CollectionScore"("userId", "createdAt");

-- ═══════════════════════════════════════════════════════════════════════
-- 6. Add PaymentRequest indexes (improving existing table)
-- ═══════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS "PaymentRequest_userId_status_idx" ON "PaymentRequest"("userId", "status");
CREATE INDEX IF NOT EXISTS "PaymentRequest_userId_createdAt_idx" ON "PaymentRequest"("userId", "createdAt");
