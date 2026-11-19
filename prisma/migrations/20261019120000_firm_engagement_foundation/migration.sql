-- AF03: additive dormant foundation. No consent, staff, permission or data backfill.
-- The revoked-only enrollment fence must remain until AF04 readers are deployed.
BEGIN;
CREATE TYPE "FirmEngagementStatus" AS ENUM ('DRAFT','ACTIVE','SUSPENDED','ENDED');
CREATE UNIQUE INDEX "users_id_organizationId_key" ON users(id,"organizationId");
CREATE UNIQUE INDEX "accountant_grant_identity_key" ON accountant_access_grants(id,"organizationId","accountantUserId");

CREATE TABLE firm_engagements (
  id TEXT PRIMARY KEY, "firmOrganizationId" TEXT NOT NULL, "clientOrganizationId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL, "createdById" TEXT NOT NULL, scope "AccountantAccessRole" NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  status "FirmEngagementStatus" NOT NULL DEFAULT 'DRAFT', version INTEGER NOT NULL DEFAULT 0,
  "lastTransitionId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT firm_engagement_identity_key UNIQUE(id,"firmOrganizationId","clientOrganizationId"),
  CONSTRAINT "firm_engagements_firmOrganizationId_fkey" FOREIGN KEY ("firmOrganizationId") REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagements_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagements_ownerUserId_firmOrganizationId_fkey" FOREIGN KEY ("ownerUserId","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagements_createdById_firmOrganizationId_fkey" FOREIGN KEY ("createdById","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK ("firmOrganizationId" <> "clientOrganizationId"), CHECK ("expiresAt" > "effectiveFrom"), CHECK (version >= 0)
);
CREATE UNIQUE INDEX firm_engagement_open_identity ON firm_engagements("firmOrganizationId","clientOrganizationId") WHERE status <> 'ENDED';
CREATE INDEX "firm_engagements_firmOrganizationId_status_expiresAt_idx" ON firm_engagements("firmOrganizationId",status,"expiresAt");
CREATE INDEX "firm_engagements_clientOrganizationId_status_idx" ON firm_engagements("clientOrganizationId",status);

