-- CreateEnum
CREATE TYPE "CustomerSettlementStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateTable
CREATE TABLE "customer_settlements" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "settlementNumber" TEXT NOT NULL,
    "status" "CustomerSettlementStatus" NOT NULL DEFAULT 'POSTED',
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "idempotencyPayloadHash" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "externalReference" TEXT,
    "documentHash" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "ledgerPostingBatchId" TEXT,
    "journalEntryId" TEXT,
    "postedBusinessEventId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "reversalIdempotencyKey" TEXT,
    "reversalEvidenceHash" TEXT,
    "reversalLedgerPostingBatchId" TEXT,
    "reversalJournalEntryId" TEXT,
    "reversalBusinessEventId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_settlement_allocations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerSettlementId" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "customerLedgerEntryId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_settlement_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlements_organizationId_settlementNumber_key" ON "customer_settlements"("organizationId", "settlementNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlements_organizationId_idempotencyKey_key" ON "customer_settlements"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlements_organizationId_correlationId_key" ON "customer_settlements"("organizationId", "correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlements_external_reference_key" ON "customer_settlements"("organizationId", "method", "externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlements_reversal_idempotency_key" ON "customer_settlements"("organizationId", "reversalIdempotencyKey");

-- CreateIndex
CREATE INDEX "customer_settlements_organizationId_customerId_status_settlementDate_idx" ON "customer_settlements"("organizationId", "customerId", "status", "settlementDate");

-- CreateIndex
CREATE INDEX "customer_settlements_organizationId_settlementDate_idx" ON "customer_settlements"("organizationId", "settlementDate");

-- CreateIndex
CREATE UNIQUE INDEX "customer_settlement_allocations_customerLedgerEntryId_key" ON "customer_settlement_allocations"("customerLedgerEntryId");

CREATE UNIQUE INDEX "customer_settlement_allocations_customerSettlementId_salesOrderId_key" ON "customer_settlement_allocations"("customerSettlementId", "salesOrderId");

-- CreateIndex
CREATE INDEX "customer_settlement_allocations_organizationId_salesOrderId_idx" ON "customer_settlement_allocations"("organizationId", "salesOrderId");

-- AddForeignKey
ALTER TABLE "customer_settlements" ADD CONSTRAINT "customer_settlements_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_settlements" ADD CONSTRAINT "customer_settlements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_settlement_allocations" ADD CONSTRAINT "customer_settlement_allocations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_settlement_allocations" ADD CONSTRAINT "customer_settlement_allocations_customerSettlementId_fkey" FOREIGN KEY ("customerSettlementId") REFERENCES "customer_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_settlement_allocations" ADD CONSTRAINT "customer_settlement_allocations_customerLedgerEntryId_fkey" FOREIGN KEY ("customerLedgerEntryId") REFERENCES "customer_ledger_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_settlement_allocations" ADD CONSTRAINT "customer_settlement_allocations_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
