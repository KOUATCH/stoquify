-- Phase 5 / statement proof network: signed statement access and recipient workflows.
--
-- Tokens are stored only as SHA-256 digests. Recipient views are logged with
-- hashed request metadata. Statements, access logs, recipient commands, and
-- recipient workflow states remain append-only.

CREATE TYPE "CustomerStatementAccessTokenStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "CustomerStatementAccessAction" AS ENUM ('VIEW', 'DISPUTE', 'PROMISE_TO_PAY');
CREATE TYPE "CustomerStatementAccessOutcome" AS ENUM ('GRANTED', 'DENIED');
CREATE TYPE "CustomerStatementRecipientActionType" AS ENUM ('DISPUTE', 'PROMISE_TO_PAY');
CREATE TYPE "CustomerStatementRecipientActionStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "customer_statement_access_tokens" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "statementSnapshotId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "jtiHash" TEXT NOT NULL,
  "statementContentHash" TEXT NOT NULL,
  "recipientHash" TEXT,
  "allowView" BOOLEAN NOT NULL DEFAULT true,
  "allowDispute" BOOLEAN NOT NULL DEFAULT false,
  "allowPromiseToPay" BOOLEAN NOT NULL DEFAULT false,
  "status" "CustomerStatementAccessTokenStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedById" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "lastAccessedAt" TIMESTAMP(3),
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "customer_statement_access_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_statement_access_tokens_hash_check" CHECK (
    "tokenHash" ~ '^[0-9a-f]{64}$'
    AND "jtiHash" ~ '^[0-9a-f]{64}$'
    AND "statementContentHash" ~ '^[0-9a-f]{64}$'
    AND ("recipientHash" IS NULL OR "recipientHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "customer_statement_access_tokens_scope_check" CHECK (
    "allowView" = true
  ),
  CONSTRAINT "customer_statement_access_tokens_time_check" CHECK (
    "issuedAt" < "expiresAt"
    AND ("lastAccessedAt" IS NULL OR "lastAccessedAt" >= "issuedAt")
  ),
  CONSTRAINT "customer_statement_access_tokens_access_check" CHECK (
    "accessCount" >= 0
    AND (
      ("accessCount" = 0 AND "lastAccessedAt" IS NULL)
      OR ("accessCount" > 0 AND "lastAccessedAt" IS NOT NULL)
    )
  ),
  CONSTRAINT "customer_statement_access_tokens_status_check" CHECK (
    (
      "status" = 'ACTIVE'
      AND "revokedAt" IS NULL
      AND "revokedById" IS NULL
      AND "revocationReason" IS NULL
    )
    OR (
      "status" = 'REVOKED'
      AND "revokedAt" IS NOT NULL
      AND char_length(btrim("revokedById")) > 0
      AND char_length(btrim("revocationReason")) BETWEEN 3 AND 500
    )
    OR (
      "status" = 'EXPIRED'
      AND "revokedAt" IS NULL
      AND "revokedById" IS NULL
      AND "revocationReason" IS NULL
    )
  ),
  CONSTRAINT "customer_statement_access_tokens_metadata_check" CHECK (
    "metadata" IS NULL OR jsonb_typeof("metadata") = 'object'
  )
);

CREATE TABLE "customer_statement_access_logs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "statementSnapshotId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "action" "CustomerStatementAccessAction" NOT NULL,
  "outcome" "CustomerStatementAccessOutcome" NOT NULL,
  "statementContentHash" TEXT NOT NULL,
  "tokenHashPrefix" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "responseHash" TEXT,
  "denialReason" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_statement_access_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_statement_access_logs_hash_check" CHECK (
    "statementContentHash" ~ '^[0-9a-f]{64}$'
    AND "tokenHashPrefix" ~ '^[0-9a-f]{12}$'
    AND ("ipHash" IS NULL OR "ipHash" ~ '^[0-9a-f]{64}$')
    AND ("userAgentHash" IS NULL OR "userAgentHash" ~ '^[0-9a-f]{64}$')
    AND ("responseHash" IS NULL OR "responseHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "customer_statement_access_logs_outcome_check" CHECK (
    ("outcome" = 'GRANTED' AND "denialReason" IS NULL)
    OR (
      "outcome" = 'DENIED'
      AND char_length(btrim("denialReason")) BETWEEN 3 AND 120
    )
  )
);

