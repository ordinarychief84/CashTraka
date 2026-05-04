-- Phase 5 of the kobo migration: one-shot backfill.
--
-- Populates every *Kobo column with naira * 100 for rows written before
-- Phase 4 dual-write went live. Idempotent — the WHERE predicate filters
-- out rows that already have a populated kobo column, so re-running is
-- safe and a no-op once everything is backfilled.
--
-- Run:
--   psql "$DATABASE_URL" -f scripts/backfill-kobo.sql
-- or via the wrapper that reports counts:
--   node scripts/backfill-kobo.mjs
--
-- The whole run is wrapped in a transaction. Any error rolls back the
-- entire backfill.

BEGIN;

-- ========================================================================
-- Pre-backfill counts (for sanity comparison after the run)
-- ========================================================================
\echo 'Pre-backfill counts of unbackfilled rows:'

SELECT 'Customer.totalPaid'      AS field, COUNT(*) FROM "Customer"      WHERE "totalPaidKobo"      = 0 AND "totalPaid"       != 0;
SELECT 'Customer.totalOwed'      AS field, COUNT(*) FROM "Customer"      WHERE "totalOwedKobo"      = 0 AND "totalOwed"       != 0;
SELECT 'Payment.amount'          AS field, COUNT(*) FROM "Payment"       WHERE "amountKobo"         = 0 AND "amount"          != 0;
SELECT 'PaymentItem.unitPrice'   AS field, COUNT(*) FROM "PaymentItem"   WHERE "unitPriceKobo"      = 0 AND "unitPrice"       != 0;
SELECT 'Debt.amountOwed'         AS field, COUNT(*) FROM "Debt"          WHERE "amountOwedKobo"     = 0 AND "amountOwed"      != 0;
SELECT 'Debt.amountPaid'         AS field, COUNT(*) FROM "Debt"          WHERE "amountPaidKobo"     = 0 AND "amountPaid"      != 0;
SELECT 'Product.price'           AS field, COUNT(*) FROM "Product"       WHERE "priceKobo"          = 0 AND "price"           != 0;
SELECT 'Product.cost'            AS field, COUNT(*) FROM "Product"       WHERE "costKobo"           IS NULL AND "cost"        IS NOT NULL;
SELECT 'Sale.subtotal'           AS field, COUNT(*) FROM "Sale"          WHERE "subtotalKobo"       = 0 AND "subtotal"        != 0;
SELECT 'Sale.tax'                AS field, COUNT(*) FROM "Sale"          WHERE "taxKobo"            = 0 AND "tax"             != 0;
SELECT 'Sale.discount'           AS field, COUNT(*) FROM "Sale"          WHERE "discountKobo"       = 0 AND "discount"        != 0;
SELECT 'Sale.total'              AS field, COUNT(*) FROM "Sale"          WHERE "totalKobo"          = 0 AND "total"           != 0;
SELECT 'SaleItem.unitPrice'      AS field, COUNT(*) FROM "SaleItem"      WHERE "unitPriceKobo"      = 0 AND "unitPrice"       != 0;
SELECT 'SaleItem.total'          AS field, COUNT(*) FROM "SaleItem"      WHERE "totalKobo"          = 0 AND "total"           != 0;
SELECT 'Expense.amount'          AS field, COUNT(*) FROM "Expense"       WHERE "amountKobo"         = 0 AND "amount"          != 0;
SELECT 'Invoice.subtotal'        AS field, COUNT(*) FROM "Invoice"       WHERE "subtotalKobo"       = 0 AND "subtotal"        != 0;
SELECT 'Invoice.discount'        AS field, COUNT(*) FROM "Invoice"       WHERE "discountKobo"       = 0 AND "discount"        != 0;
SELECT 'Invoice.tax'             AS field, COUNT(*) FROM "Invoice"       WHERE "taxKobo"            = 0 AND "tax"             != 0;
SELECT 'Invoice.total'           AS field, COUNT(*) FROM "Invoice"       WHERE "totalKobo"          = 0 AND "total"           != 0;
SELECT 'Invoice.amountPaid'      AS field, COUNT(*) FROM "Invoice"       WHERE "amountPaidKobo"     = 0 AND "amountPaid"      != 0;
SELECT 'InvoiceItem.unitPrice'   AS field, COUNT(*) FROM "InvoiceItem"   WHERE "unitPriceKobo"      = 0 AND "unitPrice"       != 0;
SELECT 'CreditNote.subtotal'     AS field, COUNT(*) FROM "CreditNote"    WHERE "subtotalKobo"       = 0 AND "subtotal"        != 0;
SELECT 'CreditNote.taxAmount'    AS field, COUNT(*) FROM "CreditNote"    WHERE "taxAmountKobo"      = 0 AND "taxAmount"       != 0;
SELECT 'CreditNote.total'        AS field, COUNT(*) FROM "CreditNote"    WHERE "totalKobo"          = 0 AND "total"           != 0;
SELECT 'Offer.subtotal'          AS field, COUNT(*) FROM "Offer"         WHERE "subtotalKobo"       = 0 AND "subtotal"        != 0;
SELECT 'Offer.taxAmount'         AS field, COUNT(*) FROM "Offer"         WHERE "taxAmountKobo"      = 0 AND "taxAmount"       != 0;
SELECT 'Offer.total'             AS field, COUNT(*) FROM "Offer"         WHERE "totalKobo"          = 0 AND "total"           != 0;
SELECT 'OfferItem.unitPrice'     AS field, COUNT(*) FROM "OfferItem"     WHERE "unitPriceKobo"      = 0 AND "unitPrice"       != 0;
SELECT 'OrderConfirmation.total' AS field, COUNT(*) FROM "OrderConfirmation" WHERE "totalKobo"      = 0 AND "total"           != 0;
SELECT 'Tenant.rentAmount'       AS field, COUNT(*) FROM "Tenant"        WHERE "rentAmountKobo"     = 0 AND "rentAmount"      != 0;
SELECT 'RentPayment.amount'      AS field, COUNT(*) FROM "RentPayment"   WHERE "amountKobo"         = 0 AND "amount"          != 0;
SELECT 'StaffMember.payAmount'   AS field, COUNT(*) FROM "StaffMember"   WHERE "payAmountKobo"      = 0 AND "payAmount"       != 0;
SELECT 'StaffPayment.amount'     AS field, COUNT(*) FROM "StaffPayment"  WHERE "amountKobo"         = 0 AND "amount"          != 0;
SELECT 'Receipt.balanceRemain'   AS field, COUNT(*) FROM "Receipt"       WHERE "balanceRemainingKobo" IS NULL AND "balanceRemaining" IS NOT NULL;
SELECT 'Refund.amount'           AS field, COUNT(*) FROM "Refund"        WHERE "amountKobo"         = 0 AND "amount"          != 0;
SELECT 'PaymentRequest.amount'   AS field, COUNT(*) FROM "PaymentRequest" WHERE "amountKobo"        = 0 AND "amount"          != 0;
SELECT 'ReminderLog.amount'      AS field, COUNT(*) FROM "ReminderLog"   WHERE "amountKobo"         = 0 AND "amount"          != 0;
SELECT 'CollectionScore.collected'   AS field, COUNT(*) FROM "CollectionScore" WHERE "collectedAmountKobo"   = 0 AND "collectedAmount"   != 0;
SELECT 'CollectionScore.outstanding'  AS field, COUNT(*) FROM "CollectionScore" WHERE "outstandingAmountKobo"  = 0 AND "outstandingAmount" != 0;
SELECT 'PromiseToPay.original'   AS field, COUNT(*) FROM "PromiseToPay"  WHERE "originalAmountKobo"  = 0 AND "originalAmount"  != 0;
SELECT 'PromiseToPay.remaining'  AS field, COUNT(*) FROM "PromiseToPay"  WHERE "remainingAmountKobo" = 0 AND "remainingAmount" != 0;
SELECT 'PromisePayment.amount'   AS field, COUNT(*) FROM "PromisePayment" WHERE "amountKobo"        = 0 AND "amount"          != 0;
SELECT 'InstallmentPlan.total'   AS field, COUNT(*) FROM "InstallmentPlan" WHERE "totalAmountKobo"  = 0 AND "totalAmount"     != 0;
SELECT 'InstallmentPlan.remain'  AS field, COUNT(*) FROM "InstallmentPlan" WHERE "remainingAmountKobo" = 0 AND "remainingAmount" != 0;
SELECT 'InstallmentPlan.initial' AS field, COUNT(*) FROM "InstallmentPlan" WHERE "initialAmountKobo" IS NULL AND "initialAmount" IS NOT NULL;
SELECT 'InstallmentPlan.recurring' AS field, COUNT(*) FROM "InstallmentPlan" WHERE "recurringAmountKobo" = 0 AND "recurringAmount" != 0;
SELECT 'InstallmentCharge.amount' AS field, COUNT(*) FROM "InstallmentCharge" WHERE "amountKobo"   = 0 AND "amount"          != 0;

