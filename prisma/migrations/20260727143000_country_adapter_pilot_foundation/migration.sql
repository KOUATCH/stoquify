-- CreateEnum
CREATE TYPE "FiscalDocumentType" AS ENUM ('POS_RECEIPT', 'SALES_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE');

-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM ('DRAFT', 'QUEUED', 'SUBMITTED', 'CERTIFIED', 'REJECTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "FiscalSequenceStatus" AS ENUM ('ACTIVE', 'LOCKED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ComplianceSubmissionOperation" AS ENUM ('CERTIFY', 'POLL_STATUS', 'MANUAL_FALLBACK', 'REVERSE');

-- CreateEnum
CREATE TYPE "ComplianceSubmissionStatus" AS ENUM ('PENDING', 'LEASED', 'SUBMITTED', 'RETRY_SCHEDULED', 'CERTIFIED', 'REJECTED', 'FAILED', 'DEAD_LETTER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComplianceAdapterConfigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'REQUIRES_CONFIGURATION', 'REQUIRES_EXPERT_REVIEW');

-- CreateEnum
CREATE TYPE "ComplianceAdapterReviewStatus" AS ENUM ('REQUIRES_EXPERT_REVIEW', 'EXPERT_APPROVED', 'REGULATOR_CONFIRMED');

-- CreateEnum
CREATE TYPE "ComplianceAdapterEnvironment" AS ENUM ('FAKE_SANDBOX', 'SANDBOX', 'PRODUCTION', 'MANUAL_PORTAL');

-- CreateEnum
CREATE TYPE "ComplianceEvidenceType" AS ENUM ('CANONICAL_PAYLOAD', 'SUBMITTED_PAYLOAD', 'AUTHORITY_RESPONSE', 'AUTHORITY_REFERENCE', 'QR_CODE_PAYLOAD', 'MANUAL_PORTAL_PROOF', 'ERROR_REPORT', 'REVERSAL_PROOF');

-- CreateEnum
CREATE TYPE "ComplianceEvidenceSource" AS ENUM ('PLATFORM', 'AUTHORITY', 'MANUAL_PORTAL', 'ADAPTER');

-- CreateTable
CREATE TABLE "fiscal_documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "FiscalDocumentType" NOT NULL,
    "status" "FiscalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "AccountingSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceNumber" TEXT,
    "sourceDate" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3) NOT NULL,
    "postingBatchId" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "accountingSourceLinkId" TEXT,
    "countryCode" TEXT NOT NULL,
    "countryPackVersion" TEXT NOT NULL,
    "countryPackSchemaVersion" TEXT NOT NULL,
    "countryPackResolutionHash" TEXT NOT NULL,
    "countryPackLegalRef" TEXT,
    "countryPackVerificationStatus" TEXT,
    "certificationPolicySnapshot" JSONB,
    "requiredFieldsSnapshot" JSONB,
    "artifactExpectationsSnapshot" JSONB,
    "fiscalYear" TEXT NOT NULL,
    "fiscalPeriodKey" TEXT NOT NULL DEFAULT 'ANNUAL',
    "sequenceScopeKey" TEXT NOT NULL DEFAULT 'GLOBAL',
    "sequenceId" TEXT,
    "provisionalNumber" TEXT,
    "legalNumber" TEXT,
    "legalNumberAssignedAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxBreakdown" JSONB,
    "canonicalPayload" JSONB NOT NULL,
    "canonicalPayloadHash" TEXT NOT NULL,
    "sourcePayloadHash" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "authorityChannel" TEXT,
    "authorityReference" TEXT,
    "certificationArtifactHash" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "certifiedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "originalFiscalDocumentId" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_document_lines" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fiscalDocumentId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "sourceLineId" TEXT,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRateBps" INTEGER,
    "taxCode" TEXT,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineSubtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "linePayload" JSONB,
    "lineHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_document_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_sequences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "documentType" "FiscalDocumentType" NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "fiscalPeriodKey" TEXT NOT NULL DEFAULT 'ANNUAL',
    "scopeKey" TEXT NOT NULL DEFAULT 'GLOBAL',
    "prefix" TEXT,
    "status" "FiscalSequenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "lastIssuedNumber" INTEGER NOT NULL DEFAULT 0,
    "lastIssuedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_submissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fiscalDocumentId" TEXT NOT NULL,
    "adapterConfigId" TEXT,
    "operation" "ComplianceSubmissionOperation" NOT NULL DEFAULT 'CERTIFY',
    "status" "ComplianceSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "authorityChannel" TEXT NOT NULL,
    "adapterKey" TEXT,
    "environment" "ComplianceAdapterEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "requestHash" TEXT,
    "responseHash" TEXT,
    "correlationId" TEXT,
    "authorityReference" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "rejectionReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leasedAt" TIMESTAMP(3),
    "leasedUntil" TIMESTAMP(3),
    "leasedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "requestSummary" JSONB,
    "responseSummary" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_adapter_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "authorityChannel" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "environment" "ComplianceAdapterEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "status" "ComplianceAdapterConfigStatus" NOT NULL DEFAULT 'REQUIRES_EXPERT_REVIEW',
    "countryPackVersion" TEXT NOT NULL,
    "countryPackResolutionHash" TEXT NOT NULL,
    "capabilityStatus" TEXT NOT NULL,
    "credentialReference" TEXT,
    "credentialExpiresAt" TIMESTAMP(3),
    "credentialRotatedAt" TIMESTAMP(3),
    "credentialRotatedById" TEXT,
    "officialSpecTitle" TEXT,
    "officialSpecVersion" TEXT,
    "officialSpecPublishedAt" TIMESTAMP(3),
    "officialSpecEffectiveFrom" TIMESTAMP(3),
    "officialSpecReference" TEXT,
    "officialSpecHash" TEXT,
    "reviewStatus" "ComplianceAdapterReviewStatus" NOT NULL DEFAULT 'REQUIRES_EXPERT_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewerQualification" TEXT,
    "reviewerConflictDeclared" BOOLEAN,
    "reviewEvidenceHash" TEXT,
    "publicMetadata" JSONB,
    "configHash" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_adapter_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_evidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fiscalDocumentId" TEXT,
    "submissionId" TEXT,
    "evidenceType" "ComplianceEvidenceType" NOT NULL,
    "source" "ComplianceEvidenceSource" NOT NULL,
    "artifactHash" TEXT NOT NULL,
    "hashAlgorithm" TEXT NOT NULL DEFAULT 'sha256',
    "storageUri" TEXT,
    "authorityReference" TEXT,
    "legalRef" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedById" TEXT,
    "payload" JSONB,
    "redactedPayload" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiscal_documents_organizationId_status_issueDate_idx" ON "fiscal_documents"("organizationId", "status", "issueDate");

-- CreateIndex
CREATE INDEX "fiscal_documents_organizationId_countryCode_documentType_fi_idx" ON "fiscal_documents"("organizationId", "countryCode", "documentType", "fiscalYear");

-- CreateIndex
CREATE INDEX "fiscal_documents_organizationId_sourceType_sourceId_idx" ON "fiscal_documents"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "fiscal_documents_postingBatchId_idx" ON "fiscal_documents"("postingBatchId");

-- CreateIndex
CREATE INDEX "fiscal_documents_journalEntryId_idx" ON "fiscal_documents"("journalEntryId");

-- CreateIndex
CREATE INDEX "fiscal_documents_accountingSourceLinkId_idx" ON "fiscal_documents"("accountingSourceLinkId");

-- CreateIndex
CREATE INDEX "fiscal_documents_sequenceId_idx" ON "fiscal_documents"("sequenceId");

-- CreateIndex
CREATE INDEX "fiscal_documents_authorityReference_idx" ON "fiscal_documents"("authorityReference");

-- CreateIndex
CREATE INDEX "fiscal_documents_originalFiscalDocumentId_idx" ON "fiscal_documents"("originalFiscalDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_documents_organizationId_sourceType_sourceId_documen_key" ON "fiscal_documents"("organizationId", "sourceType", "sourceId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_documents_organizationId_idempotencyKey_key" ON "fiscal_documents"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_documents_organizationId_countryCode_documentType_fi_key" ON "fiscal_documents"("organizationId", "countryCode", "documentType", "fiscalYear", "fiscalPeriodKey", "sequenceScopeKey", "legalNumber");

-- CreateIndex
CREATE INDEX "fiscal_document_lines_organizationId_fiscalDocumentId_idx" ON "fiscal_document_lines"("organizationId", "fiscalDocumentId");

-- CreateIndex
CREATE INDEX "fiscal_document_lines_organizationId_itemId_idx" ON "fiscal_document_lines"("organizationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_document_lines_fiscalDocumentId_lineNumber_key" ON "fiscal_document_lines"("fiscalDocumentId", "lineNumber");

-- CreateIndex
CREATE INDEX "fiscal_sequences_organizationId_status_countryCode_idx" ON "fiscal_sequences"("organizationId", "status", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_sequences_organizationId_countryCode_documentType_fi_key" ON "fiscal_sequences"("organizationId", "countryCode", "documentType", "fiscalYear", "fiscalPeriodKey", "scopeKey");

-- CreateIndex
CREATE INDEX "compliance_submissions_organizationId_status_nextAttemptAt_idx" ON "compliance_submissions"("organizationId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "compliance_submissions_organizationId_authorityChannel_stat_idx" ON "compliance_submissions"("organizationId", "authorityChannel", "status");

-- CreateIndex
CREATE INDEX "compliance_submissions_fiscalDocumentId_idx" ON "compliance_submissions"("fiscalDocumentId");

-- CreateIndex
CREATE INDEX "compliance_submissions_adapterConfigId_idx" ON "compliance_submissions"("adapterConfigId");

-- CreateIndex
CREATE INDEX "compliance_submissions_correlationId_idx" ON "compliance_submissions"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_submissions_organizationId_authorityChannel_oper_key" ON "compliance_submissions"("organizationId", "authorityChannel", "operation", "idempotencyKey");

-- CreateIndex
CREATE INDEX "compliance_adapter_configs_organizationId_status_countryCod_idx" ON "compliance_adapter_configs"("organizationId", "status", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_adapter_configs_organizationId_countryCode_autho_key" ON "compliance_adapter_configs"("organizationId", "countryCode", "authorityChannel", "environment");

-- CreateIndex
CREATE INDEX "compliance_evidence_organizationId_fiscalDocumentId_idx" ON "compliance_evidence"("organizationId", "fiscalDocumentId");

-- CreateIndex
CREATE INDEX "compliance_evidence_organizationId_submissionId_idx" ON "compliance_evidence"("organizationId", "submissionId");

-- CreateIndex
CREATE INDEX "compliance_evidence_authorityReference_idx" ON "compliance_evidence"("authorityReference");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_evidence_organizationId_evidenceType_artifactHas_key" ON "compliance_evidence"("organizationId", "evidenceType", "artifactHash");

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_postingBatchId_fkey" FOREIGN KEY ("postingBatchId") REFERENCES "ledger_posting_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_accountingSourceLinkId_fkey" FOREIGN KEY ("accountingSourceLinkId") REFERENCES "accounting_source_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "fiscal_sequences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_originalFiscalDocumentId_fkey" FOREIGN KEY ("originalFiscalDocumentId") REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_document_lines" ADD CONSTRAINT "fiscal_document_lines_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_document_lines" ADD CONSTRAINT "fiscal_document_lines_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_sequences" ADD CONSTRAINT "fiscal_sequences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_submissions" ADD CONSTRAINT "compliance_submissions_adapterConfigId_fkey" FOREIGN KEY ("adapterConfigId") REFERENCES "compliance_adapter_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_adapter_configs" ADD CONSTRAINT "compliance_adapter_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "fiscal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_evidence" ADD CONSTRAINT "compliance_evidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "compliance_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
