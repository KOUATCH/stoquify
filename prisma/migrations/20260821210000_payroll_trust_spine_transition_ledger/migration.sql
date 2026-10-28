-- Additive Payroll Trust Spine evidence. Runtime transition rows are complete
-- and immutable; historical bridge rows remain explicitly partial.
BEGIN;

CREATE TYPE "PayrollRunTransitionOrigin" AS ENUM ('RUNTIME', 'LEGACY_BACKFILL');
CREATE TYPE "PayrollRunTransitionEvidenceStatus" AS ENUM ('VERIFIED', 'LEGACY_PARTIAL_EVIDENCE');

ALTER TABLE "hris_time_requests"
  ADD COLUMN "decisionBusinessEventId" TEXT;

ALTER TABLE "payroll_runs"
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedBusinessEventId" TEXT,
  ADD COLUMN "approvedBusinessEventId" TEXT,
  ADD COLUMN "emittedBusinessEventId" TEXT;

ALTER TABLE "payroll_payslips"
  ADD COLUMN "emittedBusinessEventId" TEXT;

CREATE UNIQUE INDEX "payroll_runs_organizationId_id_key"
  ON "payroll_runs"("organizationId", "id");

CREATE UNIQUE INDEX "business_events_organizationId_id_key"
  ON "business_events"("organizationId", "id");

CREATE TABLE "payroll_run_transitions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "payrollRunId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "fromStatus" "PayrollRunStatus",
  "toStatus" "PayrollRunStatus" NOT NULL,
  "fromVersion" INTEGER,
  "toVersion" INTEGER,
  "actorId" TEXT,
  "transitionedAt" TIMESTAMP(3),
  "businessEventId" TEXT,
  "idempotencyKey" TEXT,
  "payloadHash" TEXT,
  "origin" "PayrollRunTransitionOrigin" NOT NULL DEFAULT 'RUNTIME',
  "evidenceStatus" "PayrollRunTransitionEvidenceStatus" NOT NULL DEFAULT 'VERIFIED',
  "legacyNote" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_run_transitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_run_transitions_sequence_check" CHECK ("sequence" > 0),
  CONSTRAINT "payroll_run_transitions_version_check" CHECK (
    ("fromVersion" IS NULL OR "fromVersion" > 0)
    AND ("toVersion" IS NULL OR "toVersion" > 0)
  ),
  CONSTRAINT "payroll_run_transitions_evidence_check" CHECK (
    (
      "origin" = 'RUNTIME'
      AND "evidenceStatus" = 'VERIFIED'
      AND "fromStatus" IS NOT NULL
      AND "fromVersion" IS NOT NULL
      AND "toVersion" = "fromVersion" + 1
      AND "actorId" IS NOT NULL
      AND "transitionedAt" IS NOT NULL
      AND "businessEventId" IS NOT NULL
      AND "idempotencyKey" IS NOT NULL
      AND "payloadHash" IS NOT NULL
      AND "legacyNote" IS NULL
      AND (
        ("fromStatus" = 'CALCULATED' AND "toStatus" = 'REVIEWED')
        OR ("fromStatus" = 'REVIEWED' AND "toStatus" = 'APPROVED')
        OR ("fromStatus" = 'APPROVED' AND "toStatus" = 'EMITTED')
        OR ("fromStatus" = 'EMITTED' AND "toStatus" = 'POSTED')
      )
    )
    OR
    (
      "origin" = 'LEGACY_BACKFILL'
      AND "evidenceStatus" = 'LEGACY_PARTIAL_EVIDENCE'
      AND "fromStatus" IS NULL
      AND "fromVersion" IS NULL
      AND "idempotencyKey" IS NULL
      AND "payloadHash" IS NULL
      AND "legacyNote" IS NOT NULL
      AND "toStatus" IN ('REVIEWED', 'APPROVED', 'EMITTED', 'POSTED')
    )
  )
);

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_payrollRunId_sequence_key"
  ON "payroll_run_transitions"("organizationId", "payrollRunId", "sequence");

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_payrollRunId_toStatus_key"
  ON "payroll_run_transitions"("organizationId", "payrollRunId", "toStatus");

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_idempotencyKey_key"
  ON "payroll_run_transitions"("organizationId", "idempotencyKey");

CREATE UNIQUE INDEX "payroll_run_transitions_organizationId_businessEventId_key"
  ON "payroll_run_transitions"("organizationId", "businessEventId");

CREATE INDEX "payroll_run_transitions_organizationId_payrollRunId_createdAt_idx"
  ON "payroll_run_transitions"("organizationId", "payrollRunId", "createdAt");

CREATE INDEX "payroll_run_transitions_organizationId_toStatus_transitionedAt_idx"
  ON "payroll_run_transitions"("organizationId", "toStatus", "transitionedAt");

