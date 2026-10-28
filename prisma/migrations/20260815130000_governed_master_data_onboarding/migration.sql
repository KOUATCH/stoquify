-- First governed onboarding vertical slice.
-- Adds control-plane and staging records only; no balances, stock, ledgers, or resets.

CREATE TYPE "OnboardingImportTarget" AS ENUM ('CUSTOMER', 'SUPPLIER', 'ITEM');
CREATE TYPE "OnboardingImportStatus" AS ENUM ('UPLOADED', 'VALIDATED', 'BLOCKED', 'APPROVED', 'COMMITTING', 'COMMITTED');
CREATE TYPE "OnboardingImportIssueSeverity" AS ENUM ('ERROR', 'WARNING');
CREATE TYPE "OnboardingReadinessState" AS ENUM ('NOT_STARTED', 'IMPORTED', 'RECONCILED', 'BLOCKED', 'WAIVED');

CREATE TABLE "onboarding_import_mappings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "target" "OnboardingImportTarget" NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT '1',
    "fieldMap" JSONB NOT NULL,
    "requiredFields" TEXT[] NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_import_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_import_batches" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "target" "OnboardingImportTarget" NOT NULL,
    "status" "OnboardingImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "sourceFilename" TEXT NOT NULL,
    "sourceMimeType" TEXT NOT NULL,
    "sourceByteSize" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "mappingId" TEXT NOT NULL,
    "mappingVersion" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "sourceRecordCount" INTEGER NOT NULL DEFAULT 0,
    "validRecordCount" INTEGER NOT NULL DEFAULT 0,
    "errorRecordCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateRecordCount" INTEGER NOT NULL DEFAULT 0,
    "sourceRequiredFieldTotals" JSONB NOT NULL,
    "preCommitRecordCount" INTEGER,
    "postCommitRecordCount" INTEGER,
    "destinationRequiredTotals" JSONB,
    "committedRecordCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalDigest" TEXT,
    "commitStartedAt" TIMESTAMP(3),
    "committedAt" TIMESTAMP(3),
    "replayCount" INTEGER NOT NULL DEFAULT 0,
    "lastReplayedAt" TIMESTAMP(3),
    "evidenceManifest" JSONB,
    "evidenceHash" TEXT,
    "lastSafeErrorCode" TEXT,
    "retentionExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "onboarding_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_import_rows" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "sourceRowHash" TEXT NOT NULL,
    "businessKey" TEXT,
    "normalizedData" JSONB NOT NULL,
    "valid" BOOLEAN NOT NULL DEFAULT false,
    "commitAttemptedAt" TIMESTAMP(3),
    "committedRecordId" TEXT,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "onboarding_import_rows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_import_issues" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowId" TEXT,
    "rowNumber" INTEGER NOT NULL,
    "field" TEXT,
    "severity" "OnboardingImportIssueSeverity" NOT NULL DEFAULT 'ERROR',
    "code" TEXT NOT NULL,
    "safeMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_import_issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "onboarding_readiness_milestones" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "target" "OnboardingImportTarget" NOT NULL,
    "state" "OnboardingReadinessState" NOT NULL DEFAULT 'NOT_STARTED',
    "evidenceBatchId" TEXT,
    "sourceRecordCount" INTEGER NOT NULL DEFAULT 0,
    "committedCount" INTEGER NOT NULL DEFAULT 0,
    "blockerCount" INTEGER NOT NULL DEFAULT 0,
    "waivedById" TEXT,
    "waivedAt" TIMESTAMP(3),
    "waiverReason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_readiness_milestones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_import_mappings_org_target_version_key" ON "onboarding_import_mappings"("organizationId", "target", "version");
CREATE INDEX "onboarding_import_mappings_org_target_created_idx" ON "onboarding_import_mappings"("organizationId", "target", "createdAt");
CREATE UNIQUE INDEX "onboarding_import_batches_org_target_hash_mapping_key" ON "onboarding_import_batches"("organizationId", "target", "contentHash", "mappingVersion");
CREATE INDEX "onboarding_import_batches_org_status_created_idx" ON "onboarding_import_batches"("organizationId", "status", "createdAt");
CREATE INDEX "onboarding_import_batches_org_target_created_idx" ON "onboarding_import_batches"("organizationId", "target", "createdAt");
CREATE UNIQUE INDEX "onboarding_import_rows_batch_row_key" ON "onboarding_import_rows"("batchId", "rowNumber");
CREATE INDEX "onboarding_import_rows_org_batch_key_idx" ON "onboarding_import_rows"("organizationId", "batchId", "businessKey");
CREATE INDEX "onboarding_import_rows_batch_record_idx" ON "onboarding_import_rows"("batchId", "committedRecordId");
CREATE INDEX "onboarding_import_issues_org_batch_severity_idx" ON "onboarding_import_issues"("organizationId", "batchId", "severity");
CREATE INDEX "onboarding_import_issues_batch_row_idx" ON "onboarding_import_issues"("batchId", "rowNumber");
CREATE UNIQUE INDEX "onboarding_readiness_org_target_key" ON "onboarding_readiness_milestones"("organizationId", "target");
CREATE INDEX "onboarding_readiness_org_state_idx" ON "onboarding_readiness_milestones"("organizationId", "state");

ALTER TABLE "onboarding_import_mappings" ADD CONSTRAINT "onboarding_import_mappings_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_import_batches" ADD CONSTRAINT "onboarding_import_batches_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_import_batches" ADD CONSTRAINT "onboarding_import_batches_mapping_fkey" FOREIGN KEY ("mappingId") REFERENCES "onboarding_import_mappings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "onboarding_import_rows" ADD CONSTRAINT "onboarding_import_rows_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_import_rows" ADD CONSTRAINT "onboarding_import_rows_batch_fkey" FOREIGN KEY ("batchId") REFERENCES "onboarding_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_import_issues" ADD CONSTRAINT "onboarding_import_issues_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_import_issues" ADD CONSTRAINT "onboarding_import_issues_batch_fkey" FOREIGN KEY ("batchId") REFERENCES "onboarding_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_import_issues" ADD CONSTRAINT "onboarding_import_issues_row_fkey" FOREIGN KEY ("rowId") REFERENCES "onboarding_import_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "onboarding_readiness_milestones" ADD CONSTRAINT "onboarding_readiness_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
