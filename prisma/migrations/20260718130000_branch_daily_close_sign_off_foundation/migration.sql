CREATE TYPE "BranchDailyCloseSignOffStatus" AS ENUM ('ACTIVE', 'REVOKED', 'SUPERSEDED');

CREATE UNIQUE INDEX "branch_daily_close_runs_organizationId_id_key"
  ON "branch_daily_close_runs"("organizationId", "id");

CREATE TABLE "branch_daily_close_sign_offs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchDailyCloseRunId" TEXT NOT NULL,
  "status" "BranchDailyCloseSignOffStatus" NOT NULL DEFAULT 'ACTIVE',
  "activeKey" VARCHAR(200),
  "signedReadinessSourceHash" VARCHAR(71) NOT NULL,
  "signedEvidenceHash" VARCHAR(71) NOT NULL,
  "signedEvidenceObservedAt" TIMESTAMP(3) NOT NULL,
  "signedById" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3) NOT NULL,
  "authAssuranceLevel" VARCHAR(2) NOT NULL,
  "freshAuthAt" TIMESTAMP(3) NOT NULL,
  "invalidatedById" TEXT,
  "invalidatedAt" TIMESTAMP(3),
  "invalidationReason" VARCHAR(500),
  "supersedesSignOffId" TEXT,
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "requestHash" VARCHAR(71) NOT NULL,
  "correlationId" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "branch_daily_close_sign_offs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "branch_daily_close_sign_offs_hash_check" CHECK (
    length(btrim("signedReadinessSourceHash")) = 71
    AND left("signedReadinessSourceHash", 7) = 'sha256:'
    AND length(btrim("signedEvidenceHash")) = 71
    AND left("signedEvidenceHash", 7) = 'sha256:'
    AND length(btrim("requestHash")) = 71
    AND left("requestHash", 7) = 'sha256:'
  ),
  CONSTRAINT "branch_daily_close_sign_offs_identity_check" CHECK (
    length(btrim("idempotencyKey")) > 0
    AND length(btrim("correlationId")) > 0
    AND ("activeKey" IS NULL OR length(btrim("activeKey")) > 0)
    AND ("supersedesSignOffId" IS NULL OR "supersedesSignOffId" <> "id")
  ),
  CONSTRAINT "branch_daily_close_sign_offs_evidence_time_check" CHECK (
    "signedEvidenceObservedAt" <= "signedAt"
  ),
  CONSTRAINT "branch_daily_close_sign_offs_assurance_check" CHECK (
    "authAssuranceLevel" = 'L1'
    AND "freshAuthAt" <= "signedAt"
    AND "freshAuthAt" >= "signedAt" - INTERVAL '300 seconds'
  ),
  CONSTRAINT "branch_daily_close_sign_offs_lifecycle_check" CHECK (
    (
      "status" = 'ACTIVE'
      AND "activeKey" = "branchDailyCloseRunId"
      AND "invalidatedById" IS NULL
      AND "invalidatedAt" IS NULL
      AND "invalidationReason" IS NULL
    )
    OR
    (
      "status" IN ('REVOKED', 'SUPERSEDED')
      AND "activeKey" IS NULL
      AND "invalidatedById" IS NOT NULL
      AND "invalidatedAt" IS NOT NULL
      AND length(btrim("invalidationReason")) > 0
      AND "invalidatedAt" >= "signedAt"
    )
  )
);

CREATE UNIQUE INDEX "branch_daily_close_sign_offs_organizationId_id_key"
  ON "branch_daily_close_sign_offs"("organizationId", "id");

CREATE UNIQUE INDEX "branch_daily_close_sign_offs_organizationId_activeKey_key"
  ON "branch_daily_close_sign_offs"("organizationId", "activeKey");

CREATE UNIQUE INDEX "branch_daily_close_sign_offs_organizationId_idempotencyKey_key"
  ON "branch_daily_close_sign_offs"("organizationId", "idempotencyKey");

CREATE INDEX "branch_daily_close_sign_offs_organizationId_branchDailyCloseRunId_status_signedAt_idx"
  ON "branch_daily_close_sign_offs"("organizationId", "branchDailyCloseRunId", "status", "signedAt");

CREATE INDEX "branch_daily_close_sign_offs_signedById_idx"
  ON "branch_daily_close_sign_offs"("signedById");

CREATE INDEX "branch_daily_close_sign_offs_invalidatedById_idx"
  ON "branch_daily_close_sign_offs"("invalidatedById");

CREATE INDEX "branch_daily_close_sign_offs_supersedesSignOffId_idx"
  ON "branch_daily_close_sign_offs"("supersedesSignOffId");

CREATE INDEX "branch_daily_close_sign_offs_correlationId_idx"
  ON "branch_daily_close_sign_offs"("correlationId");

ALTER TABLE "branch_daily_close_sign_offs"
  ADD CONSTRAINT "branch_daily_close_sign_offs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "branch_daily_close_sign_offs"
  ADD CONSTRAINT "branch_daily_close_sign_offs_organizationId_branchDailyCloseRunId_fkey"
  FOREIGN KEY ("organizationId", "branchDailyCloseRunId") REFERENCES "branch_daily_close_runs"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "branch_daily_close_sign_offs"
  ADD CONSTRAINT "branch_daily_close_sign_offs_signedById_fkey"
  FOREIGN KEY ("signedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "branch_daily_close_sign_offs"
  ADD CONSTRAINT "branch_daily_close_sign_offs_invalidatedById_fkey"
  FOREIGN KEY ("invalidatedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "branch_daily_close_sign_offs"
  ADD CONSTRAINT "branch_daily_close_sign_offs_organizationId_supersedesSignOffId_fkey"
  FOREIGN KEY ("organizationId", "supersedesSignOffId") REFERENCES "branch_daily_close_sign_offs"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