-- ========================================================================
-- Updates (idempotent: only touches rows where kobo column is unset)
-- ========================================================================

UPDATE "Customer"          SET "totalPaidKobo"          = "totalPaid"          * 100 WHERE "totalPaidKobo"          = 0 AND "totalPaid"          != 0;
UPDATE "Customer"          SET "totalOwedKobo"          = "totalOwed"          * 100 WHERE "totalOwedKobo"          = 0 AND "totalOwed"          != 0;
UPDATE "Payment"           SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "PaymentItem"       SET "unitPriceKobo"          = "unitPrice"          * 100 WHERE "unitPriceKobo"          = 0 AND "unitPrice"          != 0;
UPDATE "Debt"              SET "amountOwedKobo"         = "amountOwed"         * 100 WHERE "amountOwedKobo"         = 0 AND "amountOwed"         != 0;
UPDATE "Debt"              SET "amountPaidKobo"         = "amountPaid"         * 100 WHERE "amountPaidKobo"         = 0 AND "amountPaid"         != 0;
UPDATE "Product"           SET "priceKobo"              = "price"              * 100 WHERE "priceKobo"              = 0 AND "price"              != 0;
UPDATE "Product"           SET "costKobo"               = "cost"               * 100 WHERE "costKobo"               IS NULL AND "cost"           IS NOT NULL;
UPDATE "Sale"              SET "subtotalKobo"           = "subtotal"           * 100 WHERE "subtotalKobo"           = 0 AND "subtotal"           != 0;
UPDATE "Sale"              SET "taxKobo"                = "tax"                * 100 WHERE "taxKobo"                = 0 AND "tax"                != 0;
UPDATE "Sale"              SET "discountKobo"           = "discount"           * 100 WHERE "discountKobo"           = 0 AND "discount"           != 0;
UPDATE "Sale"              SET "totalKobo"              = "total"              * 100 WHERE "totalKobo"              = 0 AND "total"              != 0;
UPDATE "SaleItem"          SET "unitPriceKobo"          = "unitPrice"          * 100 WHERE "unitPriceKobo"          = 0 AND "unitPrice"          != 0;
UPDATE "SaleItem"          SET "totalKobo"              = "total"              * 100 WHERE "totalKobo"              = 0 AND "total"              != 0;
UPDATE "Expense"           SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "Invoice"           SET "subtotalKobo"           = "subtotal"           * 100 WHERE "subtotalKobo"           = 0 AND "subtotal"           != 0;
UPDATE "Invoice"           SET "discountKobo"           = "discount"           * 100 WHERE "discountKobo"           = 0 AND "discount"           != 0;
UPDATE "Invoice"           SET "taxKobo"                = "tax"                * 100 WHERE "taxKobo"                = 0 AND "tax"                != 0;
UPDATE "Invoice"           SET "totalKobo"              = "total"              * 100 WHERE "totalKobo"              = 0 AND "total"              != 0;
UPDATE "Invoice"           SET "amountPaidKobo"         = "amountPaid"         * 100 WHERE "amountPaidKobo"         = 0 AND "amountPaid"         != 0;
UPDATE "InvoiceItem"       SET "unitPriceKobo"          = "unitPrice"          * 100 WHERE "unitPriceKobo"          = 0 AND "unitPrice"          != 0;
UPDATE "CreditNote"        SET "subtotalKobo"           = "subtotal"           * 100 WHERE "subtotalKobo"           = 0 AND "subtotal"           != 0;
UPDATE "CreditNote"        SET "taxAmountKobo"          = "taxAmount"          * 100 WHERE "taxAmountKobo"          = 0 AND "taxAmount"          != 0;
UPDATE "CreditNote"        SET "totalKobo"              = "total"              * 100 WHERE "totalKobo"              = 0 AND "total"              != 0;
UPDATE "Offer"             SET "subtotalKobo"           = "subtotal"           * 100 WHERE "subtotalKobo"           = 0 AND "subtotal"           != 0;
UPDATE "Offer"             SET "taxAmountKobo"          = "taxAmount"          * 100 WHERE "taxAmountKobo"          = 0 AND "taxAmount"          != 0;
UPDATE "Offer"             SET "totalKobo"              = "total"              * 100 WHERE "totalKobo"              = 0 AND "total"              != 0;
UPDATE "OfferItem"         SET "unitPriceKobo"          = "unitPrice"          * 100 WHERE "unitPriceKobo"          = 0 AND "unitPrice"          != 0;
UPDATE "OrderConfirmation" SET "totalKobo"              = "total"              * 100 WHERE "totalKobo"              = 0 AND "total"              != 0;
UPDATE "Tenant"            SET "rentAmountKobo"         = "rentAmount"         * 100 WHERE "rentAmountKobo"         = 0 AND "rentAmount"         != 0;
UPDATE "RentPayment"       SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "StaffMember"       SET "payAmountKobo"          = "payAmount"          * 100 WHERE "payAmountKobo"          = 0 AND "payAmount"          != 0;
UPDATE "StaffPayment"      SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "Receipt"           SET "balanceRemainingKobo"   = "balanceRemaining"   * 100 WHERE "balanceRemainingKobo"   IS NULL AND "balanceRemaining" IS NOT NULL;
UPDATE "Refund"            SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "PaymentRequest"    SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "ReminderLog"       SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "CollectionScore"   SET "collectedAmountKobo"    = "collectedAmount"    * 100 WHERE "collectedAmountKobo"    = 0 AND "collectedAmount"    != 0;
UPDATE "CollectionScore"   SET "outstandingAmountKobo"  = "outstandingAmount"  * 100 WHERE "outstandingAmountKobo"  = 0 AND "outstandingAmount"  != 0;
UPDATE "PromiseToPay"      SET "originalAmountKobo"     = "originalAmount"     * 100 WHERE "originalAmountKobo"     = 0 AND "originalAmount"     != 0;
UPDATE "PromiseToPay"      SET "remainingAmountKobo"    = "remainingAmount"    * 100 WHERE "remainingAmountKobo"    = 0 AND "remainingAmount"    != 0;
UPDATE "PromisePayment"    SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;
UPDATE "InstallmentPlan"   SET "totalAmountKobo"        = "totalAmount"        * 100 WHERE "totalAmountKobo"        = 0 AND "totalAmount"        != 0;
UPDATE "InstallmentPlan"   SET "remainingAmountKobo"    = "remainingAmount"    * 100 WHERE "remainingAmountKobo"    = 0 AND "remainingAmount"    != 0;
UPDATE "InstallmentPlan"   SET "initialAmountKobo"      = "initialAmount"      * 100 WHERE "initialAmountKobo"      IS NULL AND "initialAmount"  IS NOT NULL;
UPDATE "InstallmentPlan"   SET "recurringAmountKobo"    = "recurringAmount"    * 100 WHERE "recurringAmountKobo"    = 0 AND "recurringAmount"    != 0;
UPDATE "InstallmentCharge" SET "amountKobo"             = "amount"             * 100 WHERE "amountKobo"             = 0 AND "amount"             != 0;

