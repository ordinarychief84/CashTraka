-- Operational Planning core — small-batch ops pivot.
-- All operations below are ADDITIVE. No existing tables are modified.
-- Money is Int (kobo). Status fields are TEXT literals (matching the
-- existing convention — no native Postgres enums).
-- Tenant-scoped via userId. Soft-delete via deletedAt.

-- ── Supplier ──────────────────────────────────────────────────────
CREATE TABLE "Supplier" (
    "id"            TEXT         NOT NULL,
    "userId"        TEXT         NOT NULL,
    "name"          TEXT         NOT NULL,
    "contactPerson" TEXT,
    "phone"         TEXT,
    "email"         TEXT,
    "address"       TEXT,
    "notes"         TEXT,
    "deletedAt"     TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Supplier_userId_deletedAt_idx" ON "Supplier"("userId", "deletedAt");
CREATE INDEX "Supplier_userId_name_idx"      ON "Supplier"("userId", "name");
ALTER TABLE "Supplier"
    ADD CONSTRAINT "Supplier_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RawMaterial ───────────────────────────────────────────────────
CREATE TABLE "RawMaterial" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "name"         TEXT         NOT NULL,
    "sku"          TEXT,
    "unit"         TEXT         NOT NULL DEFAULT 'unit',
    "stock"        INTEGER      NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER      NOT NULL DEFAULT 0,
    "unitCostKobo" INTEGER      NOT NULL DEFAULT 0,
    "supplierId"   TEXT,
    "expiresAt"    TIMESTAMP(3),
    "notes"        TEXT,
    "deletedAt"    TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RawMaterial_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RawMaterial_userId_deletedAt_idx"  ON "RawMaterial"("userId", "deletedAt");
CREATE INDEX "RawMaterial_userId_supplierId_idx" ON "RawMaterial"("userId", "supplierId");
CREATE INDEX "RawMaterial_userId_expiresAt_idx"  ON "RawMaterial"("userId", "expiresAt");
ALTER TABLE "RawMaterial"
    ADD CONSTRAINT "RawMaterial_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RawMaterial"
    ADD CONSTRAINT "RawMaterial_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Recipe ────────────────────────────────────────────────────────
CREATE TABLE "Recipe" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "productId" TEXT         NOT NULL,
    "yieldQty"  INTEGER      NOT NULL DEFAULT 1,
    "notes"     TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Recipe_productId_key"      ON "Recipe"("productId");
CREATE INDEX        "Recipe_userId_deletedAt_idx" ON "Recipe"("userId", "deletedAt");
ALTER TABLE "Recipe"
    ADD CONSTRAINT "Recipe_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recipe"
    ADD CONSTRAINT "Recipe_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RecipeItem ────────────────────────────────────────────────────
CREATE TABLE "RecipeItem" (
    "id"         TEXT    NOT NULL,
    "recipeId"   TEXT    NOT NULL,
    "materialId" TEXT    NOT NULL,
    "quantity"   INTEGER NOT NULL,
    "notes"      TEXT,
    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RecipeItem_recipeId_materialId_key" ON "RecipeItem"("recipeId", "materialId");
CREATE INDEX        "RecipeItem_materialId_idx"          ON "RecipeItem"("materialId");
ALTER TABLE "RecipeItem"
    ADD CONSTRAINT "RecipeItem_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeItem"
    ADD CONSTRAINT "RecipeItem_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── ProductionOrder ──────────────────────────────────────────────
CREATE TABLE "ProductionOrder" (
    "id"               TEXT         NOT NULL,
    "userId"           TEXT         NOT NULL,
    "productionNumber" TEXT         NOT NULL,
    "status"           TEXT         NOT NULL DEFAULT 'PLANNED',
    "plannedStartAt"   TIMESTAMP(3),
    "plannedEndAt"     TIMESTAMP(3),
    "startedAt"        TIMESTAMP(3),
    "completedAt"      TIMESTAMP(3),
    "notes"            TEXT,
    "deletedAt"        TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductionOrder_productionNumber_key" ON "ProductionOrder"("productionNumber");
CREATE INDEX "ProductionOrder_userId_status_createdAt_idx" ON "ProductionOrder"("userId", "status", "createdAt");
CREATE INDEX "ProductionOrder_userId_plannedEndAt_idx"     ON "ProductionOrder"("userId", "plannedEndAt");
CREATE INDEX "ProductionOrder_userId_deletedAt_idx"        ON "ProductionOrder"("userId", "deletedAt");
ALTER TABLE "ProductionOrder"
    ADD CONSTRAINT "ProductionOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ProductionOrderItem ──────────────────────────────────────────
CREATE TABLE "ProductionOrderItem" (
    "id"                   TEXT    NOT NULL,
    "productionOrderId"    TEXT    NOT NULL,
    "productId"            TEXT    NOT NULL,
    "quantity"             INTEGER NOT NULL,
    "unitCostKoboSnapshot" INTEGER,
    CONSTRAINT "ProductionOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductionOrderItem_productionOrderId_productId_key"
    ON "ProductionOrderItem"("productionOrderId", "productId");
CREATE INDEX "ProductionOrderItem_productId_idx" ON "ProductionOrderItem"("productId");
ALTER TABLE "ProductionOrderItem"
    ADD CONSTRAINT "ProductionOrderItem_productionOrderId_fkey"
    FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionOrderItem"
    ADD CONSTRAINT "ProductionOrderItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── CustomerOrder ────────────────────────────────────────────────
CREATE TABLE "CustomerOrder" (
    "id"                  TEXT         NOT NULL,
    "userId"              TEXT         NOT NULL,
    "customerId"          TEXT,
    "customerName"        TEXT         NOT NULL,
    "customerPhone"       TEXT,
    "orderNumber"         TEXT         NOT NULL,
    "status"              TEXT         NOT NULL DEFAULT 'NEW',
    "dueAt"               TIMESTAMP(3),
    "totalKobo"           INTEGER      NOT NULL DEFAULT 0,
    "notes"               TEXT,
    "orderConfirmationId" TEXT,
    "productionOrderId"   TEXT,
    "invoiceId"           TEXT,
    "deletedAt"           TIMESTAMP(3),
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerOrder_orderNumber_key"         ON "CustomerOrder"("orderNumber");
CREATE UNIQUE INDEX "CustomerOrder_productionOrderId_key"   ON "CustomerOrder"("productionOrderId");
CREATE UNIQUE INDEX "CustomerOrder_invoiceId_key"           ON "CustomerOrder"("invoiceId");
CREATE INDEX "CustomerOrder_userId_status_createdAt_idx"    ON "CustomerOrder"("userId", "status", "createdAt");
CREATE INDEX "CustomerOrder_userId_customerId_createdAt_idx" ON "CustomerOrder"("userId", "customerId", "createdAt");
CREATE INDEX "CustomerOrder_userId_dueAt_idx"               ON "CustomerOrder"("userId", "dueAt");
CREATE INDEX "CustomerOrder_userId_deletedAt_idx"           ON "CustomerOrder"("userId", "deletedAt");
ALTER TABLE "CustomerOrder"
    ADD CONSTRAINT "CustomerOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder"
    ADD CONSTRAINT "CustomerOrder_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder"
    ADD CONSTRAINT "CustomerOrder_orderConfirmationId_fkey"
    FOREIGN KEY ("orderConfirmationId") REFERENCES "OrderConfirmation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder"
    ADD CONSTRAINT "CustomerOrder_productionOrderId_fkey"
    FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerOrder"
    ADD CONSTRAINT "CustomerOrder_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── CustomerOrderItem ────────────────────────────────────────────
CREATE TABLE "CustomerOrderItem" (
    "id"              TEXT    NOT NULL,
    "customerOrderId" TEXT    NOT NULL,
    "productId"       TEXT,
    "description"     TEXT    NOT NULL,
    "quantity"        INTEGER NOT NULL DEFAULT 1,
    "unitPriceKobo"   INTEGER NOT NULL DEFAULT 0,
    "totalKobo"       INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CustomerOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerOrderItem_customerOrderId_idx" ON "CustomerOrderItem"("customerOrderId");
CREATE INDEX "CustomerOrderItem_productId_idx"       ON "CustomerOrderItem"("productId");
ALTER TABLE "CustomerOrderItem"
    ADD CONSTRAINT "CustomerOrderItem_customerOrderId_fkey"
    FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerOrderItem"
    ADD CONSTRAINT "CustomerOrderItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── PurchaseOrder ────────────────────────────────────────────────
CREATE TABLE "PurchaseOrder" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "supplierId" TEXT         NOT NULL,
    "poNumber"   TEXT         NOT NULL,
    "status"     TEXT         NOT NULL DEFAULT 'DRAFT',
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "totalKobo"  INTEGER      NOT NULL DEFAULT 0,
    "notes"      TEXT,
    "pdfUrl"     TEXT,
    "deletedAt"  TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key"          ON "PurchaseOrder"("poNumber");
CREATE INDEX "PurchaseOrder_userId_status_createdAt_idx"  ON "PurchaseOrder"("userId", "status", "createdAt");
CREATE INDEX "PurchaseOrder_userId_supplierId_idx"        ON "PurchaseOrder"("userId", "supplierId");
CREATE INDEX "PurchaseOrder_userId_expectedAt_idx"        ON "PurchaseOrder"("userId", "expectedAt");
CREATE INDEX "PurchaseOrder_userId_deletedAt_idx"         ON "PurchaseOrder"("userId", "deletedAt");
ALTER TABLE "PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── PurchaseOrderItem ────────────────────────────────────────────
CREATE TABLE "PurchaseOrderItem" (
    "id"               TEXT    NOT NULL,
    "purchaseOrderId"  TEXT    NOT NULL,
    "materialId"       TEXT    NOT NULL,
    "quantity"         INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCostKobo"     INTEGER NOT NULL DEFAULT 0,
    "totalKobo"        INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseOrderItem_purchaseOrderId_materialId_key"
    ON "PurchaseOrderItem"("purchaseOrderId", "materialId");
CREATE INDEX "PurchaseOrderItem_materialId_idx" ON "PurchaseOrderItem"("materialId");
ALTER TABLE "PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey"
    FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem"
    ADD CONSTRAINT "PurchaseOrderItem_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── StockMovement ────────────────────────────────────────────────
CREATE TABLE "StockMovement" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "itemType"     TEXT         NOT NULL,
    "itemId"       TEXT         NOT NULL,
    "reason"       TEXT         NOT NULL,
    "delta"        INTEGER      NOT NULL,
    "balanceAfter" INTEGER      NOT NULL,
    "refType"      TEXT,
    "refId"        TEXT,
    "notes"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockMovement_userId_itemType_itemId_createdAt_idx"
    ON "StockMovement"("userId", "itemType", "itemId", "createdAt");
CREATE INDEX "StockMovement_userId_reason_createdAt_idx"
    ON "StockMovement"("userId", "reason", "createdAt");
CREATE INDEX "StockMovement_userId_refType_refId_idx"
    ON "StockMovement"("userId", "refType", "refId");
ALTER TABLE "StockMovement"
    ADD CONSTRAINT "StockMovement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
