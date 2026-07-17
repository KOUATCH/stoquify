-- Kontava Workflow Assurance Registry foundation.
-- Observe-mode only: durable check definitions plus tenant-scoped check-run history.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceWorkflow') THEN
    CREATE TYPE "WorkflowAssuranceWorkflow" AS ENUM (
      'CASH_COMMAND',
      'RECEIVABLES',
      'PAYABLES',
      'INVENTORY',
      'SALES_MARGIN',
      'PAYMENT_RECONCILIATION',
      'LEDGER',
      'BUSINESS_EVENT',
      'PURCHASING_AP',
      'PAYROLL',
      'COMPLIANCE',
      'CLOSE_ASSURANCE',
      'POS',
      'OFFLINE_POS',
      'SNAPSHOT_BI',
      'CROSS_MODULE'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceExecutionMode') THEN
    CREATE TYPE "WorkflowAssuranceExecutionMode" AS ENUM (
      'SYNCHRONOUS_GUARD',
      'AFTER_COMMIT_VALIDATOR',
      'SCHEDULED_SCAN',
      'PRE_CLOSE_GATE',
      'SNAPSHOT_BI_GUARD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceResultStatus') THEN
    CREATE TYPE "WorkflowAssuranceResultStatus" AS ENUM (
      'PASSED',
      'WARNING',
      'FAILED',
      'BLOCKED',
      'SKIPPED',
      'ERROR'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceRunType') THEN
    CREATE TYPE "WorkflowAssuranceRunType" AS ENUM (
      'MANUAL',
      'SCHEDULED',
      'AFTER_COMMIT',
      'PRE_CLOSE',
      'SNAPSHOT_GUARD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceRunStatus') THEN
    CREATE TYPE "WorkflowAssuranceRunStatus" AS ENUM (
      'RUNNING',
      'COMPLETED',
      'COMPLETED_WITH_WARNINGS',
      'FAILED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WorkflowAssuranceSeverity') THEN
    CREATE TYPE "WorkflowAssuranceSeverity" AS ENUM (
      'INFO',
      'WARNING',
      'HIGH',
      'BLOCKING',
      'COMPLIANCE_CRITICAL'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "workflow_assurance_check_definitions" (
  "id" TEXT NOT NULL,
  "checkKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "workflow" "WorkflowAssuranceWorkflow" NOT NULL,
  "moduleSlug" TEXT NOT NULL,
  "invariantName" TEXT NOT NULL,
  "executionMode" "WorkflowAssuranceExecutionMode" NOT NULL,
  "defaultSeverity" "WorkflowAssuranceSeverity" NOT NULL DEFAULT 'WARNING',
  "requiredPermission" TEXT NOT NULL,
  "ownerRole" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "enforceMode" BOOLEAN NOT NULL DEFAULT false,
  "sourceTables" JSONB NOT NULL,
  "actionRoute" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_assurance_check_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "workflow_assurance_check_runs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "checkKey" TEXT NOT NULL,
  "definitionVersion" INTEGER NOT NULL,
  "runType" "WorkflowAssuranceRunType" NOT NULL,
  "runStatus" "WorkflowAssuranceRunStatus" NOT NULL DEFAULT 'RUNNING',
  "resultStatus" "WorkflowAssuranceResultStatus",
  "severity" "WorkflowAssuranceSeverity",
  "actorId" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "sourceHash" TEXT,
  "fingerprint" TEXT,
  "periodId" TEXT,
  "locationId" TEXT,
  "scannedCount" INTEGER NOT NULL DEFAULT 0,
  "passedCount" INTEGER NOT NULL DEFAULT 0,
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "blockedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "resultSummary" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_assurance_check_runs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_check_runs_organizationId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_check_runs"
      ADD CONSTRAINT "workflow_assurance_check_runs_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workflow_assurance_check_runs_definitionId_fkey'
  ) THEN
    ALTER TABLE "workflow_assurance_check_runs"
      ADD CONSTRAINT "workflow_assurance_check_runs_definitionId_fkey"
      FOREIGN KEY ("definitionId") REFERENCES "workflow_assurance_check_definitions"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "workflow_assurance_check_definitions_checkKey_version_key"
  ON "workflow_assurance_check_definitions"("checkKey", "version");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_definitions_workflow_enabled_idx"
  ON "workflow_assurance_check_definitions"("workflow", "enabled");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_definitions_moduleSlug_enabled_idx"
  ON "workflow_assurance_check_definitions"("moduleSlug", "enabled");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_definitions_executionMode_enabled_idx"
  ON "workflow_assurance_check_definitions"("executionMode", "enabled");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_runs_organizationId_runStatus_startedAt_idx"
  ON "workflow_assurance_check_runs"("organizationId", "runStatus", "startedAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_runs_organizationId_resultStatus_startedAt_idx"
  ON "workflow_assurance_check_runs"("organizationId", "resultStatus", "startedAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_runs_organizationId_checkKey_startedAt_idx"
  ON "workflow_assurance_check_runs"("organizationId", "checkKey", "startedAt");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_runs_organizationId_sourceType_sourceId_idx"
  ON "workflow_assurance_check_runs"("organizationId", "sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "workflow_assurance_check_runs_definitionId_idx"
  ON "workflow_assurance_check_runs"("definitionId");
