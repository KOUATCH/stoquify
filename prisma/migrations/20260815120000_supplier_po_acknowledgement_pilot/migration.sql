-- Minimum supplier PO acknowledgement pilot.
-- External responses are immutable proposals; purchase-order, stock, AP, and
-- accounting records are never mutated by this boundary.

ALTER TYPE "AccountingSourceType" ADD VALUE 'SUPPLIER_PO_ACKNOWLEDGEMENT';

CREATE TYPE "SupplierPoAccessTokenStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "SupplierPoAccessAction" AS ENUM ('VIEW', 'RESPOND');
CREATE TYPE "SupplierPoAccessOutcome" AS ENUM ('GRANTED', 'DENIED');
CREATE TYPE "SupplierPoProposalType" AS ENUM ('ACCEPT', 'REJECT', 'REQUEST_CHANGE');
CREATE TYPE "SupplierPoProposalStatus" AS ENUM ('SUBMITTED', 'BUYER_ACCEPTED', 'BUYER_REJECTED');
CREATE TYPE "SupplierPoProposalActorType" AS ENUM ('SUPPLIER', 'BUYER');

CREATE TABLE "supplier_po_envelopes" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "preferredLocale" "Locale" NOT NULL DEFAULT 'EN',
  "payload" JSONB NOT NULL,
  "sourceStateHash" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_po_envelopes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_po_envelopes_hash_check" CHECK (
    "sourceStateHash" ~ '^[0-9a-f]{64}$'
    AND "contentHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "supplier_po_envelopes_key_check" CHECK (
    char_length(btrim("idempotencyKey")) BETWEEN 8 AND 160
    AND char_length(btrim("correlationId")) BETWEEN 8 AND 160
    AND char_length(btrim("businessEventId")) > 0
    AND char_length(btrim("createdById")) > 0
  ),
  CONSTRAINT "supplier_po_envelopes_payload_check" CHECK (
    jsonb_typeof("payload") = 'object'
  )
);

