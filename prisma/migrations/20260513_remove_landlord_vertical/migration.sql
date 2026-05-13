-- Remove the landlord / property-manager vertical.
--
-- Pre-deployment check confirmed zero rows across all four tables in
-- production (no property-manager tenants exist). Order matters:
-- LeaseReminder + RentPayment FK Tenant, Tenant FKs Property.

DROP TABLE IF EXISTS "LeaseReminder";
DROP TABLE IF EXISTS "RentPayment";
DROP TABLE IF EXISTS "Tenant";
DROP TABLE IF EXISTS "Property";
