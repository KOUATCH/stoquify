-- Preserve every existing batch as cycle 1. Later cycles are available only to
-- the source-owned suspense lifecycle, not to other posting domains.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE "ledger_posting_batches"
  ADD COLUMN "postingCycle" INTEGER NOT NULL DEFAULT 1,
  ADD CONSTRAINT "ledger_posting_batches_cycle_scope_check" CHECK (
    "postingCycle" >= 1 AND (
      "postingCycle" = 1 OR (
        "sourceType" = 'PAYMENT_SUSPENSE' AND
        "postingPurpose" IN ('SUSPENSE_RECLASSIFICATION', 'REVERSAL')
      )
    )
  );

CREATE UNIQUE INDEX "ledger_posting_batches_source_cycle_key"
  ON "ledger_posting_batches" ("organizationId", "sourceType", "sourceId", "postingPurpose", "postingCycle");

-- The replacement uniqueness and scope check are in force before the old
-- index is removed. The transaction prevents a window without protection.
DROP INDEX "ledger_posting_batches_organizationId_sourceType_sourceId_p_key";
COMMIT;
