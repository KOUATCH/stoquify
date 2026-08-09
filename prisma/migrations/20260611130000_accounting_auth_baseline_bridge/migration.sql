-- Baseline-only bridge reconstructed from the schema at commit
-- 90a67f57ecae252d1f0424f0e43102be45eb9b46. Existing databases that already
-- contain application data or the accounting/auth target schema must adopt this
-- migration with `prisma migrate resolve --applied`; they must never execute it.
BEGIN;

DO $baseline_guard$
BEGIN
  IF to_regclass('public.ledger_posting_batches') IS NOT NULL
    OR to_regclass('public.verifications') IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'accounts'
        AND column_name = 'accountId'
    )
    OR EXISTS (SELECT 1 FROM "organizations" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "users" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "accounts" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "sessions" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "auth_sessions" LIMIT 1)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Baseline bridge refused: use prisma migrate resolve --applied after schema and data verification on an existing database.';
  END IF;
END
$baseline_guard$;

-- CreateEnum
CREATE TYPE "AccountingSetupStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY', 'LOCKED');

-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChartAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_ASSET', 'CONTRA_REVENUE', 'MEMO');

-- CreateEnum
CREATE TYPE "ChartAccountNormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "JournalType" AS ENUM ('GENERAL', 'SALES', 'PURCHASE', 'CASH', 'BANK', 'INVENTORY', 'PAYROLL', 'ADJUSTMENT', 'OPENING', 'CLOSING');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'VOIDED');

-- CreateEnum
CREATE TYPE "LedgerPostingBatchStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PostingRuleLineSide" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "PostingRuleAmountSource" AS ENUM ('FIXED', 'SOURCE_AMOUNT', 'NET_AMOUNT', 'GROSS_AMOUNT', 'TAX_AMOUNT', 'COST_AMOUNT', 'QUANTITY_COST', 'VARIANCE_AMOUNT');

-- CreateEnum
CREATE TYPE "AccountingSourceType" AS ENUM ('MANUAL', 'POS_SALE', 'POS_PAYMENT', 'POS_REFUND', 'POS_VOID', 'CASH_DRAWER_CLOSE', 'GOODS_RECEIPT', 'SUPPLIER_INVOICE', 'SUPPLIER_PAYMENT', 'CUSTOMER_SETTLEMENT', 'EXPENSE', 'STOCK_ADJUSTMENT', 'STOCK_TRANSFER', 'PAYROLL_RUN', 'PAYROLL_PAYMENT', 'PRODUCTION_BATCH', 'OPENING_BALANCE', 'IMPORT');

-- CreateEnum
CREATE TYPE "AccountingPostingPurpose" AS ENUM ('MANUAL_JOURNAL', 'SALE_COMPLETION', 'PAYMENT_RECEIPT', 'REFUND', 'VOID', 'CASH_DRAWER_CLOSE', 'GOODS_RECEIPT', 'SUPPLIER_INVOICE', 'SUPPLIER_PAYMENT', 'CUSTOMER_SETTLEMENT', 'EXPENSE_APPROVAL', 'INVENTORY_ADJUSTMENT', 'STOCK_TRANSFER', 'PAYROLL_RUN', 'PAYROLL_PAYMENT', 'PRODUCTION_BATCH', 'OPENING_BALANCE', 'ADJUSTMENT', 'REVERSAL');

-- DropForeignKey
ALTER TABLE "auth_sessions" DROP CONSTRAINT "auth_sessions_userId_fkey";

-- DropIndex
DROP INDEX "accounts_provider_providerAccountId_key";

-- DropIndex
DROP INDEX "sessions_expires_idx";

