DO $$
BEGIN
  -- Item defaults
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultItemUnit') THEN
    ALTER TABLE "User" ADD COLUMN "defaultItemUnit" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultItemGroup') THEN
    ALTER TABLE "User" ADD COLUMN "defaultItemGroup" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultLocation') THEN
    ALTER TABLE "User" ADD COLUMN "defaultLocation" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultPrimarySupplier') THEN
    ALTER TABLE "User" ADD COLUMN "defaultPrimarySupplier" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='suggestNextNumberItem') THEN
    ALTER TABLE "User" ADD COLUMN "suggestNextNumberItem" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  -- Customer defaults
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerCurrency') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerCurrency" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerLanguage') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerLanguage" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerPaymentTerm') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerPaymentTerm" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerGroup') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerGroup" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerLayout') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerLayout" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerVatZone') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerVatZone" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerCountry') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerCountry" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultCustomerDeliveryTerms') THEN
    ALTER TABLE "User" ADD COLUMN "defaultCustomerDeliveryTerms" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='suggestNextNumberCustomer') THEN
    ALTER TABLE "User" ADD COLUMN "suggestNextNumberCustomer" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  -- Supplier defaults
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierCurrency') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierCurrency" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierLanguage') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierLanguage" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierPaymentTerm') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierPaymentTerm" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierGroup') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierGroup" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierLayout') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierLayout" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierVatZone') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierVatZone" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierCountry') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierCountry" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='defaultSupplierDeliveryTerms') THEN
    ALTER TABLE "User" ADD COLUMN "defaultSupplierDeliveryTerms" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='suggestNextNumberSupplier') THEN
    ALTER TABLE "User" ADD COLUMN "suggestNextNumberSupplier" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Accounting tab
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='costPricePrinciple') THEN
    ALTER TABLE "User" ADD COLUMN "costPricePrinciple" TEXT NOT NULL DEFAULT 'AVERAGE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='valuationAssociatedWithInvoicing') THEN
    ALTER TABLE "User" ADD COLUMN "valuationAssociatedWithInvoicing" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='negativeQtyValuation') THEN
    ALTER TABLE "User" ADD COLUMN "negativeQtyValuation" TEXT NOT NULL DEFAULT 'UNDECIDED';
  END IF;

  -- Advanced tab
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='priceDecimals') THEN
    ALTER TABLE "User" ADD COLUMN "priceDecimals" INTEGER NOT NULL DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='quantityDecimals') THEN
    ALTER TABLE "User" ADD COLUMN "quantityDecimals" INTEGER NOT NULL DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='decimalSeparator') THEN
    ALTER TABLE "User" ADD COLUMN "decimalSeparator" TEXT NOT NULL DEFAULT '.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='thousandsSeparator') THEN
    ALTER TABLE "User" ADD COLUMN "thousandsSeparator" TEXT NOT NULL DEFAULT ',';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='dateFormat') THEN
    ALTER TABLE "User" ADD COLUMN "dateFormat" TEXT NOT NULL DEFAULT 'DD-MM-YYYY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='showMondayFirst') THEN
    ALTER TABLE "User" ADD COLUMN "showMondayFirst" BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='updateSupplierPricesOnInvoice') THEN
    ALTER TABLE "User" ADD COLUMN "updateSupplierPricesOnInvoice" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='allowEditBomsInProduction') THEN
    ALTER TABLE "User" ADD COLUMN "allowEditBomsInProduction" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='includeDescriptionOnSalesLines') THEN
    ALTER TABLE "User" ADD COLUMN "includeDescriptionOnSalesLines" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='giveSupportAccess') THEN
    ALTER TABLE "User" ADD COLUMN "giveSupportAccess" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='enableInventorySharing') THEN
    ALTER TABLE "User" ADD COLUMN "enableInventorySharing" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='sendIntegrationErrorsByEmail') THEN
    ALTER TABLE "User" ADD COLUMN "sendIntegrationErrorsByEmail" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  -- Fields tab: custom fields per entity type
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='CustomField') THEN
    CREATE TABLE "CustomField" (
      "id"                 TEXT PRIMARY KEY,
      "userId"             TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "entityType"         TEXT NOT NULL,
      "fieldType"          TEXT NOT NULL,
      "name"               TEXT NOT NULL,
      "availableInLayouts" BOOLEAN NOT NULL DEFAULT FALSE,
      "deletedAt"          TIMESTAMP(3),
      "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "CustomField_userId_entityType_deletedAt_idx" ON "CustomField"("userId","entityType","deletedAt");
  END IF;
END $$;
