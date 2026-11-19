-- Additive coordination only. No business records are backfilled or modified.
CREATE TABLE "command_center_occurrences" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "logicalKey" TEXT NOT NULL, "sourceKey" TEXT NOT NULL, "sourceRefs" JSONB NOT NULL, "scopeKey" TEXT NOT NULL, "windowKey" TEXT NOT NULL,
 "episode" INTEGER NOT NULL CHECK ("episode">0), "sourceRevision" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision">0),
 "condition" TEXT NOT NULL CHECK ("condition" IN ('ACTIVE','CLEAR','UNKNOWN')),
 "coordination" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("coordination" IN ('OPEN','ASSIGNED','WAITING','REVIEWED')),
 "ownerId" TEXT, "dueAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);
CREATE UNIQUE INDEX "cc_occurrence_episode_key" ON "command_center_occurrences"("organizationId","logicalKey","episode");
CREATE INDEX "cc_occurrence_scope_idx" ON "command_center_occurrences"("organizationId","scopeKey","windowKey");
CREATE TABLE "command_center_events" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "occurrenceId" TEXT NOT NULL, "actorId" TEXT NOT NULL, "requestId" TEXT, "intentHash" TEXT, "type" TEXT NOT NULL,
 "resultRevision" INTEGER NOT NULL, "changes" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);
CREATE UNIQUE INDEX "cc_event_request_key" ON "command_center_events"("organizationId","actorId","requestId");
CREATE INDEX "cc_event_history_idx" ON "command_center_events"("organizationId","occurrenceId","createdAt");
CREATE TABLE "command_center_review_states" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" TEXT NOT NULL, "scopeKey" TEXT NOT NULL, "periodKey" TEXT NOT NULL, "evidenceKey" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);
CREATE UNIQUE INDEX "cc_review_scope_key" ON "command_center_review_states"("organizationId","actorId","scopeKey","periodKey");
CREATE TABLE "command_center_review_receipts" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" TEXT NOT NULL, "stateId" TEXT NOT NULL, "revision" INTEGER NOT NULL, "evidenceKey" TEXT NOT NULL,
 "center" TEXT NOT NULL, "requestId" TEXT NOT NULL, "intentHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);
CREATE UNIQUE INDEX "cc_receipt_request_key" ON "command_center_review_receipts"("organizationId","actorId","requestId");
CREATE INDEX "cc_receipt_revision_idx" ON "command_center_review_receipts"("organizationId","stateId","revision");
-- Receipts and events retain attributable history. UI rollback never deletes them.
CREATE FUNCTION "command_center_history_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Command Center history is immutable'; END $$;
CREATE TRIGGER "command_center_events_immutable" BEFORE UPDATE OR DELETE ON "command_center_events" FOR EACH ROW EXECUTE FUNCTION "command_center_history_immutable"();
CREATE TRIGGER "command_center_review_receipts_immutable" BEFORE UPDATE OR DELETE ON "command_center_review_receipts" FOR EACH ROW EXECUTE FUNCTION "command_center_history_immutable"();

CREATE UNIQUE INDEX "command_center_occurrences_organizationId_id_key" ON "command_center_occurrences"("organizationId","id");
ALTER TABLE "command_center_events" ADD CONSTRAINT "cc_event_occurrence_fk" FOREIGN KEY ("organizationId","occurrenceId") REFERENCES "command_center_occurrences"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "command_center_review_states_organizationId_id_actorId_key" ON "command_center_review_states"("organizationId","id","actorId");
ALTER TABLE "command_center_review_receipts" ADD CONSTRAINT "cc_receipt_state_fk" FOREIGN KEY ("organizationId","stateId","actorId") REFERENCES "command_center_review_states"("organizationId","id","actorId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- In-app delivery only. No email, webhook, worker or scheduler is enabled.
CREATE TABLE "command_center_notices" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "occurrenceId" TEXT NOT NULL, "recipientId" TEXT NOT NULL, "transitionRevision" INTEGER NOT NULL, "sourceKey" TEXT NOT NULL,
 "state" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("state" IN ('PENDING','PUBLISHED','READ')),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'), "publishedAt" TIMESTAMP(3), "readAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "cc_notice_transition_key" ON "command_center_notices"("organizationId","occurrenceId","recipientId","transitionRevision");
CREATE INDEX "cc_notice_recipient_idx" ON "command_center_notices"("organizationId","recipientId","state");
CREATE TABLE "command_center_preferences" (
 "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "actorId" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
 "quietStart" INTEGER CHECK ("quietStart" BETWEEN 0 AND 23), "quietEnd" INTEGER CHECK ("quietEnd" BETWEEN 0 AND 23),
 CHECK (("quietStart" IS NULL)=("quietEnd" IS NULL))
);
CREATE UNIQUE INDEX "cc_preference_actor_key" ON "command_center_preferences"("organizationId","actorId");

ALTER TABLE "command_center_notices" ADD CONSTRAINT "cc_notice_occurrence_fk" FOREIGN KEY ("organizationId","occurrenceId") REFERENCES "command_center_occurrences"("organizationId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
