-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'PAYMENT_REVERSAL';

-- AlterTable
ALTER TABLE "customer_settlements"
ADD COLUMN "reversalDate" TIMESTAMP(3),
ADD COLUMN "reversalIdempotencyPayloadHash" TEXT,
ADD COLUMN "reversalCorrelationId" TEXT,
ADD COLUMN "reversalDocumentHash" TEXT,
ADD COLUMN "reversalAccountingSourceLinkId" TEXT;

-- AlterTable
ALTER TABLE "customer_settlement_allocations"
ADD COLUMN "reversalCustomerLedgerEntryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlements_reversal_correlation_key"
ON "customer_settlements"("organizationId", "reversalCorrelationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlement_allocations_reversalCustomerLedgerEntryId_key"
ON "customer_settlement_allocations"("reversalCustomerLedgerEntryId");

-- AddForeignKey
ALTER TABLE "customer_settlement_allocations"
ADD CONSTRAINT "customer_settlement_allocations_reversalCustomerLedgerEntryId_fkey"
FOREIGN KEY ("reversalCustomerLedgerEntryId") REFERENCES "customer_ledger_entries"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "customer_settlements"
ADD CONSTRAINT "customer_settlements_reversed_evidence_complete_check"
CHECK (
  (
    "status" = 'POSTED'
    AND "reversalDate" IS NULL
    AND "reversedAt" IS NULL
    AND "reversedById" IS NULL
    AND "reversalReason" IS NULL
    AND "reversalIdempotencyKey" IS NULL
    AND "reversalIdempotencyPayloadHash" IS NULL
    AND "reversalCorrelationId" IS NULL
    AND "reversalDocumentHash" IS NULL
    AND "reversalEvidenceHash" IS NULL
    AND "reversalLedgerPostingBatchId" IS NULL
    AND "reversalJournalEntryId" IS NULL
    AND "reversalAccountingSourceLinkId" IS NULL
    AND "reversalBusinessEventId" IS NULL
  )
  OR (
    "status" = 'REVERSED'
    AND "reversalDate" IS NOT NULL
    AND "reversedAt" IS NOT NULL
    AND "reversedById" IS NOT NULL
    AND "reversedById" <> "receivedById"
    AND "reversalReason" IS NOT NULL
    AND char_length(btrim("reversalReason")) BETWEEN 3 AND 500
    AND "reversalIdempotencyKey" IS NOT NULL
    AND char_length(btrim("reversalIdempotencyKey")) BETWEEN 8 AND 160
    AND "reversalIdempotencyPayloadHash" IS NOT NULL
    AND char_length("reversalIdempotencyPayloadHash") = 64
    AND "reversalCorrelationId" IS NOT NULL
    AND char_length(btrim("reversalCorrelationId")) BETWEEN 8 AND 160
    AND "reversalDocumentHash" IS NOT NULL
    AND "reversalDocumentHash" ~ '^[0-9a-f]{64}$'
    AND "reversalEvidenceHash" IS NOT NULL
    AND "reversalEvidenceHash" ~ '^[0-9a-f]{64}$'
    AND "reversalLedgerPostingBatchId" IS NOT NULL
    AND "reversalJournalEntryId" IS NOT NULL
    AND "reversalAccountingSourceLinkId" IS NOT NULL
    AND "reversalBusinessEventId" IS NOT NULL
    AND "reversalDate" >= "settlementDate"
  )
);
