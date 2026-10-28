CREATE TYPE "CloseRunStatus" AS ENUM ('DRAFT', 'RUNNING', 'READY', 'BLOCKED', 'CERTIFIED', 'EXPORTED', 'VOIDED');

CREATE TYPE "CloseChecklistStatus" AS ENUM ('PASSED', 'FAILED', 'WARNING', 'NOT_APPLICABLE', 'UNAVAILABLE');

CREATE TYPE "CloseFindingSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "CloseFindingStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_REVIEW', 'RESOLVED', 'WAIVED_WITH_APPROVAL', 'REOPENED');

CREATE TYPE "CloseFindingDomain" AS ENUM (
  'LEDGER',
  'PAYMENT_RECONCILIATION',
  'SUSPENSE',
  'CASH_DRAWER',
  'INVENTORY_VALUATION',
  'AR',
  'AP',
  'TAX',
  'PAYROLL',
  'MASTER_DATA',
  'SECURITY_CONTROL',
  'DATA_TRUST',
  'AUDIT'
);

CREATE TYPE "CloseEvidenceType" AS ENUM (
  'JOURNAL_ENTRY',
  'POSTING_BATCH',
  'SOURCE_LINK',
  'FISCAL_DOCUMENT',
  'PROVIDER_EVENT',
  'STATEMENT_LINE',
  'RECONCILIATION_CERTIFICATE',
  'SUSPENSE_ITEM',
  'PAYMENT_EXCEPTION',
  'AUDIT_LOG',
  'REPORT_EXPORT',
  'DATA_TRUST_CERTIFICATE'
);