-- ========================================================================
-- Post-backfill consistency check: every legacy/kobo pair must agree
-- (or have the kobo side legitimately ahead from a Phase 4 dual-write).
-- ========================================================================
\echo 'Post-backfill mismatch counts (should all be 0 except where Phase 4 has updated kobo but legacy was not touched):'

SELECT 'Customer.totalPaid'    AS field, COUNT(*) FROM "Customer"      WHERE "totalPaidKobo"      != "totalPaid" * 100;
SELECT 'Customer.totalOwed'    AS field, COUNT(*) FROM "Customer"      WHERE "totalOwedKobo"      != "totalOwed" * 100;
SELECT 'Payment.amount'        AS field, COUNT(*) FROM "Payment"       WHERE "amountKobo"         != "amount" * 100;
SELECT 'PaymentItem.unitPrice' AS field, COUNT(*) FROM "PaymentItem"   WHERE "unitPriceKobo"      != "unitPrice" * 100;
SELECT 'Debt.amountOwed'       AS field, COUNT(*) FROM "Debt"          WHERE "amountOwedKobo"     != "amountOwed" * 100;
SELECT 'Debt.amountPaid'       AS field, COUNT(*) FROM "Debt"          WHERE "amountPaidKobo"     != "amountPaid" * 100;
SELECT 'Product.price'         AS field, COUNT(*) FROM "Product"       WHERE "priceKobo"          != "price" * 100;
SELECT 'Sale.total'            AS field, COUNT(*) FROM "Sale"          WHERE "totalKobo"          != "total" * 100;
SELECT 'Expense.amount'        AS field, COUNT(*) FROM "Expense"       WHERE "amountKobo"         != "amount" * 100;
SELECT 'Invoice.total'         AS field, COUNT(*) FROM "Invoice"       WHERE "totalKobo"          != "total" * 100;

COMMIT;

\echo 'Backfill complete.'