CREATE TABLE "customer_statement_recipient_actions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "statementSnapshotId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "customerReceivableDocumentId" TEXT,
  "actionType" "CustomerStatementRecipientActionType" NOT NULL,
  "requestedAmount" DECIMAL(14,2),
  "promisedFor" TIMESTAMP(3),
  "recipientNote" TEXT NOT NULL,
  "noteHash" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_statement_recipient_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_statement_recipient_actions_type_check" CHECK (
    (
      "actionType" = 'DISPUTE'
      AND "customerReceivableDocumentId" IS NOT NULL
      AND "requestedAmount" > 0
      AND "promisedFor" IS NULL
    )
    OR (
      "actionType" = 'PROMISE_TO_PAY'
      AND "requestedAmount" > 0
      AND "promisedFor" IS NOT NULL
    )
  ),
  CONSTRAINT "customer_statement_recipient_actions_note_check" CHECK (
    char_length(btrim("recipientNote")) BETWEEN 3 AND 500
    AND "noteHash" ~ '^[0-9a-f]{64}$'
    AND "payloadHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "customer_statement_recipient_actions_key_check" CHECK (
    char_length(btrim("idempotencyKey")) BETWEEN 8 AND 160
    AND char_length(btrim("correlationId")) BETWEEN 8 AND 160
    AND char_length(btrim("businessEventId")) > 0
  )
);

