-- Audit Fix Plan Migration
-- Adds: CustomerNote model, notes/tags on Customer, SEO fields on BlogPost

-- Customer notes and tags
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tags" TEXT;

-- CustomerNote model
CREATE TABLE IF NOT EXISTS "CustomerNote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerNote_userId_idx" ON "CustomerNote"("userId");

ALTER TABLE "CustomerNote" DROP CONSTRAINT IF EXISTS "CustomerNote_customerId_fkey";
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerNote" DROP CONSTRAINT IF EXISTS "CustomerNote_userId_fkey";
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BlogPost SEO fields
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "ogTitle" TEXT;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "ogImage" TEXT;
