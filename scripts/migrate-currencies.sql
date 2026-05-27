DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Currency') THEN
    CREATE TABLE "Currency" (
      "id"           TEXT PRIMARY KEY,
      "userId"       TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "code"         TEXT NOT NULL,
      "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "isDefault"    BOOLEAN NOT NULL DEFAULT FALSE,
      "deletedAt"    TIMESTAMP(3),
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX "Currency_userId_code_key" ON "Currency"("userId","code");
    CREATE INDEX "Currency_userId_isDefault_idx" ON "Currency"("userId","isDefault");
  END IF;
END $$;
