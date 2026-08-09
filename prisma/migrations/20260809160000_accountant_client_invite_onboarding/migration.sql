CREATE TYPE "AccountantClientInviteStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'EXPIRED',
  'REVOKED'
);

CREATE TABLE "accountant_client_invites" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "attributionId" TEXT NOT NULL,
  "inviteTokenHash" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "redactedEmail" TEXT NOT NULL,
  "accountantFirmName" TEXT NOT NULL,
  "accountantFirmRegistrationNumber" TEXT,
  "role" "AccountantAccessRole" NOT NULL,
  "consentGrantedById" TEXT NOT NULL,
  "consentGrantedAt" TIMESTAMP(3) NOT NULL,
  "consentEvidenceHash" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "outboxId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accountant_client_invites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accountant_client_invites_token_hash_check" CHECK (
    "inviteTokenHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "accountant_client_invites_email_check" CHECK (
    "emailHash" ~ '^[0-9a-f]{64}$'
    AND length(btrim("redactedEmail")) BETWEEN 3 AND 191
  ),
  CONSTRAINT "accountant_client_invites_consent_check" CHECK (
    "consentEvidenceHash" ~ '^sha256:[0-9a-f]{64}$'
    AND length(btrim("consentGrantedById")) BETWEEN 1 AND 191
    AND "consentGrantedAt" <= "createdAt"
  ),
  CONSTRAINT "accountant_client_invites_time_check" CHECK (
    "expiresAt" > "effectiveFrom"
    AND "expiresAt" > "createdAt"
  ),
  CONSTRAINT "accountant_client_invites_key_check" CHECK (
    length(btrim("idempotencyKey")) BETWEEN 8 AND 191
    AND length(btrim("correlationId")) BETWEEN 8 AND 191
  ),
  CONSTRAINT "accountant_client_invites_evidence_check" CHECK (
    "evidenceHash" ~ '^[0-9a-f]{64}$'
  )
);

CREATE TABLE "accountant_client_invite_states" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "inviteId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "AccountantClientInviteStatus" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "actorId" TEXT,
  "accountantUserId" TEXT,
  "accessGrantId" TEXT,
  "reason" TEXT,
  "previousStateHash" TEXT,
  "stateHash" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "businessEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "accountant_client_invite_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accountant_client_invite_states_version_check" CHECK (
    "version" > 0
  ),
  CONSTRAINT "accountant_client_invite_states_hash_check" CHECK (
    "stateHash" ~ '^[0-9a-f]{64}$'
    AND "evidenceHash" ~ '^[0-9a-f]{64}$'
    AND ("previousStateHash" IS NULL OR "previousStateHash" ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT "accountant_client_invite_states_first_state_check" CHECK (
    "version" > 1 OR ("status" = 'PENDING' AND "previousStateHash" IS NULL)
  ),
  CONSTRAINT "accountant_client_invite_states_acceptance_check" CHECK (
    "status" <> 'ACCEPTED'
    OR ("accountantUserId" IS NOT NULL AND "accessGrantId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "accountant_client_invites_organizationId_id_key"
  ON "accountant_client_invites"("organizationId", "id");
CREATE UNIQUE INDEX "accountant_client_invites_attributionId_key"
  ON "accountant_client_invites"("attributionId");
CREATE UNIQUE INDEX "accountant_client_invites_org_attribution_key"
  ON "accountant_client_invites"("organizationId", "attributionId");
CREATE UNIQUE INDEX "accountant_client_invites_inviteTokenHash_key"
  ON "accountant_client_invites"("inviteTokenHash");
CREATE UNIQUE INDEX "accountant_client_invites_org_idempotency_key"
  ON "accountant_client_invites"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "accountant_client_invites_org_correlation_key"
  ON "accountant_client_invites"("organizationId", "correlationId");
CREATE UNIQUE INDEX "accountant_client_invites_outboxId_key"
  ON "accountant_client_invites"("outboxId");
CREATE INDEX "accountant_client_invites_email_expiry_idx"
  ON "accountant_client_invites"("organizationId", "emailHash", "expiresAt");
CREATE INDEX "accountant_client_invites_created_idx"
  ON "accountant_client_invites"("organizationId", "createdAt");

CREATE UNIQUE INDEX "accountant_client_invite_states_identity_key"
  ON "accountant_client_invite_states"("organizationId", "inviteId", "version");
CREATE UNIQUE INDEX "accountant_client_invite_states_hash_key"
  ON "accountant_client_invite_states"("organizationId", "stateHash");
CREATE INDEX "accountant_client_invite_states_timeline_idx"
  ON "accountant_client_invite_states"("organizationId", "inviteId", "occurredAt");
CREATE INDEX "accountant_client_invite_states_user_status_idx"
  ON "accountant_client_invite_states"("accountantUserId", "status", "occurredAt");

ALTER TABLE "accountant_client_invites"
  ADD CONSTRAINT "accountant_client_invites_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accountant_client_invites"
  ADD CONSTRAINT "accountant_client_invites_attributionId_fkey"
  FOREIGN KEY ("organizationId", "attributionId")
  REFERENCES "referral_attributions"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accountant_client_invites"
  ADD CONSTRAINT "accountant_client_invites_businessEventId_fkey"
  FOREIGN KEY ("businessEventId") REFERENCES "business_events"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accountant_client_invites"
  ADD CONSTRAINT "accountant_client_invites_outboxId_fkey"
  FOREIGN KEY ("outboxId") REFERENCES "business_event_outbox"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "accountant_client_invite_states"
  ADD CONSTRAINT "accountant_client_invite_states_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accountant_client_invite_states"
  ADD CONSTRAINT "accountant_client_invite_states_inviteId_fkey"
  FOREIGN KEY ("organizationId", "inviteId")
  REFERENCES "accountant_client_invites"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "accountant_client_invite_append_only_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Accountant client invitation evidence is append-only';
END;
$$;

CREATE TRIGGER "accountant_client_invites_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "accountant_client_invites"
FOR EACH ROW EXECUTE FUNCTION "accountant_client_invite_append_only_guard"();

CREATE TRIGGER "accountant_client_invite_states_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "accountant_client_invite_states"
FOR EACH ROW EXECUTE FUNCTION "accountant_client_invite_append_only_guard"();
