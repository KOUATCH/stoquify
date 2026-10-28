-- Durable payment reconciliation foundation required before inbox worker leases.
-- Generated from the current Prisma schema and scoped to payment reconciliation tables.

-- CreateEnum
CREATE TYPE "PaymentRailType" AS ENUM ('CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'WALLET', 'QR', 'CHEQUE', 'INTERNAL_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "ProviderAccountStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'UNMAPPED');

-- CreateEnum
CREATE TYPE "SettlementAccountApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProviderEventStatus" AS ENUM ('RECEIVED', 'VERIFIED', 'REJECTED', 'PROCESSED', 'FAILED', 'TAMPERED', 'REPLAYED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StatementFileStatus" AS ENUM ('IMPORTED', 'PROCESSING', 'PROCESSED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StatementLineDirection" AS ENUM ('CREDIT', 'DEBIT', 'FEE', 'REVERSAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StatementLineStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'DISPUTED', 'IGNORED', 'CORRECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PaymentTransactionState" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'SETTLED', 'FAILED', 'CANCELLED', 'REFUNDED', 'DISPUTED', 'SUSPENSE');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MatchRule" AS ENUM ('EXACT_PROVIDER_TRANSACTION_ID', 'EXACT_PROVIDER_REFERENCE', 'REFERENCE_AMOUNT_DATE', 'STATEMENT_FINGERPRINT', 'BATCH_DECOMPOSITION', 'FEE_AWARE', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('CANDIDATE', 'AUTO_MATCHED', 'PROPOSED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "SuspenseType" AS ENUM ('UNKNOWN_CREDIT', 'MISSING_CALLBACK', 'MISSING_STATEMENT_LINE', 'AMOUNT_MISMATCH', 'DUPLICATE_PROVIDER_ID', 'ORPHAN_REFUND', 'FEE_DEVIATION', 'SETTLEMENT_SHORTFALL', 'SIGNATURE_FAILURE', 'REPLAY_SPIKE', 'FAILED_BUT_DEBITED', 'SUCCEEDED_BUT_NOT_CREDITED', 'CASH_DEPOSIT_DELAY', 'OTHER');

-- CreateEnum
CREATE TYPE "SuspenseStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_REVIEW', 'POSTED_TO_SUSPENSE', 'RESOLUTION_PROPOSED', 'RESOLVED', 'WRITTEN_OFF', 'REOPENED');

-- CreateEnum
CREATE TYPE "PaymentExceptionType" AS ENUM ('DUPLICATE_PROVIDER_REFERENCE', 'TAMPER_SIGNAL', 'AMOUNT_MISMATCH', 'MISSING_PROVIDER_EVENT', 'MISSING_STATEMENT_LINE', 'MISSING_INTERNAL_PAYMENT', 'FEE_DEVIATION', 'LATE_SETTLEMENT', 'STALE_PENDING_PAYMENT', 'UNMAPPED_PROVIDER_ACCOUNT', 'MANUAL_REVIEW_REQUIRED', 'SIGNATURE_FAILURE', 'REPLAY_SPIKE', 'SUSPENSE_POSTING_BLOCKED', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentExceptionStatus" AS ENUM ('OPEN', 'ASSIGNED', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLUTION_PROPOSED', 'RESOLVED', 'DISMISSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReconciliationRunStatus" AS ENUM ('DRAFT', 'RUNNING', 'NEEDS_REVIEW', 'BLOCKED', 'READY_FOR_SIGNOFF', 'SIGNED', 'FAILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "PaymentReconciliationInboxSource" AS ENUM ('PROVIDER_EVENT', 'STATEMENT_FILE', 'RECONCILIATION_RUN', 'SUSPENSE_POST', 'CERTIFICATE_EXPORT');

-- CreateEnum
CREATE TYPE "PaymentReconciliationInboxStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER', 'IGNORED');

-- CreateTable
CREATE TABLE "payment_rails" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "PaymentRailType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'XAF',
    "adapterKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_rails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentRailId" TEXT NOT NULL,
    "providerCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "ProviderAccountStatus" NOT NULL DEFAULT 'DRAFT',
    "countryCode" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'XAF',
    "externalAccountMasked" TEXT,
    "externalAccountHash" TEXT NOT NULL,
    "externalMerchantIdHash" TEXT,
    "msisdnMasked" TEXT,
    "msisdnHash" TEXT,
    "settlementLagDays" INTEGER NOT NULL DEFAULT 0,
    "statementSource" TEXT,
    "metadata" JSONB,
    "archivedAt" TIMESTAMP(3),
    "legalHoldAt" TIMESTAMP(3),
    "settlementLedgerAccountId" TEXT,
    "suspenseLedgerAccountId" TEXT,
    "feeLedgerAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "ledgerAccountId" TEXT,
    "accountReferenceMasked" TEXT,
    "accountReferenceHash" TEXT,
    "approvalStatus" "SettlementAccountApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlement_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "providerReference" TEXT,
    "eventType" TEXT NOT NULL,
    "status" "ProviderEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "direction" "PaymentDirection",
    "amount" DECIMAL(14,2),
    "feeAmount" DECIMAL(14,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'XAF',
    "occurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "correlationId" TEXT,
    "traceId" TEXT,
    "rawPayload" JSONB NOT NULL,
    "redactedPayload" JSONB,
    "rawPayloadHash" TEXT NOT NULL,
    "headersHash" TEXT,
    "signatureHash" TEXT,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "providerCustomerReferenceMasked" TEXT,
    "providerCustomerReferenceHash" TEXT,
    "archivedAt" TIMESTAMP(3),
    "legalHoldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_files" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "fileName" TEXT,
    "fileHash" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "StatementFileStatus" NOT NULL DEFAULT 'IMPORTED',
    "importedById" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,
    "encryptedObjectKey" TEXT,
    "metadata" JSONB,
    "archivedAt" TIMESTAMP(3),
    "legalHoldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statement_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_lines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "statementFileId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "providerTransactionId" TEXT,
    "providerReference" TEXT,
    "direction" "StatementLineDirection" NOT NULL DEFAULT 'UNKNOWN',
    "status" "StatementLineStatus" NOT NULL DEFAULT 'UNMATCHED',
    "amount" DECIMAL(14,2) NOT NULL,
    "feeAmount" DECIMAL(14,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'XAF',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),
    "description" TEXT,
    "counterpartyMasked" TEXT,
    "counterpartyHash" TEXT,
    "rawLineHash" TEXT,
    "metadata" JSONB,
    "archivedAt" TIMESTAMP(3),
    "legalHoldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legacyPaymentId" TEXT,
    "providerAccountId" TEXT,
    "ledgerPostingBatchId" TEXT,
    "direction" "PaymentDirection" NOT NULL DEFAULT 'INBOUND',
    "state" "PaymentTransactionState" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,2) NOT NULL,
    "feeAmount" DECIMAL(14,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'XAF',
    "providerTransactionId" TEXT,
    "providerReference" TEXT,
    "idempotencyKey" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "payloadHash" TEXT,
    "occurredAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "paymentTransactionId" TEXT,
    "providerEventId" TEXT,
    "statementLineId" TEXT,
    "reconciliationRunId" TEXT,
    "ledgerPostingBatchId" TEXT,
    "rule" "MatchRule" NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'CANDIDATE',
    "confidence" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "amountMatched" DECIMAL(14,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'XAF',
    "matchedById" TEXT,
    "matchedAt" TIMESTAMP(3),
    "correctionOfId" TEXT,
    "correctionReason" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suspense_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "paymentTransactionId" TEXT,
    "reconciliationRunId" TEXT,
    "suspenseLedgerAccountId" TEXT,
    "ledgerPostingBatchId" TEXT,
    "type" "SuspenseType" NOT NULL,
    "status" "SuspenseStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "ExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "direction" "PaymentDirection" NOT NULL DEFAULT 'INBOUND',
    "amount" DECIMAL(14,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'XAF',
    "ownerId" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "evidence" JSONB,
    "resolutionNotes" TEXT,
    "postedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suspense_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_runs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentRailId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accountingPeriodId" TEXT,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ReconciliationRunStatus" NOT NULL DEFAULT 'DRAFT',
    "totalInternalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalExternalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "matchedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "suspenseAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "exceptionCount" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "runById" TEXT,
    "signedById" TEXT,
    "signedAt" TIMESTAMP(3),
    "certificateHash" TEXT,
    "certificatePayload" JSONB,
    "invariantResult" JSONB,
    "correlationId" TEXT,
    "metadata" JSONB,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_exceptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "paymentTransactionId" TEXT,
    "providerEventId" TEXT,
    "statementLineId" TEXT,
    "reconciliationRunId" TEXT,
    "suspenseItemId" TEXT,
    "type" "PaymentExceptionType" NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "PaymentExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "ownerId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "evidence" JSONB,
    "resolutionNotes" TEXT,
    "slaDeadline" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reconciliation_inbox_items" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "source" "PaymentReconciliationInboxSource" NOT NULL,
    "status" "PaymentReconciliationInboxStatus" NOT NULL DEFAULT 'RECEIVED',
    "idempotencyKey" TEXT NOT NULL,
    "externalId" TEXT,
    "payloadHash" TEXT NOT NULL,
    "payloadSummary" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_reconciliation_inbox_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_rails_organizationId_type_isActive_idx" ON "payment_rails"("organizationId", "type", "isActive");

-- CreateIndex
CREATE INDEX "payment_rails_organizationId_currencyCode_countryCode_idx" ON "payment_rails"("organizationId", "currencyCode", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "payment_rails_organizationId_code_key" ON "payment_rails"("organizationId", "code");

-- CreateIndex
CREATE INDEX "provider_accounts_organizationId_status_currencyCode_idx" ON "provider_accounts"("organizationId", "status", "currencyCode");

-- CreateIndex
CREATE INDEX "provider_accounts_paymentRailId_status_idx" ON "provider_accounts"("paymentRailId", "status");

-- CreateIndex
CREATE INDEX "provider_accounts_settlementLedgerAccountId_idx" ON "provider_accounts"("settlementLedgerAccountId");

-- CreateIndex
CREATE INDEX "provider_accounts_suspenseLedgerAccountId_idx" ON "provider_accounts"("suspenseLedgerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_accounts_organizationId_providerCode_key" ON "provider_accounts"("organizationId", "providerCode");

-- CreateIndex
CREATE UNIQUE INDEX "provider_accounts_organizationId_paymentRailId_externalAcco_key" ON "provider_accounts"("organizationId", "paymentRailId", "externalAccountHash");

-- CreateIndex
CREATE INDEX "settlement_accounts_organizationId_providerAccountId_approv_idx" ON "settlement_accounts"("organizationId", "providerAccountId", "approvalStatus");

-- CreateIndex
CREATE INDEX "settlement_accounts_organizationId_ledgerAccountId_idx" ON "settlement_accounts"("organizationId", "ledgerAccountId");

-- CreateIndex
CREATE INDEX "settlement_accounts_accountReferenceHash_idx" ON "settlement_accounts"("accountReferenceHash");

-- CreateIndex
CREATE INDEX "provider_events_organizationId_providerAccountId_status_rec_idx" ON "provider_events"("organizationId", "providerAccountId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "provider_events_organizationId_providerTransactionId_idx" ON "provider_events"("organizationId", "providerTransactionId");

-- CreateIndex
CREATE INDEX "provider_events_organizationId_providerReference_idx" ON "provider_events"("organizationId", "providerReference");

-- CreateIndex
CREATE INDEX "provider_events_correlationId_idx" ON "provider_events"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_events_organizationId_providerAccountId_providerEv_key" ON "provider_events"("organizationId", "providerAccountId", "providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_events_organizationId_providerAccountId_idempotenc_key" ON "provider_events"("organizationId", "providerAccountId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "statement_files_organizationId_providerAccountId_status_per_idx" ON "statement_files"("organizationId", "providerAccountId", "status", "periodStart");

-- CreateIndex
CREATE INDEX "statement_files_importedById_idx" ON "statement_files"("importedById");

-- CreateIndex
CREATE INDEX "statement_files_correlationId_idx" ON "statement_files"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "statement_files_organizationId_providerAccountId_fileHash_key" ON "statement_files"("organizationId", "providerAccountId", "fileHash");

-- CreateIndex
CREATE INDEX "statement_lines_statementFileId_idx" ON "statement_lines"("statementFileId");

-- CreateIndex
CREATE INDEX "statement_lines_organizationId_providerAccountId_status_occ_idx" ON "statement_lines"("organizationId", "providerAccountId", "status", "occurredAt");

-- CreateIndex
CREATE INDEX "statement_lines_organizationId_providerTransactionId_idx" ON "statement_lines"("organizationId", "providerTransactionId");

-- CreateIndex
CREATE INDEX "statement_lines_organizationId_providerReference_idx" ON "statement_lines"("organizationId", "providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "statement_lines_organizationId_providerAccountId_fingerprin_key" ON "statement_lines"("organizationId", "providerAccountId", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_legacyPaymentId_key" ON "payment_transactions"("legacyPaymentId");

-- CreateIndex
CREATE INDEX "payment_transactions_organizationId_state_createdAt_idx" ON "payment_transactions"("organizationId", "state", "createdAt");

-- CreateIndex
CREATE INDEX "payment_transactions_organizationId_providerReference_idx" ON "payment_transactions"("organizationId", "providerReference");

-- CreateIndex
CREATE INDEX "payment_transactions_providerAccountId_state_idx" ON "payment_transactions"("providerAccountId", "state");

-- CreateIndex
CREATE INDEX "payment_transactions_ledgerPostingBatchId_idx" ON "payment_transactions"("ledgerPostingBatchId");

-- CreateIndex
CREATE INDEX "payment_transactions_correlationId_idx" ON "payment_transactions"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_organizationId_idempotencyKey_key" ON "payment_transactions"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_organizationId_providerAccountId_provi_key" ON "payment_transactions"("organizationId", "providerAccountId", "providerTransactionId");

-- CreateIndex
CREATE INDEX "match_records_organizationId_status_createdAt_idx" ON "match_records"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "match_records_organizationId_providerAccountId_status_idx" ON "match_records"("organizationId", "providerAccountId", "status");

-- CreateIndex
CREATE INDEX "match_records_paymentTransactionId_idx" ON "match_records"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "match_records_providerEventId_idx" ON "match_records"("providerEventId");

-- CreateIndex
CREATE INDEX "match_records_statementLineId_idx" ON "match_records"("statementLineId");

-- CreateIndex
CREATE INDEX "match_records_reconciliationRunId_idx" ON "match_records"("reconciliationRunId");

-- CreateIndex
CREATE INDEX "match_records_ledgerPostingBatchId_idx" ON "match_records"("ledgerPostingBatchId");

-- CreateIndex
CREATE INDEX "match_records_matchedById_idx" ON "match_records"("matchedById");

-- CreateIndex
CREATE INDEX "match_records_correlationId_idx" ON "match_records"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "match_records_organizationId_paymentTransactionId_providerE_key" ON "match_records"("organizationId", "paymentTransactionId", "providerEventId", "statementLineId", "rule");

-- CreateIndex
CREATE INDEX "suspense_items_organizationId_status_severity_createdAt_idx" ON "suspense_items"("organizationId", "status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "suspense_items_organizationId_ownerId_status_slaDeadline_idx" ON "suspense_items"("organizationId", "ownerId", "status", "slaDeadline");

-- CreateIndex
CREATE INDEX "suspense_items_organizationId_providerAccountId_status_idx" ON "suspense_items"("organizationId", "providerAccountId", "status");

-- CreateIndex
CREATE INDEX "suspense_items_paymentTransactionId_idx" ON "suspense_items"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "suspense_items_reconciliationRunId_idx" ON "suspense_items"("reconciliationRunId");

-- CreateIndex
CREATE INDEX "suspense_items_suspenseLedgerAccountId_idx" ON "suspense_items"("suspenseLedgerAccountId");

-- CreateIndex
CREATE INDEX "suspense_items_ledgerPostingBatchId_idx" ON "suspense_items"("ledgerPostingBatchId");

-- CreateIndex
CREATE INDEX "suspense_items_correlationId_idx" ON "suspense_items"("correlationId");

-- CreateIndex
CREATE INDEX "reconciliation_runs_organizationId_status_businessDate_idx" ON "reconciliation_runs"("organizationId", "status", "businessDate");

-- CreateIndex
CREATE INDEX "reconciliation_runs_organizationId_providerAccountId_status_idx" ON "reconciliation_runs"("organizationId", "providerAccountId", "status", "periodStart");

-- CreateIndex
CREATE INDEX "reconciliation_runs_paymentRailId_idx" ON "reconciliation_runs"("paymentRailId");

-- CreateIndex
CREATE INDEX "reconciliation_runs_accountingPeriodId_idx" ON "reconciliation_runs"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "reconciliation_runs_runById_idx" ON "reconciliation_runs"("runById");

-- CreateIndex
CREATE INDEX "reconciliation_runs_signedById_idx" ON "reconciliation_runs"("signedById");

-- CreateIndex
CREATE INDEX "reconciliation_runs_correlationId_idx" ON "reconciliation_runs"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_runs_organizationId_providerAccountId_busine_key" ON "reconciliation_runs"("organizationId", "providerAccountId", "businessDate");

-- CreateIndex
CREATE INDEX "payment_exceptions_organizationId_status_severity_createdAt_idx" ON "payment_exceptions"("organizationId", "status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "payment_exceptions_organizationId_ownerId_status_slaDeadlin_idx" ON "payment_exceptions"("organizationId", "ownerId", "status", "slaDeadline");

-- CreateIndex
CREATE INDEX "payment_exceptions_organizationId_providerAccountId_type_st_idx" ON "payment_exceptions"("organizationId", "providerAccountId", "type", "status");

-- CreateIndex
CREATE INDEX "payment_exceptions_paymentTransactionId_idx" ON "payment_exceptions"("paymentTransactionId");

-- CreateIndex
CREATE INDEX "payment_exceptions_providerEventId_idx" ON "payment_exceptions"("providerEventId");

-- CreateIndex
CREATE INDEX "payment_exceptions_statementLineId_idx" ON "payment_exceptions"("statementLineId");

-- CreateIndex
CREATE INDEX "payment_exceptions_reconciliationRunId_idx" ON "payment_exceptions"("reconciliationRunId");

-- CreateIndex
CREATE INDEX "payment_exceptions_suspenseItemId_idx" ON "payment_exceptions"("suspenseItemId");

-- CreateIndex
CREATE INDEX "payment_exceptions_correlationId_idx" ON "payment_exceptions"("correlationId");

-- CreateIndex
CREATE INDEX "payment_reconciliation_inbox_items_organizationId_status_ne_idx" ON "payment_reconciliation_inbox_items"("organizationId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "payment_reconciliation_inbox_items_organizationId_source_ex_idx" ON "payment_reconciliation_inbox_items"("organizationId", "source", "externalId");

-- CreateIndex
CREATE INDEX "payment_reconciliation_inbox_items_providerAccountId_status_idx" ON "payment_reconciliation_inbox_items"("providerAccountId", "status");

-- CreateIndex
CREATE INDEX "payment_reconciliation_inbox_items_correlationId_idx" ON "payment_reconciliation_inbox_items"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_reconciliation_inbox_items_organizationId_source_id_key" ON "payment_reconciliation_inbox_items"("organizationId", "source", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "payment_rails" ADD CONSTRAINT "payment_rails_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_paymentRailId_fkey" FOREIGN KEY ("paymentRailId") REFERENCES "payment_rails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_settlementLedgerAccountId_fkey" FOREIGN KEY ("settlementLedgerAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_suspenseLedgerAccountId_fkey" FOREIGN KEY ("suspenseLedgerAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_feeLedgerAccountId_fkey" FOREIGN KEY ("feeLedgerAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_accounts" ADD CONSTRAINT "settlement_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_accounts" ADD CONSTRAINT "settlement_accounts_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_accounts" ADD CONSTRAINT "settlement_accounts_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_files" ADD CONSTRAINT "statement_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_files" ADD CONSTRAINT "statement_files_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_files" ADD CONSTRAINT "statement_files_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_statementFileId_fkey" FOREIGN KEY ("statementFileId") REFERENCES "statement_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_legacyPaymentId_fkey" FOREIGN KEY ("legacyPaymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_ledgerPostingBatchId_fkey" FOREIGN KEY ("ledgerPostingBatchId") REFERENCES "ledger_posting_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_providerEventId_fkey" FOREIGN KEY ("providerEventId") REFERENCES "provider_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "statement_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "reconciliation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_ledgerPostingBatchId_fkey" FOREIGN KEY ("ledgerPostingBatchId") REFERENCES "ledger_posting_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_records" ADD CONSTRAINT "match_records_matchedById_fkey" FOREIGN KEY ("matchedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspense_items" ADD CONSTRAINT "suspense_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspense_items" ADD CONSTRAINT "suspense_items_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspense_items" ADD CONSTRAINT "suspense_items_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspense_items" ADD CONSTRAINT "suspense_items_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "reconciliation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspense_items" ADD CONSTRAINT "suspense_items_suspenseLedgerAccountId_fkey" FOREIGN KEY ("suspenseLedgerAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspense_items" ADD CONSTRAINT "suspense_items_ledgerPostingBatchId_fkey" FOREIGN KEY ("ledgerPostingBatchId") REFERENCES "ledger_posting_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suspense_items" ADD CONSTRAINT "suspense_items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_paymentRailId_fkey" FOREIGN KEY ("paymentRailId") REFERENCES "payment_rails"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_runById_fkey" FOREIGN KEY ("runById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_runs" ADD CONSTRAINT "reconciliation_runs_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_providerEventId_fkey" FOREIGN KEY ("providerEventId") REFERENCES "provider_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_statementLineId_fkey" FOREIGN KEY ("statementLineId") REFERENCES "statement_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_reconciliationRunId_fkey" FOREIGN KEY ("reconciliationRunId") REFERENCES "reconciliation_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_suspenseItemId_fkey" FOREIGN KEY ("suspenseItemId") REFERENCES "suspense_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_exceptions" ADD CONSTRAINT "payment_exceptions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reconciliation_inbox_items" ADD CONSTRAINT "payment_reconciliation_inbox_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reconciliation_inbox_items" ADD CONSTRAINT "payment_reconciliation_inbox_items_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