CREATE INDEX "hris_time_requests_organizationId_decisionBusinessEventId_idx"
  ON "hris_time_requests"("organizationId", "decisionBusinessEventId");

CREATE INDEX "payroll_runs_organizationId_reviewedBusinessEventId_idx"
  ON "payroll_runs"("organizationId", "reviewedBusinessEventId");

CREATE INDEX "payroll_runs_organizationId_approvedBusinessEventId_idx"
  ON "payroll_runs"("organizationId", "approvedBusinessEventId");

CREATE INDEX "payroll_runs_organizationId_emittedBusinessEventId_idx"
  ON "payroll_runs"("organizationId", "emittedBusinessEventId");

CREATE INDEX "payroll_payslips_organizationId_emittedBusinessEventId_idx"
  ON "payroll_payslips"("organizationId", "emittedBusinessEventId");

ALTER TABLE "payroll_run_transitions"
  ADD CONSTRAINT "payroll_run_transitions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_run_transitions"
  ADD CONSTRAINT "payroll_run_transitions_run_tenant_fkey"
  FOREIGN KEY ("organizationId", "payrollRunId")
  REFERENCES "payroll_runs"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_run_transitions"
  ADD CONSTRAINT "payroll_run_transitions_event_tenant_fkey"
  FOREIGN KEY ("organizationId", "businessEventId")
  REFERENCES "business_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "hris_time_requests"
  ADD CONSTRAINT "hris_time_requests_decision_event_tenant_fkey"
  FOREIGN KEY ("organizationId", "decisionBusinessEventId")
  REFERENCES "business_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_runs"
  ADD CONSTRAINT "payroll_runs_reviewed_event_tenant_fkey"
  FOREIGN KEY ("organizationId", "reviewedBusinessEventId")
  REFERENCES "business_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_runs"
  ADD CONSTRAINT "payroll_runs_approved_event_tenant_fkey"
  FOREIGN KEY ("organizationId", "approvedBusinessEventId")
  REFERENCES "business_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_runs"
  ADD CONSTRAINT "payroll_runs_emitted_event_tenant_fkey"
  FOREIGN KEY ("organizationId", "emittedBusinessEventId")
  REFERENCES "business_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_runs"
  ADD CONSTRAINT "payroll_runs_posted_event_tenant_fkey"
  FOREIGN KEY ("organizationId", "postedBusinessEventId")
  REFERENCES "business_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payroll_payslips"
  ADD CONSTRAINT "payroll_payslips_emitted_event_tenant_fkey"
  FOREIGN KEY ("organizationId", "emittedBusinessEventId")
  REFERENCES "business_events"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- One honest snapshot bridges only the stage that the current source row proves.
-- Missing event/actor/time evidence stays null and no intermediate transition is inferred.
INSERT INTO "payroll_run_transitions" (
  "id",
  "organizationId",
  "payrollRunId",
  "sequence",
  "fromStatus",
  "toStatus",
  "fromVersion",
  "toVersion",
  "actorId",
  "transitionedAt",
  "businessEventId",
  "idempotencyKey",
  "payloadHash",
  "origin",
  "evidenceStatus",
  "legacyNote",
  "metadata"
)
SELECT
  'legacy-payroll-transition-' || run."id",
  run."organizationId",
  run."id",
  1,
  NULL,
  CASE
    WHEN run."status" = 'REVIEWED' THEN 'REVIEWED'::"PayrollRunStatus"
    WHEN run."status" = 'APPROVED' THEN 'APPROVED'::"PayrollRunStatus"
    WHEN run."status" = 'EMITTED' THEN 'EMITTED'::"PayrollRunStatus"
    ELSE 'POSTED'::"PayrollRunStatus"
  END,
  NULL,
  run."version",
  CASE
    WHEN run."status" = 'REVIEWED' THEN run."reviewedById"
    WHEN run."status" = 'APPROVED' THEN run."approvedById"
    WHEN run."status" = 'EMITTED' THEN run."emittedById"
    ELSE run."postedById"
  END,
  CASE
    WHEN run."status" = 'REVIEWED' THEN run."reviewedAt"
    WHEN run."status" = 'APPROVED' THEN run."approvedAt"
    WHEN run."status" = 'EMITTED' THEN run."emittedAt"
    ELSE run."postedAt"
  END,
  CASE
    WHEN run."status" IN ('POSTED', 'PAID', 'ARCHIVED')
      AND event."id" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "payroll_runs" duplicate_run
        WHERE duplicate_run."organizationId" = run."organizationId"
          AND duplicate_run."id" <> run."id"
          AND duplicate_run."postedBusinessEventId" = run."postedBusinessEventId"
      )
    THEN event."id"
    ELSE NULL
  END,
  NULL,
  NULL,
  'LEGACY_BACKFILL',
  'LEGACY_PARTIAL_EVIDENCE',
  'Historical lifecycle snapshot only; no intermediate transitions were inferred.',
  jsonb_build_object(
    'sourceRunStatus', run."status"::TEXT,
    'sourceRunVersion', run."version",
    'sourcePostedBusinessEventMatched', event."id" IS NOT NULL
  )