CREATE TABLE "supplier_po_access_tokens" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "envelopeId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "jtiHash" TEXT NOT NULL,
  "envelopeContentHash" TEXT NOT NULL,
  "recipientHash" TEXT,
  "allowView" BOOLEAN NOT NULL DEFAULT true,
  "allowRespond" BOOLEAN NOT NULL DEFAULT true,
  "status" "SupplierPoAccessTokenStatus" NOT NULL DEFAULT 'ACTIVE',
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
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

  CONSTRAINT "supplier_po_access_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_po_access_tokens_hash_check" CHECK (
    "tokenHash" ~ '^[0-9a-f]{64}$'
    AND "jtiHash" ~ '^[0-9a-f]{64}$'
    AND "envelopeContentHash" ~ '^[0-9a-f]{64}$'
    AND ("recipientHash" IS NULL OR "recipientHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "supplier_po_access_tokens_scope_check" CHECK ("allowView" = true),
  CONSTRAINT "supplier_po_access_tokens_key_check" CHECK (
    char_length(btrim("idempotencyKey")) BETWEEN 8 AND 160
    AND char_length(btrim("correlationId")) BETWEEN 8 AND 160
    AND char_length(btrim("businessEventId")) > 0
  ),
  CONSTRAINT "supplier_po_access_tokens_time_check" CHECK (
    "issuedAt" < "expiresAt"
    AND ("lastAccessedAt" IS NULL OR "lastAccessedAt" >= "issuedAt")
  ),
  CONSTRAINT "supplier_po_access_tokens_access_check" CHECK (
    "accessCount" >= 0
    AND (
      ("accessCount" = 0 AND "lastAccessedAt" IS NULL)
      OR ("accessCount" > 0 AND "lastAccessedAt" IS NOT NULL)
    )
  ),
  CONSTRAINT "supplier_po_access_tokens_status_check" CHECK (
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
  CONSTRAINT "supplier_po_access_tokens_metadata_check" CHECK (
    "metadata" IS NULL OR jsonb_typeof("metadata") = 'object'
  )
);

CREATE TABLE "supplier_po_access_logs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "envelopeId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "action" "SupplierPoAccessAction" NOT NULL,
  "outcome" "SupplierPoAccessOutcome" NOT NULL,
  "envelopeContentHash" TEXT NOT NULL,
  "tokenHashPrefix" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "responseHash" TEXT,
  "denialReason" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_po_access_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_po_access_logs_hash_check" CHECK (
    "envelopeContentHash" ~ '^[0-9a-f]{64}$'
    AND "tokenHashPrefix" ~ '^[0-9a-f]{12}$'
    AND ("ipHash" IS NULL OR "ipHash" ~ '^[0-9a-f]{64}$')
    AND ("userAgentHash" IS NULL OR "userAgentHash" ~ '^[0-9a-f]{64}$')
    AND ("responseHash" IS NULL OR "responseHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "supplier_po_access_logs_outcome_check" CHECK (
    ("outcome" = 'GRANTED' AND "denialReason" IS NULL)
    OR (
      "outcome" = 'DENIED'
      AND char_length(btrim("denialReason")) BETWEEN 3 AND 120
    )
  )
);

CREATE TABLE "supplier_po_proposals" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "envelopeId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "proposalType" "SupplierPoProposalType" NOT NULL,
  "requestedDeliveryDate" TIMESTAMP(3),
  "supplierNote" TEXT,
  "noteHash" TEXT,
  "payloadHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_po_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_po_proposals_hash_check" CHECK (
    "payloadHash" ~ '^[0-9a-f]{64}$'
    AND ("noteHash" IS NULL OR "noteHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "supplier_po_proposals_note_check" CHECK (
    ("supplierNote" IS NULL AND "noteHash" IS NULL)
    OR (
      char_length(btrim("supplierNote")) BETWEEN 3 AND 500
      AND "noteHash" IS NOT NULL
    )
  ),
  CONSTRAINT "supplier_po_proposals_type_check" CHECK (
    ("proposalType" = 'ACCEPT' AND "requestedDeliveryDate" IS NULL)
    OR (
      "proposalType" = 'REJECT'
      AND "requestedDeliveryDate" IS NULL
      AND "supplierNote" IS NOT NULL
    )
    OR (
      "proposalType" = 'REQUEST_CHANGE'
      AND "supplierNote" IS NOT NULL
    )
  ),
  CONSTRAINT "supplier_po_proposals_key_check" CHECK (
    char_length(btrim("idempotencyKey")) BETWEEN 8 AND 160
    AND char_length(btrim("correlationId")) BETWEEN 8 AND 160
    AND char_length(btrim("businessEventId")) > 0
  )
);

CREATE TABLE "supplier_po_proposal_lines" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "purchaseOrderLineId" TEXT NOT NULL,
  "originalOrderedQuantity" DECIMAL(12,3) NOT NULL,
  "requestedQuantity" DECIMAL(12,3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_po_proposal_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_po_proposal_lines_quantity_check" CHECK (
    "originalOrderedQuantity" > 0
    AND "requestedQuantity" > 0
    AND "originalOrderedQuantity" <> "requestedQuantity"
  )
);

CREATE TABLE "supplier_po_proposal_states" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "proposalId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "SupplierPoProposalStatus" NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "actorType" "SupplierPoProposalActorType" NOT NULL,
  "actorId" TEXT,
  "reason" TEXT,
  "previousStateHash" TEXT,
  "stateHash" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_po_proposal_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_po_proposal_states_hash_check" CHECK (
    "stateHash" ~ '^[0-9a-f]{64}$'
    AND "evidenceHash" ~ '^[0-9a-f]{64}$'
    AND ("previousStateHash" IS NULL OR "previousStateHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "supplier_po_proposal_states_lineage_check" CHECK (
    (
      "version" = 1
      AND "status" = 'SUBMITTED'
      AND "actorType" = 'SUPPLIER'
      AND "actorId" IS NULL
      AND "previousStateHash" IS NULL
      AND "reason" IS NULL
    )
    OR (
      "version" = 2
      AND "status" IN ('BUYER_ACCEPTED', 'BUYER_REJECTED')
      AND "actorType" = 'BUYER'
      AND char_length(btrim("actorId")) > 0
      AND "previousStateHash" IS NOT NULL
      AND char_length(btrim("reason")) BETWEEN 3 AND 500
    )
  )
);

CREATE UNIQUE INDEX "supplier_po_envelopes_organizationId_id_key"
  ON "supplier_po_envelopes"("organizationId", "id");
CREATE UNIQUE INDEX "supplier_po_envelopes_po_content_key"
  ON "supplier_po_envelopes"("organizationId", "purchaseOrderId", "contentHash");
