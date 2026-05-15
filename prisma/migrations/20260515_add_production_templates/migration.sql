-- Recurring production templates — operational habit loop feature.
-- Additive: two new tables, no existing tables touched.
-- Tenant-scoped via userId. Items live in ProductionTemplateItem.

-- ── ProductionTemplate ────────────────────────────────────────────
CREATE TABLE "ProductionTemplate" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "title"      TEXT         NOT NULL,
    "cadence"    TEXT         NOT NULL DEFAULT 'weekly',
    "dayOfWeek"  INTEGER,
    "dayOfMonth" INTEGER,
    "hourOfDay"  INTEGER      NOT NULL DEFAULT 9,
    "nextRunAt"  TIMESTAMP(3) NOT NULL,
    "lastRunAt"  TIMESTAMP(3),
    "status"     TEXT         NOT NULL DEFAULT 'active',
    "notes"      TEXT,
    "deletedAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionTemplate_userId_status_nextRunAt_idx"
    ON "ProductionTemplate"("userId", "status", "nextRunAt");
CREATE INDEX "ProductionTemplate_userId_deletedAt_idx"
    ON "ProductionTemplate"("userId", "deletedAt");

ALTER TABLE "ProductionTemplate"
    ADD CONSTRAINT "ProductionTemplate_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ProductionTemplateItem ────────────────────────────────────────
CREATE TABLE "ProductionTemplateItem" (
    "id"         TEXT    NOT NULL,
    "templateId" TEXT    NOT NULL,
    "productId"  TEXT    NOT NULL,
    "quantity"   INTEGER NOT NULL,
    CONSTRAINT "ProductionTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionTemplateItem_templateId_productId_key"
    ON "ProductionTemplateItem"("templateId", "productId");
CREATE INDEX "ProductionTemplateItem_productId_idx"
    ON "ProductionTemplateItem"("productId");

ALTER TABLE "ProductionTemplateItem"
    ADD CONSTRAINT "ProductionTemplateItem_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ProductionTemplate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductionTemplateItem"
    ADD CONSTRAINT "ProductionTemplateItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
