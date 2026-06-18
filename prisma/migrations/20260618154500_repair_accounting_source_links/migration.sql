-- Idempotent repair for environments where the accounting source trace table
-- is missing while the rest of the accounting kernel already exists.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountingSourceType') THEN
    CREATE TYPE "AccountingSourceType" AS ENUM (
      'MANUAL',
      'POS_SALE',
      'POS_PAYMENT',
      'POS_REFUND',
      'POS_VOID',
      'CASH_DRAWER_CLOSE',
      'GOODS_RECEIPT',
      'SUPPLIER_INVOICE',
      'SUPPLIER_PAYMENT',
      'CUSTOMER_SETTLEMENT',
      'EXPENSE',
      'STOCK_ADJUSTMENT',
      'STOCK_COUNT',
      'STOCK_TRANSFER',
      'PAYROLL_RUN',
      'PAYROLL_PAYMENT',
      'PRODUCTION_BATCH',
      'PAYMENT_RECONCILIATION',
      'PAYMENT_SUSPENSE',
      'OPENING_BALANCE',
      'IMPORT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "accounting_source_links" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "postingBatchId" TEXT NOT NULL,
  "journalEntryId" TEXT,
  "sourceType" "AccountingSourceType" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceNumber" TEXT,
  "sourceDate" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accounting_source_links_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounting_source_links_organizationId_fkey'
  ) THEN
    ALTER TABLE "accounting_source_links"
      ADD CONSTRAINT "accounting_source_links_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounting_source_links_postingBatchId_fkey'
  ) THEN
    ALTER TABLE "accounting_source_links"
      ADD CONSTRAINT "accounting_source_links_postingBatchId_fkey"
      FOREIGN KEY ("postingBatchId") REFERENCES "ledger_posting_batches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'accounting_source_links_journalEntryId_fkey'
  ) THEN
    ALTER TABLE "accounting_source_links"
      ADD CONSTRAINT "accounting_source_links_journalEntryId_fkey"
      FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "accounting_source_links_organizationId_sourceType_sourceId_idx"
  ON "accounting_source_links"("organizationId", "sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "accounting_source_links_postingBatchId_idx"
  ON "accounting_source_links"("postingBatchId");

CREATE INDEX IF NOT EXISTS "accounting_source_links_journalEntryId_idx"
  ON "accounting_source_links"("journalEntryId");