CREATE UNIQUE INDEX "supplier_po_envelopes_organizationId_idempotencyKey_key"
  ON "supplier_po_envelopes"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "supplier_po_envelopes_organizationId_correlationId_key"
  ON "supplier_po_envelopes"("organizationId", "correlationId");
CREATE INDEX "supplier_po_envelopes_organizationId_purchaseOrderId_createdAt_idx"
  ON "supplier_po_envelopes"("organizationId", "purchaseOrderId", "createdAt");
CREATE INDEX "supplier_po_envelopes_organizationId_supplierId_createdAt_idx"
  ON "supplier_po_envelopes"("organizationId", "supplierId", "createdAt");

CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_id_key"
  ON "supplier_po_access_tokens"("organizationId", "id");
CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_tokenHash_key"
  ON "supplier_po_access_tokens"("organizationId", "tokenHash");
CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_jtiHash_key"
  ON "supplier_po_access_tokens"("organizationId", "jtiHash");
CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_idempotencyKey_key"
  ON "supplier_po_access_tokens"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_correlationId_key"
  ON "supplier_po_access_tokens"("organizationId", "correlationId");
CREATE UNIQUE INDEX "supplier_po_access_tokens_organizationId_businessEventId_key"
  ON "supplier_po_access_tokens"("organizationId", "businessEventId");
CREATE INDEX "supplier_po_access_tokens_organizationId_envelopeId_status_idx"
  ON "supplier_po_access_tokens"("organizationId", "envelopeId", "status");
CREATE INDEX "supplier_po_access_tokens_organizationId_status_expiresAt_idx"
  ON "supplier_po_access_tokens"("organizationId", "status", "expiresAt");

CREATE INDEX "supplier_po_access_logs_organizationId_envelopeId_occurredAt_idx"
  ON "supplier_po_access_logs"("organizationId", "envelopeId", "occurredAt");
CREATE INDEX "supplier_po_access_logs_organizationId_tokenId_occurredAt_idx"
  ON "supplier_po_access_logs"("organizationId", "tokenId", "occurredAt");

CREATE UNIQUE INDEX "supplier_po_proposals_organizationId_id_key"
  ON "supplier_po_proposals"("organizationId", "id");
CREATE UNIQUE INDEX "supplier_po_proposals_tokenId_key"
  ON "supplier_po_proposals"("tokenId");
CREATE UNIQUE INDEX "supplier_po_proposals_envelope_idempotency_key"
  ON "supplier_po_proposals"("organizationId", "envelopeId", "idempotencyKey");
CREATE UNIQUE INDEX "supplier_po_proposals_organizationId_correlationId_key"
  ON "supplier_po_proposals"("organizationId", "correlationId");
CREATE INDEX "supplier_po_proposals_envelope_type_created_idx"
  ON "supplier_po_proposals"("organizationId", "envelopeId", "proposalType", "createdAt");

CREATE UNIQUE INDEX "supplier_po_proposal_lines_proposal_line_key"
  ON "supplier_po_proposal_lines"("organizationId", "proposalId", "purchaseOrderLineId");
CREATE INDEX "supplier_po_proposal_lines_organizationId_purchaseOrderLineId_idx"
  ON "supplier_po_proposal_lines"("organizationId", "purchaseOrderLineId");

CREATE UNIQUE INDEX "supplier_po_proposal_states_proposal_version_key"
  ON "supplier_po_proposal_states"("organizationId", "proposalId", "version");
CREATE UNIQUE INDEX "supplier_po_proposal_states_organizationId_stateHash_key"
  ON "supplier_po_proposal_states"("organizationId", "stateHash");
CREATE INDEX "supplier_po_proposal_states_organizationId_proposalId_effectiveAt_idx"
  ON "supplier_po_proposal_states"("organizationId", "proposalId", "effectiveAt");