-- DropIndex
DROP INDEX "sessions_sessionToken_key";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "access_token",
DROP COLUMN "expires_at",
DROP COLUMN "id_token",
DROP COLUMN "provider",
DROP COLUMN "providerAccountId",
DROP COLUMN "refresh_token",
DROP COLUMN "session_state",
DROP COLUMN "token_type",
DROP COLUMN "type",
ADD COLUMN     "accessToken" TEXT,
ADD COLUMN     "accessTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "idToken" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "providerId" TEXT NOT NULL,
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "refreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "expires",
DROP COLUMN "sessionToken",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "token" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" TEXT,
DROP COLUMN "emailVerified",
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "auth_sessions";

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_accounting_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "setupStatus" "AccountingSetupStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "countryPack" TEXT,
    "baseCurrency" TEXT NOT NULL DEFAULT 'XAF',
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "fiscalYearStartDay" INTEGER NOT NULL DEFAULT 1,
    "inventoryValuationPolicy" TEXT NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "roundingMode" TEXT NOT NULL DEFAULT 'HALF_UP',
    "roundingScale" INTEGER NOT NULL DEFAULT 2,
    "taxRegime" TEXT,
    "setupCompletedAt" TIMESTAMP(3),
    "setupCompletedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_accounting_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_periods" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "periodNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "lockedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT,
    "descriptionEn" TEXT,
    "descriptionFr" TEXT,
    "type" "ChartAccountType" NOT NULL,
    "normalBalance" "ChartAccountNormalBalance" NOT NULL,
    "parentId" TEXT,
    "isControlAccount" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowManualPost" BOOLEAN NOT NULL DEFAULT true,
    "mappingKey" TEXT,
    "syscohadaClass" TEXT,
    "syscohadaReference" TEXT,
    "currency" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT,
    "type" "JournalType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowManualEntries" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "postingBatchId" TEXT,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "memo" TEXT,
    "reference" TEXT,
    "sourceType" "AccountingSourceType",
    "sourceId" TEXT,
    "postingPurpose" "AccountingPostingPurpose",
    "reversalOfEntryId" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "baseDebit" DECIMAL(18,2),
    "baseCredit" DECIMAL(18,2),
    "locationId" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "itemId" TEXT,
    "dimensions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_posting_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodId" TEXT,
    "sourceType" "AccountingSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "postingPurpose" "AccountingPostingPurpose" NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "sourceVersion" INTEGER,
    "status" "LedgerPostingBatchStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "postedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_posting_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_source_links" (
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

-- CreateTable
CREATE TABLE "posting_rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT,
    "descriptionEn" TEXT,
    "descriptionFr" TEXT,
    "sourceType" "AccountingSourceType" NOT NULL,
    "postingPurpose" "AccountingPostingPurpose" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posting_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posting_rule_lines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "postingRuleId" TEXT NOT NULL,
    "accountId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "side" "PostingRuleLineSide" NOT NULL,
    "mappingKey" TEXT,
    "amountSource" "PostingRuleAmountSource" NOT NULL,
    "multiplier" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "condition" JSONB,
    "description" TEXT,
    "dimensions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posting_rule_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "postingBatchId" TEXT,
    "journalEntryId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_accounting_settings_organizationId_key" ON "organization_accounting_settings"("organizationId");

-- CreateIndex
CREATE INDEX "organization_accounting_settings_organizationId_accountingE_idx" ON "organization_accounting_settings"("organizationId", "accountingEnabled");

-- CreateIndex
CREATE INDEX "organization_accounting_settings_setupStatus_idx" ON "organization_accounting_settings"("setupStatus");

