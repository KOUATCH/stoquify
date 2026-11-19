BEGIN;
-- Explicit live enrollment replaces AF03's temporary fence. The sticky key
-- keeps AF03 grant-only readers from accepting a managed mandate on rollback.
CREATE OR REPLACE FUNCTION guard_firm_link_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE mandate accountant_access_grants%ROWTYPE;
BEGIN
  SELECT * INTO mandate FROM accountant_access_grants WHERE id=NEW."grantId" FOR UPDATE;
  IF NOT FOUND OR mandate."organizationId" <> NEW."clientOrganizationId" OR mandate."accountantUserId" <> NEW."accountantUserId" THEN
    RAISE EXCEPTION 'Enrollment must reference the exact named client mandate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id=NEW."accountantUserId" AND "organizationId"=NEW."firmOrganizationId") THEN
    RAISE EXCEPTION 'Linked accountant must belong to firm';
  END IF;
  -- Physical update also fences repeatable-read writers predating enrollment.
  UPDATE accountant_access_grants SET "activeScopeKey"=CASE WHEN "activeScopeKey" IS NULL THEN NULL
    ELSE 'managed:' || "organizationId" || ':' || "accountantUserId" END,
    "updatedAt"="updatedAt" WHERE id=NEW."grantId";
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION guard_af03_linked_mandate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM firm_engagement_grant_links WHERE "grantId"=OLD.id) AND
    NEW."activeScopeKey" IS NOT NULL AND NEW."activeScopeKey" <> 'managed:' || NEW."organizationId" || ':' || NEW."accountantUserId" THEN
    RAISE EXCEPTION 'Managed mandates cannot regain legacy authority';
  END IF;
  RETURN NEW;
END $$;
-- Existing AF03 links were revoked: no data backfill or consent activation.
COMMIT;