CREATE TYPE "AccountantReviewStatus" AS ENUM (
  'OPEN',
  'CHANGES_REQUESTED',
  'READY_TO_CLOSE',
  'APPROVED_FOR_CLOSE',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "close_runs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "status" "CloseRunStatus" NOT NULL DEFAULT 'DRAFT',
  "readinessScore" INTEGER NOT NULL DEFAULT 0,
  "criticalBlockerCount" INTEGER NOT NULL DEFAULT 0,
  "highBlockerCount" INTEGER NOT NULL DEFAULT 0,
  "evidenceCoveragePct" DECIMAL(5,2),
  "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "runById" TEXT,
  "correlationId" TEXT,
  "summary" JSONB,
  "provenance" JSONB,
  "metadata" JSONB,
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "close_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "close_runs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_runs_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "close_checklist_items" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "closeRunId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "domain" "CloseFindingDomain" NOT NULL,
  "status" "CloseChecklistStatus" NOT NULL,
  "severity" "CloseFindingSeverity" NOT NULL DEFAULT 'INFO',
  "label" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "sourceService" TEXT NOT NULL,
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "blockerReason" TEXT,
  "nextActionHref" TEXT,
  "ownerId" TEXT,
  "dueAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "close_checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "close_checklist_items_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_checklist_items_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_checklist_items_closeRunId_fkey"
    FOREIGN KEY ("closeRunId") REFERENCES "close_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "close_assurance_findings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "closeRunId" TEXT NOT NULL,
  "checklistItemId" TEXT,
  "domain" "CloseFindingDomain" NOT NULL,
  "severity" "CloseFindingSeverity" NOT NULL,
  "status" "CloseFindingStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "sourceService" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "ownerId" TEXT,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "waiverRequestedById" TEXT,
  "waiverRequestedAt" TIMESTAMP(3),
  "waiverReason" TEXT,
  "waiverApprovedById" TEXT,
  "waiverApprovedAt" TIMESTAMP(3),
  "correlationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "close_assurance_findings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "close_assurance_findings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_assurance_findings_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_assurance_findings_closeRunId_fkey"
    FOREIGN KEY ("closeRunId") REFERENCES "close_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_assurance_findings_checklistItemId_fkey"
    FOREIGN KEY ("checklistItemId") REFERENCES "close_checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "close_evidence_items" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "closeRunId" TEXT NOT NULL,
  "checklistItemId" TEXT,
  "findingId" TEXT,
  "evidenceType" "CloseEvidenceType" NOT NULL,
  "sourceTable" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "sourceLabel" TEXT NOT NULL,
  "sourceDate" TIMESTAMP(3),
  "sourceHash" TEXT,
  "provenance" TEXT NOT NULL DEFAULT 'POSTED',
  "available" BOOLEAN NOT NULL DEFAULT true,
  "unavailableReason" TEXT,
  "metadata" JSONB,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "close_evidence_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "close_evidence_items_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_evidence_items_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_evidence_items_closeRunId_fkey"
    FOREIGN KEY ("closeRunId") REFERENCES "close_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_evidence_items_checklistItemId_fkey"
    FOREIGN KEY ("checklistItemId") REFERENCES "close_checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "close_evidence_items_findingId_fkey"
    FOREIGN KEY ("findingId") REFERENCES "close_assurance_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "close_pack_exports" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "closeRunId" TEXT NOT NULL,
  "fileType" TEXT NOT NULL DEFAULT 'json',
  "watermarkId" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "isCertified" BOOLEAN NOT NULL DEFAULT false,
  "exportedById" TEXT,
  "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "correlationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "close_pack_exports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "close_pack_exports_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_pack_exports_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "close_pack_exports_closeRunId_fkey"
    FOREIGN KEY ("closeRunId") REFERENCES "close_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "accountant_reviews" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "closeRunId" TEXT NOT NULL,
  "status" "AccountantReviewStatus" NOT NULL DEFAULT 'OPEN',
  "reviewerId" TEXT,
  "openedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "decisionNotes" TEXT,
  "correlationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "accountant_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accountant_reviews_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "accountant_reviews_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "accountant_reviews_closeRunId_fkey"
    FOREIGN KEY ("closeRunId") REFERENCES "close_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "accountant_comments" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "closeRunId" TEXT NOT NULL,
  "findingId" TEXT,
  "evidenceItemId" TEXT,
  "reviewId" TEXT,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "visibility" TEXT NOT NULL DEFAULT 'INTERNAL_AND_ACCOUNTANT',
  "correlationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "accountant_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accountant_comments_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "accountant_comments_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "accountant_comments_closeRunId_fkey"
    FOREIGN KEY ("closeRunId") REFERENCES "close_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "accountant_comments_findingId_fkey"
    FOREIGN KEY ("findingId") REFERENCES "close_assurance_findings"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "accountant_comments_evidenceItemId_fkey"
    FOREIGN KEY ("evidenceItemId") REFERENCES "close_evidence_items"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "accountant_comments_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "accountant_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "close_runs_organizationId_periodId_status_createdAt_idx"
  ON "close_runs"("organizationId", "periodId", "status", "createdAt");

CREATE INDEX "close_runs_organizationId_status_asOf_idx"
  ON "close_runs"("organizationId", "status", "asOf");

CREATE INDEX "close_runs_periodId_idx"
  ON "close_runs"("periodId");

CREATE INDEX "close_runs_runById_idx"
  ON "close_runs"("runById");

CREATE INDEX "close_runs_correlationId_idx"
  ON "close_runs"("correlationId");

CREATE UNIQUE INDEX "close_checklist_items_closeRunId_key_key"
  ON "close_checklist_items"("closeRunId", "key");

CREATE INDEX "close_checklist_items_organizationId_periodId_status_idx"
  ON "close_checklist_items"("organizationId", "periodId", "status");

CREATE INDEX "close_checklist_items_organizationId_domain_status_idx"
  ON "close_checklist_items"("organizationId", "domain", "status");

CREATE INDEX "close_checklist_items_organizationId_ownerId_status_dueAt_idx"
  ON "close_checklist_items"("organizationId", "ownerId", "status", "dueAt");

CREATE INDEX "close_assurance_findings_organizationId_periodId_status_severity_idx"
  ON "close_assurance_findings"("organizationId", "periodId", "status", "severity");

CREATE INDEX "close_assurance_findings_organizationId_ownerId_status_dueAt_idx"
  ON "close_assurance_findings"("organizationId", "ownerId", "status", "dueAt");

CREATE INDEX "close_assurance_findings_organizationId_domain_severity_idx"
  ON "close_assurance_findings"("organizationId", "domain", "severity");

CREATE INDEX "close_assurance_findings_closeRunId_idx"
  ON "close_assurance_findings"("closeRunId");

CREATE INDEX "close_assurance_findings_checklistItemId_idx"
  ON "close_assurance_findings"("checklistItemId");

CREATE INDEX "close_assurance_findings_correlationId_idx"
  ON "close_assurance_findings"("correlationId");

CREATE INDEX "close_evidence_items_organizationId_periodId_evidenceType_idx"
  ON "close_evidence_items"("organizationId", "periodId", "evidenceType");

CREATE INDEX "close_evidence_items_organizationId_sourceType_sourceId_idx"
  ON "close_evidence_items"("organizationId", "sourceType", "sourceId");

CREATE INDEX "close_evidence_items_closeRunId_idx"
  ON "close_evidence_items"("closeRunId");

CREATE INDEX "close_evidence_items_checklistItemId_idx"
  ON "close_evidence_items"("checklistItemId");

CREATE INDEX "close_evidence_items_findingId_idx"
  ON "close_evidence_items"("findingId");

CREATE INDEX "close_evidence_items_correlationId_idx"
  ON "close_evidence_items"("correlationId");

CREATE UNIQUE INDEX "close_pack_exports_organizationId_closeRunId_contentHash_key"
  ON "close_pack_exports"("organizationId", "closeRunId", "contentHash");

CREATE INDEX "close_pack_exports_organizationId_periodId_exportedAt_idx"
  ON "close_pack_exports"("organizationId", "periodId", "exportedAt");

CREATE INDEX "close_pack_exports_organizationId_watermarkId_idx"
  ON "close_pack_exports"("organizationId", "watermarkId");

CREATE INDEX "close_pack_exports_correlationId_idx"
  ON "close_pack_exports"("correlationId");

CREATE INDEX "accountant_reviews_organizationId_periodId_status_idx"
  ON "accountant_reviews"("organizationId", "periodId", "status");

CREATE INDEX "accountant_reviews_organizationId_reviewerId_status_idx"
  ON "accountant_reviews"("organizationId", "reviewerId", "status");

CREATE INDEX "accountant_reviews_closeRunId_idx"
  ON "accountant_reviews"("closeRunId");

CREATE INDEX "accountant_reviews_correlationId_idx"
  ON "accountant_reviews"("correlationId");

CREATE INDEX "accountant_comments_organizationId_periodId_createdAt_idx"
  ON "accountant_comments"("organizationId", "periodId", "createdAt");

CREATE INDEX "accountant_comments_closeRunId_idx"
  ON "accountant_comments"("closeRunId");

CREATE INDEX "accountant_comments_findingId_idx"
  ON "accountant_comments"("findingId");

CREATE INDEX "accountant_comments_evidenceItemId_idx"
  ON "accountant_comments"("evidenceItemId");

CREATE INDEX "accountant_comments_reviewId_idx"
  ON "accountant_comments"("reviewId");

CREATE INDEX "accountant_comments_authorId_idx"
  ON "accountant_comments"("authorId");

CREATE INDEX "accountant_comments_correlationId_idx"
  ON "accountant_comments"("correlationId");