FROM "payroll_runs" run
LEFT JOIN "business_events" event
  ON event."organizationId" = run."organizationId"
  AND event."id" = run."postedBusinessEventId"
WHERE run."status" IN ('REVIEWED', 'APPROVED', 'EMITTED', 'POSTED')
  OR (
    run."status" IN ('PAID', 'ARCHIVED')
    AND (
      run."postedAt" IS NOT NULL
      OR run."ledgerPostingBatchId" IS NOT NULL
      OR run."journalEntryId" IS NOT NULL
      OR run."accountingSourceLinkId" IS NOT NULL
      OR run."postedBusinessEventId" IS NOT NULL
    )
  )
ON CONFLICT ("organizationId", "payrollRunId", "toStatus") DO NOTHING;

CREATE OR REPLACE FUNCTION "payroll_run_transition_validate_runtime"()
RETURNS TRIGGER AS $$
DECLARE
  source_run RECORD;
  expected_sequence INTEGER;
  expected_event_type TEXT;
  actual_event_type TEXT;
BEGIN
  IF NEW."origin" <> 'RUNTIME' THEN
    RETURN NEW;
  END IF;

  SELECT
    run."status",
    run."version",
    run."preparedById",
    run."reviewedById",
    run."approvedById"
  INTO source_run
  FROM "payroll_runs" run
  WHERE run."organizationId" = NEW."organizationId"
    AND run."id" = NEW."payrollRunId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll transition tenant/run scope mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF source_run."status" IS DISTINCT FROM NEW."fromStatus"
    OR source_run."version" IS DISTINCT FROM NEW."fromVersion"
  THEN
    RAISE EXCEPTION 'Payroll transition source status/version conflict'
      USING ERRCODE = '40001';
  END IF;

  SELECT COALESCE(MAX(existing."sequence"), 0) + 1
  INTO expected_sequence
  FROM "payroll_run_transitions" existing
  WHERE existing."organizationId" = NEW."organizationId"
    AND existing."payrollRunId" = NEW."payrollRunId";

  IF NEW."sequence" <> expected_sequence THEN
    RAISE EXCEPTION 'Payroll transition sequence conflict'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'REVIEWED'
    AND (
      source_run."preparedById" IS NULL
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."preparedById"
    )
  THEN
    RAISE EXCEPTION 'Payroll review violates separation of duties'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'APPROVED'
    AND (
      source_run."preparedById" IS NULL
      OR source_run."reviewedById" IS NULL
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."preparedById"
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."reviewedById"
    )
  THEN
    RAISE EXCEPTION 'Payroll approval violates separation of duties'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'EMITTED'
    AND source_run."approvedById" IS NULL
  THEN
    RAISE EXCEPTION 'Payroll emission requires persisted approval evidence'
      USING ERRCODE = '23514';
  END IF;

  IF NEW."toStatus" = 'POSTED'
    AND (
      source_run."preparedById" IS NULL
      OR source_run."approvedById" IS NULL
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."preparedById"
      OR NEW."actorId" IS NOT DISTINCT FROM source_run."approvedById"
    )
  THEN
    RAISE EXCEPTION 'Payroll posting violates separation of duties'
      USING ERRCODE = '23514';
  END IF;

  expected_event_type := CASE NEW."toStatus"
    WHEN 'REVIEWED' THEN 'PAYROLL_RUN_REVIEWED'
    WHEN 'APPROVED' THEN 'PAYROLL_RUN_APPROVED'
    WHEN 'EMITTED' THEN 'PAYSLIP_EMITTED'
    WHEN 'POSTED' THEN 'PAYROLL_POSTED'
    ELSE NULL
  END;

  SELECT event."eventType"
  INTO actual_event_type
  FROM "business_events" event
  WHERE event."organizationId" = NEW."organizationId"
    AND event."id" = NEW."businessEventId";

  IF actual_event_type IS DISTINCT FROM expected_event_type THEN
    RAISE EXCEPTION 'Payroll transition canonical event mismatch'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "payroll_run_transition_prevent_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Payroll run transition evidence is immutable and append-only'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "payroll_run_transitions_validate_runtime"
  BEFORE INSERT ON "payroll_run_transitions"
  FOR EACH ROW EXECUTE FUNCTION "payroll_run_transition_validate_runtime"();

CREATE TRIGGER "payroll_run_transitions_append_only"
  BEFORE UPDATE OR DELETE ON "payroll_run_transitions"
  FOR EACH ROW EXECUTE FUNCTION "payroll_run_transition_prevent_mutation"();

COMMIT;
