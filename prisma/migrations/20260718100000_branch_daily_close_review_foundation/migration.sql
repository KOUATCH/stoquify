CREATE TYPE "BranchDailyCloseRunStatus" AS ENUM ('IN_REVIEW', 'BLOCKED');

CREATE TABLE "branch_daily_close_runs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "businessDate" DATE NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "BranchDailyCloseRunStatus" NOT NULL,
  "readinessState" VARCHAR(32) NOT NULL,
  "evidenceCoverageState" VARCHAR(16) NOT NULL,
  "supportedItemCount" INTEGER NOT NULL,
  "unsupportedItemCount" INTEGER NOT NULL,
  "blockerCount" INTEGER NOT NULL,
  "evidenceObservedAt" TIMESTAMP(3) NOT NULL,
  "readinessSourceHash" VARCHAR(71) NOT NULL,
  "evidenceHash" VARCHAR(71) NOT NULL,
  "evidenceManifest" JSONB NOT NULL,
  "startedById" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "requestHash" VARCHAR(71) NOT NULL,
  "correlationId" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "branch_daily_close_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branch_daily_close_runs_period_check" CHECK ("periodStart" < "periodEnd"),
  CONSTRAINT "branch_daily_close_runs_count_check" CHECK (
    "supportedItemCount" >= 0
    AND "unsupportedItemCount" >= 0
    AND "supportedItemCount" + "unsupportedItemCount" > 0
    AND "blockerCount" >= 0
  ),
  CONSTRAINT "branch_daily_close_runs_hash_check" CHECK (
    length(btrim("readinessSourceHash")) = 71
    AND length(btrim("evidenceHash")) = 71
    AND length(btrim("requestHash")) = 71
  ),
  CONSTRAINT "branch_daily_close_runs_identity_check" CHECK (
    length(btrim("idempotencyKey")) > 0
    AND length(btrim("correlationId")) > 0
  ),
  CONSTRAINT "branch_daily_close_runs_readiness_check" CHECK (
    "readinessState" IN ('READY_FOR_REVIEW', 'ACTION_REQUIRED', 'NO_ACTIVITY', 'UNAVAILABLE')
    AND "evidenceCoverageState" IN ('PARTIAL', 'COMPLETE')
  )
);

CREATE UNIQUE INDEX "branch_daily_close_runs_organizationId_locationId_businessDate_key"
  ON "branch_daily_close_runs"("organizationId", "locationId", "businessDate");

CREATE UNIQUE INDEX "branch_daily_close_runs_organizationId_idempotencyKey_key"
  ON "branch_daily_close_runs"("organizationId", "idempotencyKey");

CREATE INDEX "branch_daily_close_runs_organizationId_status_businessDate_idx"
  ON "branch_daily_close_runs"("organizationId", "status", "businessDate");

CREATE INDEX "branch_daily_close_runs_organizationId_locationId_status_businessDate_idx"
  ON "branch_daily_close_runs"("organizationId", "locationId", "status", "businessDate");

CREATE INDEX "branch_daily_close_runs_startedById_idx"
  ON "branch_daily_close_runs"("startedById");

CREATE INDEX "branch_daily_close_runs_correlationId_idx"
  ON "branch_daily_close_runs"("correlationId");

ALTER TABLE "branch_daily_close_runs"
  ADD CONSTRAINT "branch_daily_close_runs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "branch_daily_close_runs"
  ADD CONSTRAINT "branch_daily_close_runs_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "locations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "branch_daily_close_runs"
  ADD CONSTRAINT "branch_daily_close_runs_startedById_fkey"
  FOREIGN KEY ("startedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
