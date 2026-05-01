-- Receipt Engine + Sell (catalog) + Invoices (NRS-ready) extensions.
-- All operations are additive and nullable / defaulted — no destructive changes.

-- ── User: receipt prefix + storefront fields ──────────────────────
ALTER TABLE "User" ADD COLUMN     "receiptPrefix"  TEXT DEFAULT 'CT';
ALTER TABLE "User" ADD COLUMN     "slug"           TEXT;
ALTER TABLE "User" ADD COLUMN     "catalogEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN     "catalogTagline" TEXT;
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");

-- ── Product: catalog fields ───────────────────────────────────────
ALTER TABLE "Product" ADD COLUMN  "images"        TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN  "sku"           TEXT;
ALTER TABLE "Product" ADD COLUMN  "description"   TEXT;
ALTER TABLE "Product" ADD COLUMN  "isPublished"   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN  "catalogStatus" TEXT NOT NULL DEFAULT 'AVAILABLE';
CREATE INDEX "Product_userId_isPublished_idx" ON "Product"("userId", "isPublished");

-- ── Receipt: balance + source ─────────────────────────────────────
ALTER TABLE "Receipt" ADD COLUMN  "balanceRemaining" INTEGER;
ALTER TABLE "Receipt" ADD COLUMN  "source"           TEXT NOT NULL DEFAULT 'MANUAL';
CREATE INDEX "Receipt_userId_source_idx" ON "Receipt"("userId", "source");

-- ── Invoice: payment link + NRS submission state ──────────────────
ALTER TABLE "Invoice" ADD COLUMN  "paymentId"       TEXT;
ALTER TABLE "Invoice" ADD COLUMN  "nrsSubmissionId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN  "nrsStatus"       TEXT;
ALTER TABLE "Invoice" ADD COLUMN  "nrsLastError"    TEXT;
ALTER TABLE "Invoice" ADD COLUMN  "nrsRetryCount"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN  "nrsSubmittedAt"  TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN  "nrsAcceptedAt"   TIMESTAMP(3);
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");

-- ── CatalogEvent: public catalog activity log ─────────────────────
CREATE TABLE "CatalogEvent" (
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
);

CREATE INDEX "CatalogEvent_userId_createdAt_idx" ON "CatalogEvent"("userId", "createdAt");
CREATE INDEX "CatalogEvent_productId_idx"        ON "CatalogEvent"("productId");
CREATE INDEX "CatalogEvent_userId_type_idx"      ON "CatalogEvent"("userId", "type");

ALTER TABLE "CatalogEvent" ADD CONSTRAINT "CatalogEvent_userId_fkey"
    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogEvent" ADD CONSTRAINT "CatalogEvent_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