ALTER TABLE "supplier_po_envelopes"
  ADD CONSTRAINT "supplier_po_envelopes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_envelopes"
  ADD CONSTRAINT "supplier_po_envelopes_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_envelopes"
  ADD CONSTRAINT "supplier_po_envelopes_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_po_access_tokens"
  ADD CONSTRAINT "supplier_po_access_tokens_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_access_tokens"
  ADD CONSTRAINT "supplier_po_access_tokens_envelopeId_fkey"
  FOREIGN KEY ("envelopeId") REFERENCES "supplier_po_envelopes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_po_access_logs"
  ADD CONSTRAINT "supplier_po_access_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_access_logs"
  ADD CONSTRAINT "supplier_po_access_logs_envelopeId_fkey"
  FOREIGN KEY ("envelopeId") REFERENCES "supplier_po_envelopes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_access_logs"
  ADD CONSTRAINT "supplier_po_access_logs_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "supplier_po_access_tokens"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_po_proposals"
  ADD CONSTRAINT "supplier_po_proposals_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_proposals"
  ADD CONSTRAINT "supplier_po_proposals_envelopeId_fkey"
  FOREIGN KEY ("envelopeId") REFERENCES "supplier_po_envelopes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_proposals"
  ADD CONSTRAINT "supplier_po_proposals_tokenId_fkey"
  FOREIGN KEY ("tokenId") REFERENCES "supplier_po_access_tokens"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_po_proposal_lines"
  ADD CONSTRAINT "supplier_po_proposal_lines_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_proposal_lines"
  ADD CONSTRAINT "supplier_po_proposal_lines_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "supplier_po_proposals"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_po_proposal_states"
  ADD CONSTRAINT "supplier_po_proposal_states_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_po_proposal_states"
  ADD CONSTRAINT "supplier_po_proposal_states_proposalId_fkey"
  FOREIGN KEY ("proposalId") REFERENCES "supplier_po_proposals"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "supplier_po_access_tokens_guard_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Supplier PO access tokens cannot be deleted';
  END IF;

  IF (
    NEW."organizationId",
    NEW."envelopeId",
    NEW."tokenHash",
    NEW."jtiHash",
    NEW."envelopeContentHash",
    NEW."recipientHash",
    NEW."allowView",
    NEW."allowRespond",
    NEW."idempotencyKey",
    NEW."correlationId",
    NEW."businessEventId",
    NEW."issuedById",
    NEW."issuedAt",
    NEW."expiresAt",
    NEW."metadata",
    NEW."createdAt"
  ) IS DISTINCT FROM (
    OLD."organizationId",
    OLD."envelopeId",
    OLD."tokenHash",
    OLD."jtiHash",
    OLD."envelopeContentHash",
    OLD."recipientHash",
    OLD."allowView",
    OLD."allowRespond",
    OLD."idempotencyKey",
    OLD."correlationId",
    OLD."businessEventId",
    OLD."issuedById",
    OLD."issuedAt",
    OLD."expiresAt",
    OLD."metadata",
    OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'Supplier PO access token identity is immutable';
  END IF;

  IF OLD."status" <> 'ACTIVE' AND NEW."status" <> OLD."status" THEN
    RAISE EXCEPTION 'Terminal supplier PO access token status cannot change';
  END IF;
  IF NEW."accessCount" < OLD."accessCount" THEN
    RAISE EXCEPTION 'Supplier PO access count cannot decrease';
  END IF;
  IF OLD."lastAccessedAt" IS NOT NULL
     AND NEW."lastAccessedAt" < OLD."lastAccessedAt" THEN
    RAISE EXCEPTION 'Supplier PO last access time cannot move backwards';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "supplier_po_append_only_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Supplier PO acknowledgement evidence is append-only';
END;
$$;

CREATE TRIGGER "supplier_po_envelopes_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "supplier_po_envelopes"
FOR EACH ROW EXECUTE FUNCTION "supplier_po_append_only_guard"();

CREATE TRIGGER "supplier_po_access_tokens_guard_mutation_trigger"
BEFORE UPDATE OR DELETE ON "supplier_po_access_tokens"
FOR EACH ROW EXECUTE FUNCTION "supplier_po_access_tokens_guard_mutation"();

CREATE TRIGGER "supplier_po_access_logs_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "supplier_po_access_logs"
FOR EACH ROW EXECUTE FUNCTION "supplier_po_append_only_guard"();

CREATE TRIGGER "supplier_po_proposals_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "supplier_po_proposals"
FOR EACH ROW EXECUTE FUNCTION "supplier_po_append_only_guard"();

CREATE TRIGGER "supplier_po_proposal_lines_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "supplier_po_proposal_lines"
FOR EACH ROW EXECUTE FUNCTION "supplier_po_append_only_guard"();

CREATE TRIGGER "supplier_po_proposal_states_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "supplier_po_proposal_states"
FOR EACH ROW EXECUTE FUNCTION "supplier_po_append_only_guard"();
