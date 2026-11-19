CREATE TABLE "firm_practice_revisions" (
  "id" TEXT PRIMARY KEY, "engagementId" TEXT NOT NULL,
  "firmOrganizationId" TEXT NOT NULL, "clientOrganizationId" TEXT NOT NULL, "periodId" TEXT NOT NULL,
  "recordKey" TEXT NOT NULL, "version" INTEGER NOT NULL CHECK ("version" > 0),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('PLAN','EFFORT','FEE')),
  "operation" TEXT NOT NULL CHECK ("operation" IN ('SAVE','REVIEW')),
  "subjectUserId" TEXT, "recordedById" TEXT NOT NULL, "actorId" TEXT NOT NULL, "reviewedById" TEXT,
  "payload" JSONB NOT NULL, "contentHash" TEXT NOT NULL, "reason" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "commandHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "practice_engagement_fk" FOREIGN KEY ("engagementId", "firmOrganizationId", "clientOrganizationId")
    REFERENCES "firm_engagements"("id", "firmOrganizationId", "clientOrganizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "practice_period_fk" FOREIGN KEY ("clientOrganizationId", "periodId") REFERENCES "accounting_periods"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "practice_actor_fk" FOREIGN KEY ("actorId", "firmOrganizationId") REFERENCES "users"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "practice_subject_fk" FOREIGN KEY ("subjectUserId", "firmOrganizationId") REFERENCES "users"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "practice_recorder_fk" FOREIGN KEY ("recordedById", "firmOrganizationId") REFERENCES "users"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "practice_reviewer_fk" FOREIGN KEY ("reviewedById", "firmOrganizationId") REFERENCES "users"("id", "organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK ("payload"->>'kind' = "kind"),
  CHECK (("operation" = 'SAVE' AND "reviewedById" IS NULL) OR ("operation" = 'REVIEW' AND "reviewedById" = "actorId" AND "reviewedById" <> "recordedById")),
  CHECK ("kind" <> 'EFFORT' OR "subjectUserId" = "recordedById"),
  CHECK ("kind" <> 'FEE' OR "subjectUserId" IS NULL)
);
CREATE UNIQUE INDEX "practice_record_version_key" ON "firm_practice_revisions"("engagementId", "periodId", "recordKey", "version");
CREATE UNIQUE INDEX "practice_idempotency_key" ON "firm_practice_revisions"("engagementId", "periodId", "idempotencyKey");
CREATE INDEX "practice_scope_idx" ON "firm_practice_revisions"("firmOrganizationId", "clientOrganizationId", "periodId");
CREATE FUNCTION prevent_firm_practice_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Practice revisions are retained; append a correction'; END $$;
CREATE TRIGGER firm_practice_revision_immutable BEFORE UPDATE OR DELETE ON "firm_practice_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_firm_practice_revision_mutation();
