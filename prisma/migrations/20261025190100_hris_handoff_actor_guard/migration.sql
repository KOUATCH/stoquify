CREATE OR REPLACE FUNCTION hris_handoff_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'HRIS_HANDOFF_IMMUTABLE'; END IF;
 IF TG_TABLE_NAME='hris_payroll_handoff_packages' THEN
  IF NOT EXISTS(SELECT 1 FROM payroll_periods WHERE id=NEW."payrollPeriodId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'HRIS_HANDOFF_TENANT_MISMATCH'; END IF;
  IF NEW."issuedById"=NEW."recipientUserId" OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW."issuedById" AND "organizationId"=NEW."organizationId") OR NOT EXISTS(SELECT 1 FROM users WHERE id=NEW."recipientUserId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'HRIS_HANDOFF_ACTOR_SCOPE_MISMATCH'; END IF;
  IF (NEW.version=1)<>(NEW."replacesPackageId" IS NULL) THEN RAISE EXCEPTION 'HRIS_HANDOFF_LINEAGE_MISMATCH'; END IF;
  IF NEW."replacesPackageId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM hris_payroll_handoff_packages WHERE id=NEW."replacesPackageId" AND "organizationId"=NEW."organizationId" AND "payrollPeriodId"=NEW."payrollPeriodId" AND version=NEW.version-1) THEN RAISE EXCEPTION 'HRIS_HANDOFF_LINEAGE_MISMATCH'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM hris_payroll_handoff_packages WHERE id=NEW."packageId" AND "organizationId"=NEW."organizationId" AND "packageHash"=NEW."packageHash" AND "recipientUserId"=NEW."actorId") THEN RAISE EXCEPTION 'HRIS_HANDOFF_RECEIPT_SCOPE_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END $$;
