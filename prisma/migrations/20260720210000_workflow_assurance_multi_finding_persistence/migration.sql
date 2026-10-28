-- Add replay-safe definition execution identity and immutable per-source finding evidence.
ALTER TABLE "workflow_assurance_check_runs"
  ADD COLUMN "executionKey" VARCHAR(200),
  ADD COLUMN "executionDigest" VARCHAR(71);

ALTER TABLE "workflow_assurance_check_runs"
  ADD CONSTRAINT "workflow_assurance_check_runs_execution_identity_check"
  CHECK (
    ("executionKey" IS NULL AND "executionDigest" IS NULL)
    OR (
      "executionKey" IS NOT NULL
      AND "executionDigest" IS NOT NULL
      AND LENGTH(BTRIM("executionKey")) > 0
      AND "executionKey" = BTRIM("executionKey")
      AND "executionDigest" ~ '^sha256:[0-9a-f]{64}$'
    )
  );

CREATE UNIQUE INDEX "workflow_assurance_run_execution_key"
  ON "workflow_assurance_check_runs"("organizationId", "checkKey", "definitionVersion", "executionKey");

CREATE TABLE "workflow_assurance_check_findings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "checkRunId" TEXT NOT NULL,
  "incidentId" TEXT,
  "ordinal" INTEGER NOT NULL,
  "status" "WorkflowAssuranceResultStatus" NOT NULL,
  "severity" "WorkflowAssuranceSeverity" NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "scannedCount" INTEGER NOT NULL DEFAULT 0,
  "passedCount" INTEGER NOT NULL DEFAULT 0,
  "warningCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "blockedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "message" TEXT NOT NULL,
  "recommendedAction" TEXT,
  "evidenceLinks" JSONB NOT NULL,
  "resultMetadata" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_assurance_check_findings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workflow_assurance_check_findings_ordinal_check" CHECK ("ordinal" BETWEEN 0 AND 99),
  CONSTRAINT "workflow_assurance_check_findings_source_identity_check" CHECK (
    LENGTH(BTRIM("sourceType")) > 0
    AND LENGTH(BTRIM("sourceId")) > 0
    AND "sourceType" = BTRIM("sourceType")
    AND "sourceId" = BTRIM("sourceId")
  ),
  CONSTRAINT "workflow_assurance_check_findings_counts_check" CHECK (
    "scannedCount" >= 0
    AND "passedCount" >= 0
    AND "warningCount" >= 0
    AND "failedCount" >= 0
    AND "blockedCount" >= 0
    AND "skippedCount" >= 0
    AND "errorCount" >= 0
  ),
  CONSTRAINT "workflow_assurance_check_findings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workflow_assurance_check_findings_checkRunId_fkey"
    FOREIGN KEY ("checkRunId") REFERENCES "workflow_assurance_check_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workflow_assurance_check_findings_incidentId_fkey"
    FOREIGN KEY ("incidentId") REFERENCES "workflow_assurance_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "workflow_assurance_check_findings_checkRunId_ordinal_key"
  ON "workflow_assurance_check_findings"("checkRunId", "ordinal");

CREATE UNIQUE INDEX "workflow_assurance_check_findings_checkRunId_fingerprint_key"
  ON "workflow_assurance_check_findings"("checkRunId", "fingerprint");

CREATE INDEX "workflow_assurance_check_findings_organizationId_sourceType_sourceId_idx"
  ON "workflow_assurance_check_findings"("organizationId", "sourceType", "sourceId");

CREATE INDEX "workflow_assurance_check_findings_incidentId_idx"
  ON "workflow_assurance_check_findings"("incidentId");

CREATE OR REPLACE FUNCTION "workflow_assurance_check_findings_prevent_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable workflow assurance finding %', OLD."id"
      USING ERRCODE = '23514';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable workflow assurance finding %', OLD."id"
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "workflow_assurance_check_findings_prevent_mutation_trigger"
  BEFORE UPDATE OR DELETE ON "workflow_assurance_check_findings"
  FOR EACH ROW EXECUTE FUNCTION "workflow_assurance_check_findings_prevent_mutation"();
