CREATE TABLE "firm_advisory_revisions" (
  "id" TEXT PRIMARY KEY, "engagementId" TEXT NOT NULL,
  "firmOrganizationId" TEXT NOT NULL, "clientOrganizationId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL, "version" INTEGER NOT NULL CHECK ("version" > 0),
  "state" TEXT NOT NULL CHECK ("state" IN ('DRAFT','REVIEWED','CHANGES_REQUESTED','CLIENT_AGREED','DELIVERED')),
  "sourceHash" TEXT NOT NULL, "reviewHash" TEXT NOT NULL, "document" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL, "privateNote" TEXT NOT NULL,
  "actorId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  "reason" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "commandHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("engagementId", "firmOrganizationId", "clientOrganizationId")
    REFERENCES "firm_engagements"("id", "firmOrganizationId", "clientOrganizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  FOREIGN KEY ("clientOrganizationId", "periodId") REFERENCES "accounting_periods"("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "firm_advisory_revisions_engagementId_periodId_version_key" ON "firm_advisory_revisions"("engagementId", "periodId", "version");
CREATE UNIQUE INDEX "firm_advisory_revisions_engagementId_periodId_idempotencyKey_key" ON "firm_advisory_revisions"("engagementId", "periodId", "idempotencyKey");
CREATE INDEX "firm_advisory_revisions_firmOrganizationId_clientOrganizationId_periodId_idx" ON "firm_advisory_revisions"("firmOrganizationId", "clientOrganizationId", "periodId");
CREATE FUNCTION prevent_firm_advisory_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Advisory revisions are retained evidence; append a new revision'; END $$;
CREATE TRIGGER firm_advisory_revision_immutable BEFORE UPDATE OR DELETE ON "firm_advisory_revisions"
FOR EACH ROW EXECUTE FUNCTION prevent_firm_advisory_revision_mutation();
