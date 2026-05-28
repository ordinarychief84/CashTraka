DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffMember' AND column_name='language') THEN
    ALTER TABLE "StaffMember" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'EN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffMember' AND column_name='userType') THEN
    ALTER TABLE "StaffMember" ADD COLUMN "userType" TEXT NOT NULL DEFAULT 'STANDARD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffMember' AND column_name='autoBookAdjustments') THEN
    ALTER TABLE "StaffMember" ADD COLUMN "autoBookAdjustments" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffMember' AND column_name='autoBookMovements') THEN
    ALTER TABLE "StaffMember" ADD COLUMN "autoBookMovements" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='StaffMember' AND column_name='associatedEmployee') THEN
    ALTER TABLE "StaffMember" ADD COLUMN "associatedEmployee" TEXT;
  END IF;
END $$;
