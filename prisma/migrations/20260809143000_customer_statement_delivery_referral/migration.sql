CREATE TYPE "ReferralAttributionSource" AS ENUM (
  'CUSTOMER_STATEMENT',
  'ACCOUNTANT_INVITE'
);

CREATE TYPE "ReferralAttributionEventType" AS ENUM (
  'IMPRESSION',
  'CLICK',
  'CONVERSION'
);

CREATE TYPE "CustomerStatementDeliveryChannel" AS ENUM (
  'EMAIL',
  'WHATSAPP'
);

CREATE TYPE "CustomerStatementDeliveryStatus" AS ENUM (
  'QUEUED',
  'SENT',
  'DEFERRED',
  'FAILED',
  'DEAD_LETTER',
  'CANCELLED'
);

CREATE TYPE "CustomerStatementConsentBasis" AS ENUM (
  'EXPLICIT',
  'RECIPIENT_REQUESTED'
);

CREATE TABLE "referral_attributions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "statementSnapshotId" TEXT,
  "sourceType" "ReferralAttributionSource" NOT NULL,
  "sourceId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "channel" TEXT,
  "createdById" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referral_attributions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "referral_attributions_source_check" CHECK (
    ("sourceType" = 'CUSTOMER_STATEMENT' AND "statementSnapshotId" IS NOT NULL AND "sourceId" = "statementSnapshotId")
    OR "sourceType" = 'ACCOUNTANT_INVITE'
  ),
  CONSTRAINT "referral_attributions_code_check" CHECK (
    "referralCode" ~ '^[A-Za-z0-9_-]{12,64}$'
  ),
  CONSTRAINT "referral_attributions_text_check" CHECK (
    length(btrim("sourceId")) BETWEEN 1 AND 191
    AND length(btrim("campaign")) BETWEEN 1 AND 120
    AND length(btrim("createdById")) BETWEEN 1 AND 191
  ),
  CONSTRAINT "referral_attributions_hash_check" CHECK (
    "evidenceHash" ~ '^[0-9a-f]{64}$'
  )
);

CREATE TABLE "referral_attribution_events" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "attributionId" TEXT NOT NULL,
  "targetOrganizationId" TEXT,
  "eventType" "ReferralAttributionEventType" NOT NULL,
  "sourceEventKey" TEXT NOT NULL,
  "subjectHash" TEXT,
  "payloadHash" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "referral_attribution_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "referral_attribution_events_key_check" CHECK (
    length(btrim("sourceEventKey")) BETWEEN 1 AND 191
  ),
  CONSTRAINT "referral_attribution_events_hash_check" CHECK (
    "payloadHash" ~ '^[0-9a-f]{64}$'
    AND ("subjectHash" IS NULL OR "subjectHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "referral_attribution_events_metadata_check" CHECK (
    "metadata" IS NULL OR jsonb_typeof("metadata") = 'object'
  )
);

ALTER TABLE "customer_statement_access_tokens"
  ADD COLUMN "referralAttributionId" TEXT;

CREATE TABLE "customer_statement_deliveries" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "statementSnapshotId" TEXT NOT NULL,
  "tokenId" TEXT NOT NULL,
  "attributionId" TEXT NOT NULL,
  "channel" "CustomerStatementDeliveryChannel" NOT NULL,
  "destinationHash" TEXT NOT NULL,
  "redactedDestination" TEXT NOT NULL,
  "consentBasis" "CustomerStatementConsentBasis" NOT NULL,
  "consentEvidenceHash" TEXT NOT NULL,
  "consentCapturedAt" TIMESTAMP(3) NOT NULL,
  "consentCapturedById" TEXT NOT NULL,
  "statementContentHash" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "outboxId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_statement_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_statement_deliveries_destination_check" CHECK (
    "destinationHash" ~ '^sha256:[0-9a-f]{64}$'
    AND length(btrim("redactedDestination")) BETWEEN 3 AND 191
  ),
  CONSTRAINT "customer_statement_deliveries_consent_check" CHECK (
    "consentEvidenceHash" ~ '^sha256:[0-9a-f]{64}$'
    AND length(btrim("consentCapturedById")) BETWEEN 1 AND 191
    AND "consentCapturedAt" <= "createdAt"
  ),
  CONSTRAINT "customer_statement_deliveries_hash_check" CHECK (
    "statementContentHash" ~ '^[0-9a-f]{64}$'
    AND "payloadHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "customer_statement_deliveries_key_check" CHECK (
    length(btrim("idempotencyKey")) BETWEEN 8 AND 191
    AND length(btrim("correlationId")) BETWEEN 8 AND 191
  ),
  CONSTRAINT "customer_statement_deliveries_locale_check" CHECK (
    "locale" IN ('EN', 'FR')
  )
);

CREATE TABLE "customer_statement_delivery_states" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "CustomerStatementDeliveryStatus" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "providerReferenceHash" TEXT,
  "errorCode" TEXT,
  "previousStateHash" TEXT,
  "stateHash" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "businessEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_statement_delivery_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_statement_delivery_states_version_check" CHECK (
    "version" > 0
  ),
  CONSTRAINT "customer_statement_delivery_states_hash_check" CHECK (
    "stateHash" ~ '^[0-9a-f]{64}$'
    AND "evidenceHash" ~ '^[0-9a-f]{64}$'
    AND ("previousStateHash" IS NULL OR "previousStateHash" ~ '^[0-9a-f]{64}$')
    AND ("providerReferenceHash" IS NULL OR "providerReferenceHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "customer_statement_delivery_states_first_state_check" CHECK (
    "version" > 1 OR ("status" = 'QUEUED' AND "previousStateHash" IS NULL)
  )
);

