-- Development-only M2 foundation: tenant/terminal-scoped POS commit replay.
--
-- This migration is additive. It does not rewrite, delete, or renumber any
-- completed sale, payment, stock movement, receipt, fiscal source, journal,
-- or audit record. Applying it still requires an approved migration target,
-- backup/restore evidence, authenticated operator, and migration checker.

CREATE TYPE "POSCommitResultStatus" AS ENUM ('CLAIMED', 'COMMITTED', 'COMPLETED');

CREATE TABLE "pos_commit_results" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "terminalId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "clientCommitId" VARCHAR(191) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "requestSchemaVersion" INTEGER NOT NULL DEFAULT 1,
  "status" "POSCommitResultStatus" NOT NULL DEFAULT 'CLAIMED',
  "resultEnvelope" JSONB,
  "resultHash" VARCHAR(64),
  "committedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pos_commit_results_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pos_commit_results_request_identity_check" CHECK (
    char_length(btrim("clientCommitId")) BETWEEN 8 AND 191
    AND "clientCommitId" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$'
    AND "requestHash" ~ '^[0-9a-f]{64}$'
    AND "requestSchemaVersion" > 0
  ),
  CONSTRAINT "pos_commit_results_result_hash_check" CHECK (
    "resultHash" IS NULL OR "resultHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "pos_commit_results_state_shape_check" CHECK (
    (
      "status" = 'CLAIMED'
      AND "resultEnvelope" IS NULL
      AND "resultHash" IS NULL
      AND "committedAt" IS NULL
      AND "completedAt" IS NULL
    ) OR (
      "status" = 'COMMITTED'
      AND jsonb_typeof("resultEnvelope") = 'object'
      AND "resultHash" IS NOT NULL
      AND "committedAt" IS NOT NULL
      AND "completedAt" IS NULL
    ) OR (
      "status" = 'COMPLETED'
      AND jsonb_typeof("resultEnvelope") = 'object'
      AND "resultHash" IS NOT NULL
      AND "committedAt" IS NOT NULL
      AND "completedAt" IS NOT NULL
      AND "completedAt" >= "committedAt"
    )
  )
);

CREATE UNIQUE INDEX "pos_commit_results_organizationId_terminalId_clientCommitId_key"
  ON "pos_commit_results"("organizationId", "terminalId", "clientCommitId");
CREATE INDEX "pos_commit_results_organizationId_locationId_status_createdAt_idx"
  ON "pos_commit_results"("organizationId", "locationId", "status", "createdAt");
CREATE INDEX "pos_commit_results_organizationId_salesOrderId_idx"
  ON "pos_commit_results"("organizationId", "salesOrderId");
CREATE INDEX "pos_commit_results_organizationId_sessionId_createdAt_idx"
  ON "pos_commit_results"("organizationId", "sessionId", "createdAt");

ALTER TABLE "pos_commit_results"
  ADD CONSTRAINT "pos_commit_results_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_commit_results"
  ADD CONSTRAINT "pos_commit_results_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "locations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_commit_results"
  ADD CONSTRAINT "pos_commit_results_terminalId_fkey"
  FOREIGN KEY ("terminalId") REFERENCES "pos_terminals"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_commit_results"
  ADD CONSTRAINT "pos_commit_results_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_commit_results"
  ADD CONSTRAINT "pos_commit_results_salesOrderId_fkey"
  FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_commit_results"
  ADD CONSTRAINT "pos_commit_results_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "pos_commit_results_enforce_scope"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "locations" location
    WHERE location."id" = NEW."locationId"
      AND location."organizationId" = NEW."organizationId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "pos_terminals" terminal
    WHERE terminal."id" = NEW."terminalId"
      AND terminal."organizationId" = NEW."organizationId"
      AND terminal."locationId" = NEW."locationId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "pos_sessions" pos_session
    WHERE pos_session."id" = NEW."sessionId"
      AND pos_session."organizationId" = NEW."organizationId"
      AND pos_session."locationId" = NEW."locationId"
      AND pos_session."terminalId" = NEW."terminalId"
      AND pos_session."userId" = NEW."actorId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "sales_orders" sale
    WHERE sale."id" = NEW."salesOrderId"
      AND sale."organizationId" = NEW."organizationId"
      AND sale."locationId" = NEW."locationId"
      AND sale."terminalId" = NEW."terminalId"
      AND sale."sessionId" = NEW."sessionId"
      AND sale."createdById" = NEW."actorId"
  ) OR NOT EXISTS (
    SELECT 1
    FROM "users" actor
    WHERE actor."id" = NEW."actorId"
      AND actor."organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'POS commit result scope does not match its tenant-owned source records';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "pos_commit_results_enforce_scope_trigger"
BEFORE INSERT ON "pos_commit_results"
FOR EACH ROW EXECUTE FUNCTION "pos_commit_results_enforce_scope"();

CREATE OR REPLACE FUNCTION "pos_commit_results_enforce_lifecycle"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'POS commit result evidence is immutable and cannot be deleted';
  END IF;

  IF OLD."id" IS DISTINCT FROM NEW."id"
    OR OLD."organizationId" IS DISTINCT FROM NEW."organizationId"
    OR OLD."locationId" IS DISTINCT FROM NEW."locationId"
    OR OLD."terminalId" IS DISTINCT FROM NEW."terminalId"
    OR OLD."sessionId" IS DISTINCT FROM NEW."sessionId"
    OR OLD."salesOrderId" IS DISTINCT FROM NEW."salesOrderId"
    OR OLD."actorId" IS DISTINCT FROM NEW."actorId"
    OR OLD."clientCommitId" IS DISTINCT FROM NEW."clientCommitId"
    OR OLD."requestHash" IS DISTINCT FROM NEW."requestHash"
    OR OLD."requestSchemaVersion" IS DISTINCT FROM NEW."requestSchemaVersion"
    OR OLD."createdAt" IS DISTINCT FROM NEW."createdAt" THEN
    RAISE EXCEPTION 'POS commit result identity and request evidence are immutable';
  END IF;

  IF OLD."status" = 'COMPLETED' THEN
    RAISE EXCEPTION 'Completed POS commit result evidence is immutable';
  END IF;

  IF OLD."status" = 'CLAIMED' AND NEW."status" <> 'COMMITTED' THEN
    RAISE EXCEPTION 'Invalid POS commit result transition from CLAIMED to %', NEW."status";
  END IF;

  IF OLD."status" = 'COMMITTED' AND NEW."status" <> 'COMPLETED' THEN
    RAISE EXCEPTION 'Invalid POS commit result transition from COMMITTED to %', NEW."status";
  END IF;

  IF OLD."status" = 'COMMITTED'
    AND NEW."committedAt" IS DISTINCT FROM OLD."committedAt" THEN
    RAISE EXCEPTION 'POS commit result committed timestamp is immutable';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "pos_commit_results_enforce_lifecycle_trigger"
BEFORE UPDATE OR DELETE ON "pos_commit_results"
FOR EACH ROW EXECUTE FUNCTION "pos_commit_results_enforce_lifecycle"();