CREATE TABLE firm_engagement_assignments (
  id TEXT PRIMARY KEY, "engagementId" TEXT NOT NULL, "firmOrganizationId" TEXT NOT NULL, "clientOrganizationId" TEXT NOT NULL,
  "accountantUserId" TEXT NOT NULL, "createdById" TEXT NOT NULL, version INTEGER NOT NULL CHECK(version > 0),
  scope "AccountantAccessRole" NOT NULL, "effectiveFrom" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3), "endedById" TEXT, "endReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT firm_assignment_version_key UNIQUE("engagementId","accountantUserId",version),
  CONSTRAINT "firm_engagement_assignments_engagementId_firmOrganizationI_fkey" FOREIGN KEY ("engagementId","firmOrganizationId","clientOrganizationId") REFERENCES firm_engagements(id,"firmOrganizationId","clientOrganizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagement_assignments_accountantUserId_firmOrganizat_fkey" FOREIGN KEY ("accountantUserId","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagement_assignments_createdById_firmOrganizationId_fkey" FOREIGN KEY ("createdById","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagement_assignments_endedById_firmOrganizationId_fkey" FOREIGN KEY ("endedById","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK ("expiresAt" > "effectiveFrom"), CHECK ("endedAt" IS NULL OR "endedAt" >= "createdAt"),
  CHECK (("endedAt" IS NULL AND "endedById" IS NULL AND "endReason" IS NULL) OR
    ("endedAt" IS NOT NULL AND "endedById" IS NOT NULL AND "endReason" IS NOT NULL AND length(trim("endReason")) BETWEEN 10 AND 500))
);
CREATE UNIQUE INDEX firm_assignment_current_identity ON firm_engagement_assignments("engagementId","accountantUserId") WHERE "endedAt" IS NULL;
CREATE INDEX "firm_engagement_assignments_firmOrganizationId_accountantUs_idx" ON firm_engagement_assignments("firmOrganizationId","accountantUserId","endedAt");

CREATE TABLE firm_engagement_grant_links (
  id TEXT PRIMARY KEY, "engagementId" TEXT NOT NULL, "firmOrganizationId" TEXT NOT NULL, "clientOrganizationId" TEXT NOT NULL,
  "grantId" TEXT NOT NULL, "accountantUserId" TEXT NOT NULL, "enrolledById" TEXT NOT NULL,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "firm_engagement_grant_links_engagementId_firmOrganizationI_fkey" FOREIGN KEY ("engagementId","firmOrganizationId","clientOrganizationId") REFERENCES firm_engagements(id,"firmOrganizationId","clientOrganizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagement_grant_links_grantId_clientOrganizationId_a_fkey" FOREIGN KEY ("grantId","clientOrganizationId","accountantUserId") REFERENCES accountant_access_grants(id,"organizationId","accountantUserId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagement_grant_links_accountantUserId_firmOrganizat_fkey" FOREIGN KEY ("accountantUserId","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagement_grant_links_enrolledById_firmOrganizationI_fkey" FOREIGN KEY ("enrolledById","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "firm_engagement_grant_links_grantId_key" ON firm_engagement_grant_links("grantId");
CREATE UNIQUE INDEX firm_link_grant_identity_key ON firm_engagement_grant_links("grantId","clientOrganizationId","accountantUserId");
CREATE INDEX "firm_engagement_grant_links_firmOrganizationId_engagementId_idx" ON firm_engagement_grant_links("firmOrganizationId","engagementId","accountantUserId");

CREATE TABLE firm_engagement_transitions (
  id TEXT PRIMARY KEY, "engagementId" TEXT NOT NULL, "firmOrganizationId" TEXT NOT NULL, "clientOrganizationId" TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version > 0), "fromStatus" "FirmEngagementStatus" NOT NULL, "toStatus" "FirmEngagementStatus" NOT NULL,
  "actorId" TEXT NOT NULL, reason TEXT NOT NULL CHECK(length(trim(reason)) BETWEEN 10 AND 500),
  "idempotencyKey" TEXT NOT NULL CHECK(length(trim("idempotencyKey")) BETWEEN 8 AND 191), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT firm_transition_version_key UNIQUE("engagementId",version),
  CONSTRAINT firm_transition_idempotency_key UNIQUE("engagementId","idempotencyKey"),
  CONSTRAINT "firm_engagement_transitions_engagementId_firmOrganizationI_fkey" FOREIGN KEY ("engagementId","firmOrganizationId","clientOrganizationId") REFERENCES firm_engagements(id,"firmOrganizationId","clientOrganizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "firm_engagement_transitions_actorId_firmOrganizationId_fkey" FOREIGN KEY ("actorId","firmOrganizationId") REFERENCES users(id,"organizationId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CHECK (("fromStatus"='DRAFT' AND "toStatus" IN ('ACTIVE','ENDED')) OR
    ("fromStatus"='ACTIVE' AND "toStatus" IN ('SUSPENDED','ENDED')) OR
    ("fromStatus"='SUSPENDED' AND "toStatus" IN ('ACTIVE','ENDED')))
);
CREATE INDEX "firm_engagement_transitions_firmOrganizationId_engagementId_idx" ON firm_engagement_transitions("firmOrganizationId","engagementId","createdAt");

CREATE FUNCTION retain_firm_engagement_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Firm engagement history and enrollment links must be retained unchanged'; END $$;
CREATE TRIGGER firm_link_retention BEFORE UPDATE OR DELETE ON firm_engagement_grant_links FOR EACH ROW EXECUTE FUNCTION retain_firm_engagement_history();
CREATE TRIGGER firm_transition_retention BEFORE UPDATE OR DELETE ON firm_engagement_transitions FOR EACH ROW EXECUTE FUNCTION retain_firm_engagement_history();

CREATE FUNCTION guard_firm_engagement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE receipt firm_engagement_transitions%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Firm engagement must be retained'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status <> 'DRAFT' OR NEW.version <> 0 OR NEW."lastTransitionId" IS NOT NULL THEN RAISE EXCEPTION 'Engagement must start as draft version zero'; END IF;
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW)-ARRAY['status','version','lastTransitionId','updatedAt']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['status','version','lastTransitionId','updatedAt']) THEN RAISE EXCEPTION 'Engagement terms are immutable; end and replace'; END IF;
  IF NEW.status = OLD.status THEN
    IF (NEW.version,NEW."lastTransitionId") IS DISTINCT FROM (OLD.version,OLD."lastTransitionId") THEN RAISE EXCEPTION 'Version requires state change'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO receipt FROM firm_engagement_transitions WHERE id=NEW."lastTransitionId" AND "engagementId"=OLD.id;
  IF NOT FOUND OR receipt.version <> OLD.version+1 OR NEW.version <> receipt.version OR
    receipt."fromStatus" <> OLD.status OR receipt."toStatus" <> NEW.status THEN RAISE EXCEPTION 'Matching transition receipt required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER firm_engagement_guard BEFORE INSERT OR UPDATE OR DELETE ON firm_engagements FOR EACH ROW EXECUTE FUNCTION guard_firm_engagement();

-- Lock the aggregate before claiming a version. Deferred check disallows orphan receipts.
CREATE FUNCTION guard_firm_transition_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_row firm_engagements%ROWTYPE;
BEGIN
  SELECT * INTO current_row FROM firm_engagements WHERE id=NEW."engagementId" FOR UPDATE;
  IF NOT FOUND OR NEW.version <> current_row.version+1 OR NEW."fromStatus" <> current_row.status THEN RAISE EXCEPTION 'Stale engagement transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER firm_transition_insert BEFORE INSERT ON firm_engagement_transitions FOR EACH ROW EXECUTE FUNCTION guard_firm_transition_insert();
CREATE FUNCTION require_applied_firm_transition() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM firm_engagements WHERE id=NEW."engagementId" AND version >= NEW.version) THEN RAISE EXCEPTION 'Transition receipt was not applied'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER firm_transition_applied AFTER INSERT ON firm_engagement_transitions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_applied_firm_transition();

CREATE FUNCTION guard_firm_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE engagement firm_engagements%ROWTYPE; previous firm_engagement_assignments%ROWTYPE;
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Assignment history must be retained'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD."endedAt" IS NOT NULL OR NEW."endedAt" IS NULL OR
      (to_jsonb(NEW)-ARRAY['endedAt','endedById','endReason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['endedAt','endedById','endReason']) THEN RAISE EXCEPTION 'Assignment can only be ended once'; END IF;
    RETURN NEW;
  END IF;
  SELECT * INTO engagement FROM firm_engagements WHERE id=NEW."engagementId" FOR UPDATE;
  IF NOT FOUND OR engagement.status='ENDED' OR NEW."effectiveFrom" < engagement."effectiveFrom" OR NEW."expiresAt" > engagement."expiresAt" OR
    (engagement.scope='READ_ONLY' AND NEW.scope <> 'READ_ONLY') OR NEW."endedAt" IS NOT NULL THEN RAISE EXCEPTION 'Invalid assignment scope or window'; END IF;
  SELECT * INTO previous FROM firm_engagement_assignments WHERE "engagementId"=NEW."engagementId" AND "accountantUserId"=NEW."accountantUserId" ORDER BY version DESC LIMIT 1;
  IF (FOUND AND (previous."endedAt" IS NULL OR NEW.version <> previous.version+1 OR NEW."effectiveFrom" < LEAST(previous."expiresAt",previous."endedAt"))) OR
    (NOT FOUND AND NEW.version <> 1) THEN RAISE EXCEPTION 'Assignment version or overlap conflict'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER firm_assignment_guard BEFORE INSERT OR UPDATE OR DELETE ON firm_engagement_assignments FOR EACH ROW EXECUTE FUNCTION guard_firm_assignment();

-- AF03 rollout fence, NOT the final AF04 authority implementation.
CREATE FUNCTION guard_firm_link_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mandate accountant_access_grants%ROWTYPE;
BEGIN
  SELECT * INTO mandate FROM accountant_access_grants WHERE id=NEW."grantId" FOR UPDATE;
  IF NOT FOUND OR mandate.status <> 'REVOKED' THEN RAISE EXCEPTION 'AF03 enrollment requires a revoked mandate until AF04 enforcement'; END IF;
  -- Touch the tuple without changing values. A repeatable-read writer whose
  -- snapshot predates enrollment must serialize-fail, not miss the new link.
  UPDATE accountant_access_grants SET "updatedAt"="updatedAt" WHERE id=NEW."grantId";
  IF NOT EXISTS (SELECT 1 FROM users WHERE id=NEW."accountantUserId" AND "organizationId"=NEW."firmOrganizationId") THEN RAISE EXCEPTION 'Linked accountant must belong to firm'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER firm_link_enrollment BEFORE INSERT ON firm_engagement_grant_links FOR EACH ROW EXECUTE FUNCTION guard_firm_link_enrollment();
CREATE FUNCTION guard_af03_linked_mandate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'REVOKED' AND EXISTS (SELECT 1 FROM firm_engagement_grant_links WHERE "grantId"=OLD.id) THEN
    RAISE EXCEPTION 'AF03 linked mandate cannot be reactivated until AF04 enforcement';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER af03_linked_mandate_guard BEFORE UPDATE ON accountant_access_grants FOR EACH ROW EXECUTE FUNCTION guard_af03_linked_mandate();
COMMIT;
