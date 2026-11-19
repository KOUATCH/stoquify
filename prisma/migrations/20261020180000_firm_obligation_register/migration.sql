CREATE TABLE "firm_obligation_revisions" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
  "instanceId" TEXT NOT NULL, "version" INTEGER NOT NULL CHECK ("version" > 0),
  "code" TEXT NOT NULL CHECK ("code" IN ('CLOSE_EVIDENCE_COLLECTION','CM_VAT_MONTHLY','CM_CNPS_EVIDENCE')),
  "periodId" TEXT NOT NULL REFERENCES "accounting_periods"("id") ON DELETE RESTRICT,
  "countryCode" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "applicability" TEXT NOT NULL CHECK ("applicability" IN ('UNKNOWN','APPLICABLE','NOT_APPLICABLE')),
  "dueAt" TIMESTAMP(3), "sourceHash" TEXT NOT NULL, "sourceSnapshot" JSONB NOT NULL,
  "evidenceId" TEXT, "evidenceHash" TEXT,
  "decision" TEXT NOT NULL CHECK ("decision" IN ('PREPARED','REVIEWED','CHANGES_REQUESTED')),
  "actorId" TEXT NOT NULL, "reason" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL,
  "commandHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "firm_obligation_evidence_pair" CHECK (("evidenceId" IS NULL) = ("evidenceHash" IS NULL))
);
CREATE UNIQUE INDEX "firm_obligation_revisions_organizationId_instanceId_version_key" ON "firm_obligation_revisions"("organizationId","instanceId","version");
CREATE UNIQUE INDEX "firm_obligation_revisions_organizationId_idempotencyKey_key" ON "firm_obligation_revisions"("organizationId","idempotencyKey");
CREATE INDEX "firm_obligation_revisions_organizationId_periodId_createdAt_idx" ON "firm_obligation_revisions"("organizationId","periodId","createdAt");
CREATE FUNCTION guard_firm_obligation_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior "firm_obligation_revisions"%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Obligation revisions are retained and immutable'; END IF;
  IF NOT EXISTS (SELECT 1 FROM accounting_periods WHERE id=NEW."periodId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'Obligation period tenant mismatch'; END IF;
  IF NEW.version=1 THEN
    IF NEW.decision <> 'PREPARED' THEN RAISE EXCEPTION 'Prepare before review'; END IF;
  ELSE
    SELECT * INTO prior FROM firm_obligation_revisions WHERE "organizationId"=NEW."organizationId" AND "instanceId"=NEW."instanceId" AND version=NEW.version-1;
    IF NOT FOUND OR prior.code<>NEW.code OR prior."periodId"<>NEW."periodId" THEN RAISE EXCEPTION 'Invalid obligation revision chain'; END IF;
    IF NEW.decision IN ('REVIEWED','CHANGES_REQUESTED') AND (prior.decision<>'PREPARED' OR prior."actorId"=NEW."actorId") THEN RAISE EXCEPTION 'Independent review of the latest preparation required'; END IF;
    IF NEW.decision='REVIEWED' AND (NEW."evidenceId" IS NULL OR NEW."evidenceId" IS DISTINCT FROM prior."evidenceId" OR NEW."evidenceHash" IS DISTINCT FROM prior."evidenceHash" OR NEW."sourceHash"<>prior."sourceHash" OR NEW."dueAt" IS DISTINCT FROM prior."dueAt" OR NEW.applicability<>prior.applicability OR NEW."ownerId"<>prior."ownerId") THEN RAISE EXCEPTION 'Review must preserve prepared evidence and terms'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER firm_obligation_revision_retention BEFORE INSERT OR UPDATE OR DELETE ON firm_obligation_revisions FOR EACH ROW EXECUTE FUNCTION guard_firm_obligation_revision();
