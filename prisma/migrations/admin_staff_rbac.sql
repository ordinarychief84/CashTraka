-- Admin Staff RBAC Migration
-- Run this in Neon SQL Editor against the CashTraka database.

CREATE TABLE IF NOT EXISTS "AdminStaff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "adminRole" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminStaff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaff_email_key" ON "AdminStaff"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminStaff_inviteToken_key" ON "AdminStaff"("inviteToken");
CREATE INDEX IF NOT EXISTS "AdminStaff_adminRole_idx" ON "AdminStaff"("adminRole");
CREATE INDEX IF NOT EXISTS "AdminStaff_status_idx" ON "AdminStaff"("status");
CREATE INDEX IF NOT EXISTS "AdminStaff_email_idx" ON "AdminStaff"("email");

ALTER TABLE "AdminStaff" ADD CONSTRAINT "AdminStaff_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