CREATE TABLE "customer_statement_recipient_action_states" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "CustomerStatementRecipientActionStatus" NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "reason" TEXT,
  "previousStateHash" TEXT,
  "stateHash" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "businessEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_statement_recipient_action_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_statement_recipient_action_states_hash_check" CHECK (
    "stateHash" ~ '^[0-9a-f]{64}$'
    AND "evidenceHash" ~ '^[0-9a-f]{64}$'
    AND ("previousStateHash" IS NULL OR "previousStateHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "customer_statement_recipient_action_states_actor_check" CHECK (
    "version" > 0
    AND char_length(btrim("actorType")) BETWEEN 3 AND 40
    AND ("actorId" IS NULL OR char_length(btrim("actorId")) > 0)
    AND ("reason" IS NULL OR char_length(btrim("reason")) BETWEEN 3 AND 500)
  ),
  CONSTRAINT "customer_statement_recipient_action_states_lineage_check" CHECK (
    ("version" = 1 AND "status" = 'OPEN' AND "previousStateHash" IS NULL)
    OR ("version" > 1 AND "previousStateHash" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "customer_statement_access_tokens_organizationId_id_key"
  ON "customer_statement_access_tokens"("organizationId", "id");
CREATE UNIQUE INDEX "customer_statement_access_tokens_organizationId_tokenHash_key"
  ON "customer_statement_access_tokens"("organizationId", "tokenHash");
CREATE UNIQUE INDEX "customer_statement_access_tokens_organizationId_jtiHash_key"
  ON "customer_statement_access_tokens"("organizationId", "jtiHash");
CREATE INDEX "customer_statement_access_tokens_organizationId_statementSnapshotId_status_idx"
  ON "customer_statement_access_tokens"("organizationId", "statementSnapshotId", "status");
CREATE INDEX "customer_statement_access_tokens_organizationId_status_expiresAt_idx"
  ON "customer_statement_access_tokens"("organizationId", "status", "expiresAt");

CREATE INDEX "customer_statement_access_logs_organizationId_statementSnapshotId_occurredAt_idx"
  ON "customer_statement_access_logs"("organizationId", "statementSnapshotId", "occurredAt");
CREATE INDEX "customer_statement_access_logs_organizationId_tokenId_occurredAt_idx"
  ON "customer_statement_access_logs"("organizationId", "tokenId", "occurredAt");

CREATE UNIQUE INDEX "customer_statement_recipient_actions_organizationId_id_key"
  ON "customer_statement_recipient_actions"("organizationId", "id");
CREATE UNIQUE INDEX "customer_statement_recipient_actions_statement_idempotency_key"
  ON "customer_statement_recipient_actions"(
    "organizationId",
    "statementSnapshotId",
    "idempotencyKey"
  );
CREATE UNIQUE INDEX "customer_statement_recipient_actions_organizationId_correlationId_key"
  ON "customer_statement_recipient_actions"("organizationId", "correlationId");
CREATE INDEX "customer_statement_recipient_actions_statement_type_created_idx"
  ON "customer_statement_recipient_actions"(
    "organizationId",
    "statementSnapshotId",
    "actionType",
    "createdAt"
  );
CREATE INDEX "customer_statement_recipient_actions_receivable_idx"
  ON "customer_statement_recipient_actions"(
    "organizationId",
    "customerReceivableDocumentId"
  );

CREATE UNIQUE INDEX "customer_statement_recipient_action_states_action_version_key"
  ON "customer_statement_recipient_action_states"(
    "organizationId",
    "actionId",
    "version"
  );
CREATE UNIQUE INDEX "customer_statement_recipient_action_states_state_hash_key"
  ON "customer_statement_recipient_action_states"("organizationId", "stateHash");
CREATE INDEX "customer_statement_recipient_action_states_action_effective_idx"
  ON "customer_statement_recipient_action_states"(
    "organizationId",
    "actionId",
    "effectiveAt"
  );

ALTER TABLE "customer_statement_access_tokens"
  ADD CONSTRAINT "customer_statement_access_tokens_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_access_tokens"
  ADD CONSTRAINT "customer_statement_access_tokens_statementSnapshotId_fkey"
  FOREIGN KEY ("organizationId", "statementSnapshotId")
  REFERENCES "customer_statement_snapshots"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_statement_access_logs"
  ADD CONSTRAINT "customer_statement_access_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_access_logs"
  ADD CONSTRAINT "customer_statement_access_logs_statementSnapshotId_fkey"
  FOREIGN KEY ("organizationId", "statementSnapshotId")
  REFERENCES "customer_statement_snapshots"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_access_logs"
  ADD CONSTRAINT "customer_statement_access_logs_tokenId_fkey"
  FOREIGN KEY ("organizationId", "tokenId")
  REFERENCES "customer_statement_access_tokens"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_statement_recipient_actions"
  ADD CONSTRAINT "customer_statement_recipient_actions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_recipient_actions"
  ADD CONSTRAINT "customer_statement_recipient_actions_statementSnapshotId_fkey"
  FOREIGN KEY ("organizationId", "statementSnapshotId")
  REFERENCES "customer_statement_snapshots"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_recipient_actions"
  ADD CONSTRAINT "customer_statement_recipient_actions_tokenId_fkey"
  FOREIGN KEY ("organizationId", "tokenId")
  REFERENCES "customer_statement_access_tokens"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_recipient_actions"
  ADD CONSTRAINT "customer_statement_recipient_actions_receivableId_fkey"
  FOREIGN KEY ("organizationId", "customerReceivableDocumentId")
  REFERENCES "customer_receivable_documents"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_statement_recipient_action_states"
  ADD CONSTRAINT "customer_statement_recipient_action_states_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_recipient_action_states"
  ADD CONSTRAINT "customer_statement_recipient_action_states_actionId_fkey"
  FOREIGN KEY ("organizationId", "actionId")
  REFERENCES "customer_statement_recipient_actions"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "customer_statement_access_tokens_guard_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Customer statement access tokens cannot be deleted';
  END IF;

  IF (
    NEW."organizationId",
    NEW."statementSnapshotId",
    NEW."tokenHash",
    NEW."jtiHash",
    NEW."statementContentHash",
    NEW."recipientHash",
    NEW."allowView",
    NEW."allowDispute",
    NEW."allowPromiseToPay",
    NEW."issuedById",
    NEW."issuedAt",
    NEW."expiresAt",
    NEW."metadata",
    NEW."createdAt"
  ) IS DISTINCT FROM (
    OLD."organizationId",
    OLD."statementSnapshotId",
    OLD."tokenHash",
    OLD."jtiHash",
    OLD."statementContentHash",
    OLD."recipientHash",
    OLD."allowView",
    OLD."allowDispute",
    OLD."allowPromiseToPay",
    OLD."issuedById",
    OLD."issuedAt",
    OLD."expiresAt",
    OLD."metadata",
    OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'Customer statement access token identity is immutable';
  END IF;

  IF OLD."status" <> 'ACTIVE' AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'Terminal customer statement access token status cannot change';
  END IF;
  IF NEW."accessCount" < OLD."accessCount" THEN
    RAISE EXCEPTION 'Customer statement access count cannot decrease';
  END IF;
  IF OLD."lastAccessedAt" IS NOT NULL
     AND NEW."lastAccessedAt" < OLD."lastAccessedAt" THEN
    RAISE EXCEPTION 'Customer statement last access time cannot move backwards';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "customer_statement_append_only_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Customer statement recipient evidence is append-only';
END;
$$;

CREATE TRIGGER "customer_statement_access_tokens_guard_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_statement_access_tokens"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_access_tokens_guard_mutation"();

CREATE TRIGGER "customer_statement_access_logs_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_statement_access_logs"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_append_only_guard"();

CREATE TRIGGER "customer_statement_recipient_actions_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_statement_recipient_actions"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_append_only_guard"();

CREATE TRIGGER "customer_statement_recipient_action_states_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_statement_recipient_action_states"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_append_only_guard"();
