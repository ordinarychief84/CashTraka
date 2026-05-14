/**
 * One-shot production migration to create the 11 operational-planning
 * tables that were added to `prisma/schema.prisma` during the small-batch
 * pivot but never reached the prod DB (because `prisma db push` refused
 * without `--accept-data-loss` due to landlord-vertical leftovers).
 *
 * Idempotent: every CREATE / ALTER uses IF NOT EXISTS so re-running is a
 * no-op. Does NOT drop anything. Does NOT touch the legacy
 * Property/Tenant rows — those can be dropped in a separate cleanup once
 * we're sure nothing reads them.
 *
 * Run:  npx tsx scripts/migrate-ops-tables.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function exec(label: string, sql: string) {
  process.stdout.write(`  ${label} … `);
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('ok');
  } catch (e: any) {
    console.log('FAIL:', (e.message || '').split('\n')[0]);
    throw e;
  }
}

async function main() {
  console.log('────────────────────────────────────────────────────────');
  console.log(' ops-tables migration — idempotent');
  console.log('────────────────────────────────────────────────────────');

  // Supplier
  await exec(
    'CREATE TABLE Supplier',
    `CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "contactPerson" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "address" TEXT,
      "notes" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  );
  await exec(
    'idx Supplier_userId_deletedAt',
    `CREATE INDEX IF NOT EXISTS "Supplier_userId_deletedAt_idx" ON "Supplier"("userId","deletedAt")`,
  );
  await exec(
    'idx Supplier_userId_name',
    `CREATE INDEX IF NOT EXISTS "Supplier_userId_name_idx" ON "Supplier"("userId","name")`,
  );

  // RawMaterial
  await exec(
    'CREATE TABLE RawMaterial',
    `CREATE TABLE IF NOT EXISTS "RawMaterial" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "sku" TEXT,
      "unit" TEXT NOT NULL DEFAULT 'unit',
      "stock" INTEGER NOT NULL DEFAULT 0,
      "reorderLevel" INTEGER NOT NULL DEFAULT 0,
      "unitCostKobo" INTEGER NOT NULL DEFAULT 0,
      "supplierId" TEXT,
      "expiresAt" TIMESTAMP(3),
      "notes" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "RawMaterial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "RawMaterial_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL
    )`,
  );
  await exec(
    'idx RawMaterial_userId_deletedAt',
    `CREATE INDEX IF NOT EXISTS "RawMaterial_userId_deletedAt_idx" ON "RawMaterial"("userId","deletedAt")`,
  );
  await exec(
    'idx RawMaterial_userId_supplierId',
    `CREATE INDEX IF NOT EXISTS "RawMaterial_userId_supplierId_idx" ON "RawMaterial"("userId","supplierId")`,
  );
  await exec(
    'idx RawMaterial_userId_expiresAt',
    `CREATE INDEX IF NOT EXISTS "RawMaterial_userId_expiresAt_idx" ON "RawMaterial"("userId","expiresAt")`,
  );

  // Recipe
  await exec(
    'CREATE TABLE Recipe',
    `CREATE TABLE IF NOT EXISTS "Recipe" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL UNIQUE,
      "yieldQty" INTEGER NOT NULL DEFAULT 1,
      "notes" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "Recipe_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
    )`,
  );
  await exec(
    'idx Recipe_userId_deletedAt',
    `CREATE INDEX IF NOT EXISTS "Recipe_userId_deletedAt_idx" ON "Recipe"("userId","deletedAt")`,
  );

  // RecipeItem
  await exec(
    'CREATE TABLE RecipeItem',
    `CREATE TABLE IF NOT EXISTS "RecipeItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "recipeId" TEXT NOT NULL,
      "materialId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "notes" TEXT,
      CONSTRAINT "RecipeItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE,
      CONSTRAINT "RecipeItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT
    )`,
  );
  await exec(
    'unique RecipeItem_recipeId_materialId',
    `CREATE UNIQUE INDEX IF NOT EXISTS "RecipeItem_recipeId_materialId_key" ON "RecipeItem"("recipeId","materialId")`,
  );
  await exec(
    'idx RecipeItem_materialId',
    `CREATE INDEX IF NOT EXISTS "RecipeItem_materialId_idx" ON "RecipeItem"("materialId")`,
  );

  // ProductionOrder (created BEFORE CustomerOrder because CustomerOrder
  // has an FK to ProductionOrder via productionOrderId)
  await exec(
    'CREATE TABLE ProductionOrder',
    `CREATE TABLE IF NOT EXISTS "ProductionOrder" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "productionNumber" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'PLANNED',
      "plannedStartAt" TIMESTAMP(3),
      "plannedEndAt" TIMESTAMP(3),
      "startedAt" TIMESTAMP(3),
      "completedAt" TIMESTAMP(3),
      "notes" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ProductionOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
    )`,
  );
  await exec(
    'idx ProductionOrder_userId_status_createdAt',
    `CREATE INDEX IF NOT EXISTS "ProductionOrder_userId_status_createdAt_idx" ON "ProductionOrder"("userId","status","createdAt")`,
  );
  await exec(
    'idx ProductionOrder_userId_plannedEndAt',
    `CREATE INDEX IF NOT EXISTS "ProductionOrder_userId_plannedEndAt_idx" ON "ProductionOrder"("userId","plannedEndAt")`,
  );
  await exec(
    'idx ProductionOrder_userId_deletedAt',
    `CREATE INDEX IF NOT EXISTS "ProductionOrder_userId_deletedAt_idx" ON "ProductionOrder"("userId","deletedAt")`,
  );

  // ProductionOrderItem
  await exec(
    'CREATE TABLE ProductionOrderItem',
    `CREATE TABLE IF NOT EXISTS "ProductionOrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "productionOrderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitCostKoboSnapshot" INTEGER,
      CONSTRAINT "ProductionOrderItem_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE,
      CONSTRAINT "ProductionOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT
    )`,
  );
  await exec(
    'unique ProductionOrderItem_productionOrderId_productId',
    `CREATE UNIQUE INDEX IF NOT EXISTS "ProductionOrderItem_productionOrderId_productId_key" ON "ProductionOrderItem"("productionOrderId","productId")`,
  );
  await exec(
    'idx ProductionOrderItem_productId',
    `CREATE INDEX IF NOT EXISTS "ProductionOrderItem_productId_idx" ON "ProductionOrderItem"("productId")`,
  );

  // CustomerOrder
  await exec(
    'CREATE TABLE CustomerOrder',
    `CREATE TABLE IF NOT EXISTS "CustomerOrder" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "customerId" TEXT,
      "customerName" TEXT NOT NULL,
      "customerPhone" TEXT,
      "orderNumber" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'NEW',
      "dueAt" TIMESTAMP(3),
      "totalKobo" INTEGER NOT NULL DEFAULT 0,
      "notes" TEXT,
      "orderConfirmationId" TEXT,
      "productionOrderId" TEXT UNIQUE,
      "invoiceId" TEXT UNIQUE,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "CustomerOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "CustomerOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL,
      CONSTRAINT "CustomerOrder_orderConfirmationId_fkey" FOREIGN KEY ("orderConfirmationId") REFERENCES "OrderConfirmation"("id") ON DELETE SET NULL,
      CONSTRAINT "CustomerOrder_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL,
      CONSTRAINT "CustomerOrder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL
    )`,
  );
  await exec(
    'idx CustomerOrder_userId_status_createdAt',
    `CREATE INDEX IF NOT EXISTS "CustomerOrder_userId_status_createdAt_idx" ON "CustomerOrder"("userId","status","createdAt")`,
  );
  await exec(
    'idx CustomerOrder_userId_customerId_createdAt',
    `CREATE INDEX IF NOT EXISTS "CustomerOrder_userId_customerId_createdAt_idx" ON "CustomerOrder"("userId","customerId","createdAt")`,
  );
  await exec(
    'idx CustomerOrder_userId_dueAt',
    `CREATE INDEX IF NOT EXISTS "CustomerOrder_userId_dueAt_idx" ON "CustomerOrder"("userId","dueAt")`,
  );
  await exec(
    'idx CustomerOrder_userId_deletedAt',
    `CREATE INDEX IF NOT EXISTS "CustomerOrder_userId_deletedAt_idx" ON "CustomerOrder"("userId","deletedAt")`,
  );

  // CustomerOrderItem
  await exec(
    'CREATE TABLE CustomerOrderItem',
    `CREATE TABLE IF NOT EXISTS "CustomerOrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "customerOrderId" TEXT NOT NULL,
      "productId" TEXT,
      "description" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPriceKobo" INTEGER NOT NULL DEFAULT 0,
      "totalKobo" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "CustomerOrderItem_customerOrderId_fkey" FOREIGN KEY ("customerOrderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE,
      CONSTRAINT "CustomerOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL
    )`,
  );
  await exec(
    'idx CustomerOrderItem_customerOrderId',
    `CREATE INDEX IF NOT EXISTS "CustomerOrderItem_customerOrderId_idx" ON "CustomerOrderItem"("customerOrderId")`,
  );
  await exec(
    'idx CustomerOrderItem_productId',
    `CREATE INDEX IF NOT EXISTS "CustomerOrderItem_productId_idx" ON "CustomerOrderItem"("productId")`,
  );

  // PurchaseOrder
  await exec(
    'CREATE TABLE PurchaseOrder',
    `CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "supplierId" TEXT NOT NULL,
      "poNumber" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "expectedAt" TIMESTAMP(3),
      "receivedAt" TIMESTAMP(3),
      "totalKobo" INTEGER NOT NULL DEFAULT 0,
      "notes" TEXT,
      "pdfUrl" TEXT,
      "deletedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "PurchaseOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
      CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT
    )`,
  );
  await exec(
    'idx PurchaseOrder_userId_status_createdAt',
    `CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_status_createdAt_idx" ON "PurchaseOrder"("userId","status","createdAt")`,
  );
  await exec(
    'idx PurchaseOrder_userId_supplierId',
    `CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_supplierId_idx" ON "PurchaseOrder"("userId","supplierId")`,
  );
  await exec(
    'idx PurchaseOrder_userId_expectedAt',
    `CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_expectedAt_idx" ON "PurchaseOrder"("userId","expectedAt")`,
  );
  await exec(
    'idx PurchaseOrder_userId_deletedAt',
    `CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_deletedAt_idx" ON "PurchaseOrder"("userId","deletedAt")`,
  );

  // PurchaseOrderItem
  await exec(
    'CREATE TABLE PurchaseOrderItem',
    `CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "purchaseOrderId" TEXT NOT NULL,
      "materialId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "quantityReceived" INTEGER NOT NULL DEFAULT 0,
      "unitCostKobo" INTEGER NOT NULL DEFAULT 0,
      "totalKobo" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
      CONSTRAINT "PurchaseOrderItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT
    )`,
  );
  await exec(
    'unique PurchaseOrderItem_purchaseOrderId_materialId',
    `CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_materialId_key" ON "PurchaseOrderItem"("purchaseOrderId","materialId")`,
  );
  await exec(
    'idx PurchaseOrderItem_materialId',
    `CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_materialId_idx" ON "PurchaseOrderItem"("materialId")`,
  );

  // StockMovement
  await exec(
    'CREATE TABLE StockMovement',
    `CREATE TABLE IF NOT EXISTS "StockMovement" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "itemType" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "delta" INTEGER NOT NULL,
      "balanceAfter" INTEGER NOT NULL,
      "refType" TEXT,
      "refId" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT
    )`,
  );
  await exec(
    'idx StockMovement_userId_itemType_itemId_createdAt',
    `CREATE INDEX IF NOT EXISTS "StockMovement_userId_itemType_itemId_createdAt_idx" ON "StockMovement"("userId","itemType","itemId","createdAt")`,
  );
  await exec(
    'idx StockMovement_userId_reason_createdAt',
    `CREATE INDEX IF NOT EXISTS "StockMovement_userId_reason_createdAt_idx" ON "StockMovement"("userId","reason","createdAt")`,
  );
  await exec(
    'idx StockMovement_userId_refType_refId',
    `CREATE INDEX IF NOT EXISTS "StockMovement_userId_refType_refId_idx" ON "StockMovement"("userId","refType","refId")`,
  );

  console.log('────────────────────────────────────────────────────────');
  console.log(' Done. All 11 ops tables present.');
}

main()
  .catch((err) => {
    console.error('FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
