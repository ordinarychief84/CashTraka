/**
 * Bundle A — operational planning schema deepening.
 *
 * Adds ~30 nullable columns and 1 new table (MaterialShortageAlert). Every
 * statement is idempotent (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT
 * EXISTS) so the script is safe to run multiple times.
 *
 * Run:
 *   npx tsx scripts/ops-deepening-migration.ts                  # dry-run
 *   CONFIRM_OPS_MIGRATION=yes npx tsx scripts/ops-deepening-migration.ts
 *
 * Why this rather than `prisma migrate dev`: prod is a Neon Postgres that
 * lives behind a single DATABASE_URL with no shadow database. The repo
 * uses one-shot idempotent scripts to keep migrations boring + reviewable.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CONFIRM = process.env.CONFIRM_OPS_MIGRATION === 'yes';

async function exec(label: string, sql: string) {
  process.stdout.write(`  ${label} … `);
  if (!CONFIRM) {
    console.log('would run (dry-run)');
    return;
  }
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('ok');
  } catch (e: any) {
    console.log('FAIL:', (e.message || '').split('\n')[0]);
    throw e;
  }
}

function maskConn(url: string | undefined): string {
  if (!url) return '<unset>';
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? u.username + ':***@' : ''}${u.host}${u.pathname}`;
  } catch {
    return '<unparseable>';
  }
}

async function main() {
  console.log('Ops-deepening migration');
  console.log(`  DATABASE_URL: ${maskConn(process.env.DATABASE_URL)}`);
  console.log(`  CONFIRM:      ${CONFIRM ? 'yes — will execute' : 'no — dry run'}`);
  console.log('');

  // ── Supplier ──────────────────────────────────────────────────────
  console.log('Supplier:');
  for (const sql of [
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "supplierCategory" TEXT`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "materialsSupplied" TEXT`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "leadTimeDays" INTEGER`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "minimumOrderQuantity" INTEGER`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "lastPurchaseAt" TIMESTAMP(3)`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "lastPurchaseAmountKobo" INTEGER`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "onTimeDeliveryRating" INTEGER`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "qualityRating" INTEGER`,
    `ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE'`,
    `CREATE INDEX IF NOT EXISTS "Supplier_userId_status_idx" ON "Supplier"("userId", "status")`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── RawMaterial ───────────────────────────────────────────────────
  console.log('\nRawMaterial:');
  for (const sql of [
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "category" TEXT`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "materialType" TEXT`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "safetyStock" INTEGER`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "minimumPurchaseQuantity" INTEGER`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "expectedLeadTimeDays" INTEGER`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "supplierSku" TEXT`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "storageLocation" TEXT`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "batchNumber" TEXT`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "lastPurchasePriceKobo" INTEGER`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "qualityStatus" TEXT NOT NULL DEFAULT 'APPROVED'`,
    `ALTER TABLE "RawMaterial" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE'`,
    `CREATE INDEX IF NOT EXISTS "RawMaterial_userId_status_idx" ON "RawMaterial"("userId", "status")`,
    `CREATE INDEX IF NOT EXISTS "RawMaterial_userId_materialType_idx" ON "RawMaterial"("userId", "materialType")`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── Recipe ────────────────────────────────────────────────────────
  console.log('\nRecipe:');
  for (const sql of [
    `ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "recipeName" TEXT`,
    `ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE'`,
    `ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "outputUnit" TEXT`,
    `CREATE INDEX IF NOT EXISTS "Recipe_userId_status_idx" ON "Recipe"("userId", "status")`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── RecipeItem ────────────────────────────────────────────────────
  console.log('\nRecipeItem:');
  for (const sql of [
    `ALTER TABLE "RecipeItem" ADD COLUMN IF NOT EXISTS "wastageAllowancePercent" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "RecipeItem" ADD COLUMN IF NOT EXISTS "substituteAllowed" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "RecipeItem" ADD COLUMN IF NOT EXISTS "substituteMaterialId" TEXT`,
    // Best-effort FK creation. Wrap in DO block so re-runs don't error.
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM information_schema.table_constraints
         WHERE constraint_name = 'RecipeItem_substituteMaterialId_fkey'
       ) THEN
         ALTER TABLE "RecipeItem"
           ADD CONSTRAINT "RecipeItem_substituteMaterialId_fkey"
           FOREIGN KEY ("substituteMaterialId") REFERENCES "RawMaterial"("id") ON DELETE SET NULL;
       END IF;
     END $$`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── CustomerOrder ─────────────────────────────────────────────────
  console.log('\nCustomerOrder:');
  for (const sql of [
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID'`,
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL'`,
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "source" TEXT`,
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT`,
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT`,
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "deliveryNote" TEXT`,
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT`,
    `ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "internalNote" TEXT`,
    `CREATE INDEX IF NOT EXISTS "CustomerOrder_userId_paymentStatus_idx" ON "CustomerOrder"("userId", "paymentStatus")`,
    `CREATE INDEX IF NOT EXISTS "CustomerOrder_userId_priority_dueAt_idx" ON "CustomerOrder"("userId", "priority", "dueAt")`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── CustomerOrderItem ─────────────────────────────────────────────
  console.log('\nCustomerOrderItem:');
  for (const sql of [
    `ALTER TABLE "CustomerOrderItem" ADD COLUMN IF NOT EXISTS "discountKobo" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "CustomerOrderItem" ADD COLUMN IF NOT EXISTS "lineNotes" TEXT`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── ProductionOrder ───────────────────────────────────────────────
  console.log('\nProductionOrder:');
  for (const sql of [
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "title" TEXT`,
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL'`,
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT`,
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "quantityProduced" INTEGER`,
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "quantityDamaged" INTEGER`,
    `ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "quantityAccepted" INTEGER`,
    `CREATE INDEX IF NOT EXISTS "ProductionOrder_userId_priority_plannedEndAt_idx" ON "ProductionOrder"("userId", "priority", "plannedEndAt")`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── PurchaseOrder ─────────────────────────────────────────────────
  console.log('\nPurchaseOrder:');
  for (const sql of [
    `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID'`,
    `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "amountPaidKobo" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL'`,
    `CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_paymentStatus_idx" ON "PurchaseOrder"("userId", "paymentStatus")`,
    `CREATE INDEX IF NOT EXISTS "PurchaseOrder_userId_priority_expectedAt_idx" ON "PurchaseOrder"("userId", "priority", "expectedAt")`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── PurchaseOrderItem ─────────────────────────────────────────────
  console.log('\nPurchaseOrderItem:');
  for (const sql of [
    `ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "quantityRejected" INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "expectedDeliveryAt" TIMESTAMP(3)`,
    `ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "qualityStatus" TEXT`,
    `ALTER TABLE "PurchaseOrderItem" ADD COLUMN IF NOT EXISTS "lineNotes" TEXT`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── Product ───────────────────────────────────────────────────────
  console.log('\nProduct:');
  for (const sql of [
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "safetyStock" INTEGER`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE'`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "category" TEXT`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unitOfSale" TEXT`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "minimumSellingQuantity" INTEGER`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "defaultBatchSize" INTEGER`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "defaultProductionLeadTimeDays" INTEGER`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "canBeProduced" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "batchTracking" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "expiryTracking" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcodeValue" TEXT`,
    `CREATE INDEX IF NOT EXISTS "Product_userId_status_idx" ON "Product"("userId", "status")`,
    `CREATE INDEX IF NOT EXISTS "Product_userId_category_idx" ON "Product"("userId", "category")`,
    `CREATE INDEX IF NOT EXISTS "Product_userId_canBeProduced_idx" ON "Product"("userId", "canBeProduced")`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  // ── MaterialShortageAlert (new table) ─────────────────────────────
  console.log('\nMaterialShortageAlert:');
  await exec(
    'create table',
    `CREATE TABLE IF NOT EXISTS "MaterialShortageAlert" (
       "id"                  TEXT PRIMARY KEY,
       "userId"              TEXT NOT NULL,
       "productionOrderId"   TEXT NOT NULL,
       "materialId"          TEXT NOT NULL,
       "requiredQuantity"    INTEGER NOT NULL,
       "availableQuantity"   INTEGER NOT NULL,
       "shortageQuantity"    INTEGER NOT NULL,
       "severity"            TEXT NOT NULL DEFAULT 'MEDIUM',
       "recommendedAction"   TEXT NOT NULL DEFAULT 'BUY_MATERIAL',
       "neededByDate"        TIMESTAMP(3),
       "status"              TEXT NOT NULL DEFAULT 'OPEN',
       "resolutionNote"      TEXT,
       "resolvedAt"          TIMESTAMP(3),
       "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  );
  for (const sql of [
    `CREATE UNIQUE INDEX IF NOT EXISTS "MaterialShortageAlert_productionOrderId_materialId_key"
       ON "MaterialShortageAlert"("productionOrderId", "materialId")`,
    `CREATE INDEX IF NOT EXISTS "MaterialShortageAlert_userId_status_createdAt_idx"
       ON "MaterialShortageAlert"("userId", "status", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "MaterialShortageAlert_userId_severity_idx"
       ON "MaterialShortageAlert"("userId", "severity")`,
    `CREATE INDEX IF NOT EXISTS "MaterialShortageAlert_userId_materialId_idx"
       ON "MaterialShortageAlert"("userId", "materialId")`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MaterialShortageAlert_userId_fkey') THEN
         ALTER TABLE "MaterialShortageAlert"
           ADD CONSTRAINT "MaterialShortageAlert_userId_fkey"
           FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MaterialShortageAlert_productionOrderId_fkey') THEN
         ALTER TABLE "MaterialShortageAlert"
           ADD CONSTRAINT "MaterialShortageAlert_productionOrderId_fkey"
           FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE;
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'MaterialShortageAlert_materialId_fkey') THEN
         ALTER TABLE "MaterialShortageAlert"
           ADD CONSTRAINT "MaterialShortageAlert_materialId_fkey"
           FOREIGN KEY ("materialId") REFERENCES "RawMaterial"("id") ON DELETE RESTRICT;
       END IF;
     END $$`,
  ]) {
    await exec(sql.slice(0, 60), sql);
  }

  console.log('\nDone.');
  if (!CONFIRM) {
    console.log('Re-run with CONFIRM_OPS_MIGRATION=yes to actually execute.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