CREATE UNIQUE INDEX "referral_attributions_organizationId_id_key"
  ON "referral_attributions"("organizationId", "id");
CREATE UNIQUE INDEX "referral_attributions_referralCode_key"
  ON "referral_attributions"("referralCode");
CREATE INDEX "referral_attributions_source_idx"
  ON "referral_attributions"("organizationId", "sourceType", "sourceId");
CREATE INDEX "referral_attributions_campaign_idx"
  ON "referral_attributions"("organizationId", "campaign", "createdAt");

CREATE UNIQUE INDEX "referral_attribution_events_identity_key"
  ON "referral_attribution_events"("organizationId", "attributionId", "eventType", "sourceEventKey");
CREATE INDEX "referral_attribution_events_funnel_idx"
  ON "referral_attribution_events"("organizationId", "eventType", "occurredAt");
CREATE INDEX "referral_attribution_events_conversion_idx"
  ON "referral_attribution_events"("targetOrganizationId", "eventType");

CREATE UNIQUE INDEX "customer_statement_deliveries_organizationId_id_key"
  ON "customer_statement_deliveries"("organizationId", "id");
CREATE UNIQUE INDEX "customer_statement_deliveries_statement_idempotency_key"
  ON "customer_statement_deliveries"("organizationId", "statementSnapshotId", "idempotencyKey");
CREATE UNIQUE INDEX "customer_statement_deliveries_organizationId_correlationId_key"
  ON "customer_statement_deliveries"("organizationId", "correlationId");
CREATE UNIQUE INDEX "customer_statement_deliveries_outboxId_key"
  ON "customer_statement_deliveries"("outboxId");
CREATE INDEX "customer_statement_deliveries_statement_channel_idx"
  ON "customer_statement_deliveries"("organizationId", "statementSnapshotId", "channel", "createdAt");
CREATE INDEX "customer_statement_deliveries_destination_idx"
  ON "customer_statement_deliveries"("organizationId", "destinationHash", "createdAt");

CREATE UNIQUE INDEX "customer_statement_delivery_states_identity_key"
  ON "customer_statement_delivery_states"("organizationId", "deliveryId", "version");
CREATE UNIQUE INDEX "customer_statement_delivery_states_hash_key"
  ON "customer_statement_delivery_states"("organizationId", "stateHash");
CREATE INDEX "customer_statement_delivery_states_timeline_idx"
  ON "customer_statement_delivery_states"("organizationId", "deliveryId", "occurredAt");

ALTER TABLE "referral_attributions"
  ADD CONSTRAINT "referral_attributions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_attributions"
  ADD CONSTRAINT "referral_attributions_statementSnapshotId_fkey"
  FOREIGN KEY ("organizationId", "statementSnapshotId")
  REFERENCES "customer_statement_snapshots"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "referral_attribution_events"
  ADD CONSTRAINT "referral_attribution_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_attribution_events"
  ADD CONSTRAINT "referral_attribution_events_attributionId_fkey"
  FOREIGN KEY ("organizationId", "attributionId")
  REFERENCES "referral_attributions"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_attribution_events"
  ADD CONSTRAINT "referral_attribution_events_targetOrganizationId_fkey"
  FOREIGN KEY ("targetOrganizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_statement_access_tokens"
  ADD CONSTRAINT "customer_statement_access_tokens_referralAttributionId_fkey"
  FOREIGN KEY ("organizationId", "referralAttributionId")
  REFERENCES "referral_attributions"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_statement_deliveries"
  ADD CONSTRAINT "customer_statement_deliveries_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_deliveries"
  ADD CONSTRAINT "customer_statement_deliveries_statementSnapshotId_fkey"
  FOREIGN KEY ("organizationId", "statementSnapshotId")
  REFERENCES "customer_statement_snapshots"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_deliveries"
  ADD CONSTRAINT "customer_statement_deliveries_tokenId_fkey"
  FOREIGN KEY ("organizationId", "tokenId")
  REFERENCES "customer_statement_access_tokens"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_deliveries"
  ADD CONSTRAINT "customer_statement_deliveries_attributionId_fkey"
  FOREIGN KEY ("organizationId", "attributionId")
  REFERENCES "referral_attributions"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_deliveries"
  ADD CONSTRAINT "customer_statement_deliveries_businessEventId_fkey"
  FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_deliveries"
  ADD CONSTRAINT "customer_statement_deliveries_outboxId_fkey"
  FOREIGN KEY ("outboxId") REFERENCES "business_event_outbox"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_statement_delivery_states"
  ADD CONSTRAINT "customer_statement_delivery_states_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_delivery_states"
  ADD CONSTRAINT "customer_statement_delivery_states_deliveryId_fkey"
  FOREIGN KEY ("organizationId", "deliveryId")
  REFERENCES "customer_statement_deliveries"("organizationId", "id")
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
    NEW."referralAttributionId",
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
    OLD."referralAttributionId",
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

CREATE OR REPLACE FUNCTION "customer_statement_delivery_referral_append_only_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Customer statement delivery and referral evidence is append-only';
END;
$$;

CREATE TRIGGER "referral_attributions_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "referral_attributions"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_delivery_referral_append_only_guard"();

CREATE TRIGGER "referral_attribution_events_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "referral_attribution_events"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_delivery_referral_append_only_guard"();

CREATE TRIGGER "customer_statement_deliveries_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_statement_deliveries"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_delivery_referral_append_only_guard"();

CREATE TRIGGER "customer_statement_delivery_states_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_statement_delivery_states"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_delivery_referral_append_only_guard"();