-- CreateIndex
CREATE INDEX "fiscal_years_organizationId_status_startDate_idx" ON "fiscal_years"("organizationId", "status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_organizationId_name_key" ON "fiscal_years"("organizationId", "name");

-- CreateIndex
CREATE INDEX "accounting_periods_organizationId_status_startDate_idx" ON "accounting_periods"("organizationId", "status", "startDate");

-- CreateIndex
CREATE INDEX "accounting_periods_fiscalYearId_idx" ON "accounting_periods"("fiscalYearId");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_periods_organizationId_fiscalYearId_periodNumber_key" ON "accounting_periods"("organizationId", "fiscalYearId", "periodNumber");

-- CreateIndex
CREATE INDEX "chart_of_accounts_organizationId_type_isActive_idx" ON "chart_of_accounts"("organizationId", "type", "isActive");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parentId_idx" ON "chart_of_accounts"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_organizationId_code_key" ON "chart_of_accounts"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_organizationId_mappingKey_key" ON "chart_of_accounts"("organizationId", "mappingKey");

-- CreateIndex
CREATE INDEX "journals_organizationId_type_isActive_idx" ON "journals"("organizationId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "journals_organizationId_code_key" ON "journals"("organizationId", "code");

-- CreateIndex
CREATE INDEX "journal_entries_organizationId_status_entryDate_idx" ON "journal_entries"("organizationId", "status", "entryDate");

-- CreateIndex
CREATE INDEX "journal_entries_journalId_entryDate_idx" ON "journal_entries"("journalId", "entryDate");

-- CreateIndex
CREATE INDEX "journal_entries_periodId_status_idx" ON "journal_entries"("periodId", "status");

-- CreateIndex
CREATE INDEX "journal_entries_postingBatchId_idx" ON "journal_entries"("postingBatchId");

-- CreateIndex
CREATE INDEX "journal_entries_sourceType_sourceId_idx" ON "journal_entries"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_organizationId_entryNumber_key" ON "journal_entries"("organizationId", "entryNumber");

-- CreateIndex
CREATE INDEX "journal_entry_lines_organizationId_accountId_idx" ON "journal_entry_lines"("organizationId", "accountId");

-- CreateIndex
CREATE INDEX "journal_entry_lines_organizationId_currency_idx" ON "journal_entry_lines"("organizationId", "currency");

-- CreateIndex
CREATE INDEX "journal_entry_lines_accountId_createdAt_idx" ON "journal_entry_lines"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_lines_journalEntryId_lineNumber_key" ON "journal_entry_lines"("journalEntryId", "lineNumber");

-- CreateIndex
CREATE INDEX "ledger_posting_batches_organizationId_status_createdAt_idx" ON "ledger_posting_batches"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ledger_posting_batches_periodId_idx" ON "ledger_posting_batches"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_posting_batches_organizationId_sourceType_sourceId_p_key" ON "ledger_posting_batches"("organizationId", "sourceType", "sourceId", "postingPurpose");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_posting_batches_organizationId_idempotencyKey_key" ON "ledger_posting_batches"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "accounting_source_links_organizationId_sourceType_sourceId_idx" ON "accounting_source_links"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "accounting_source_links_postingBatchId_idx" ON "accounting_source_links"("postingBatchId");

-- CreateIndex
CREATE INDEX "accounting_source_links_journalEntryId_idx" ON "accounting_source_links"("journalEntryId");

-- CreateIndex
CREATE INDEX "posting_rules_organizationId_sourceType_postingPurpose_isAc_idx" ON "posting_rules"("organizationId", "sourceType", "postingPurpose", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "posting_rules_organizationId_code_key" ON "posting_rules"("organizationId", "code");

-- CreateIndex
CREATE INDEX "posting_rule_lines_organizationId_mappingKey_idx" ON "posting_rule_lines"("organizationId", "mappingKey");

-- CreateIndex
CREATE INDEX "posting_rule_lines_accountId_idx" ON "posting_rule_lines"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "posting_rule_lines_postingRuleId_lineNumber_key" ON "posting_rule_lines"("postingRuleId", "lineNumber");

-- CreateIndex
CREATE INDEX "ledger_audit_events_organizationId_createdAt_idx" ON "ledger_audit_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ledger_audit_events_postingBatchId_idx" ON "ledger_audit_events"("postingBatchId");

-- CreateIndex
CREATE INDEX "ledger_audit_events_journalEntryId_idx" ON "ledger_audit_events"("journalEntryId");

-- CreateIndex
CREATE INDEX "ledger_audit_events_resourceType_resourceId_idx" ON "ledger_audit_events"("resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "organization_accounting_settings" ADD CONSTRAINT "organization_accounting_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_fiscalYearId_fkey" FOREIGN KEY ("fiscalYearId") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journals" ADD CONSTRAINT "journals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES "ledger_posting_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversalOfEntryId_fkey" FOREIGN KEY ("reversalOfEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_posting_batches" ADD CONSTRAINT "ledger_posting_batches_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_posting_batches" ADD CONSTRAINT "ledger_posting_batches_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_source_links" ADD CONSTRAINT "accounting_source_links_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_source_links" ADD CONSTRAINT "accounting_source_links_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES "ledger_posting_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_source_links" ADD CONSTRAINT "accounting_source_links_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_rules" ADD CONSTRAINT "posting_rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_rule_lines" ADD CONSTRAINT "posting_rule_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_rule_lines" ADD CONSTRAINT "posting_rule_lines_postingRuleId_fkey" FOREIGN KEY ("postingRuleId") REFERENCES "posting_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posting_rule_lines" ADD CONSTRAINT "posting_rule_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_audit_events" ADD CONSTRAINT "ledger_audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_audit_events" ADD CONSTRAINT "ledger_audit_events_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES "ledger_posting_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_audit_events" ADD CONSTRAINT "ledger_audit_events_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
