-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseRole" TEXT NOT NULL DEFAULT 'CASHIER',
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomRole_userId_idx" ON "CustomRole"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_userId_name_key" ON "CustomRole"("userId", "name");

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add customRoleId to StaffMember
ALTER TABLE "StaffMember" ADD COLUMN "customRoleId" TEXT;

-- CreateIndex
CREATE INDEX "StaffMember_customRoleId_idx" ON "StaffMember"("customRoleId");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
