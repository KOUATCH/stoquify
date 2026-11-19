CREATE TABLE hris_payroll_handoff_packages (
 id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "payrollPeriodId" TEXT NOT NULL REFERENCES payroll_periods(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL CHECK(version>0), "recipientUserId" TEXT NOT NULL, "issuedById" TEXT NOT NULL,
 "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "previewHash" TEXT NOT NULL,
 "manifestJson" JSONB NOT NULL, "manifestBytes" TEXT NOT NULL, "csvBytes" TEXT NOT NULL,
 "manifestHash" TEXT NOT NULL, "csvHash" TEXT NOT NULL, "packageHash" TEXT NOT NULL,
 "replacesPackageId" TEXT UNIQUE REFERENCES hris_payroll_handoff_packages(id) ON DELETE RESTRICT,
 "issuedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT hris_handoff_version UNIQUE("organizationId","payrollPeriodId",version),
 CONSTRAINT hris_handoff_replay UNIQUE("organizationId","issuedById","idempotencyKey"),
 CHECK(octet_length("manifestBytes")<=2097152 AND octet_length("csvBytes")<=2097152)
);
CREATE INDEX hris_handoff_recipient ON hris_payroll_handoff_packages("organizationId","recipientUserId","issuedAt");
CREATE TABLE hris_payroll_handoff_receipts (
 id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
 "packageId" TEXT NOT NULL UNIQUE REFERENCES hris_payroll_handoff_packages(id) ON DELETE RESTRICT,
 "actorId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "requestHash" TEXT NOT NULL,
 "packageHash" TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('ACKNOWLEDGED','CORRECTION_REQUESTED')),
 "acceptedRowIds" JSONB NOT NULL, "rejectedRows" JSONB NOT NULL, reference TEXT NOT NULL,
 "recordedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT hris_handoff_receipt_replay UNIQUE("organizationId","actorId","idempotencyKey")
);
CREATE FUNCTION hris_handoff_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'HRIS_HANDOFF_IMMUTABLE'; END IF;
 IF TG_TABLE_NAME='hris_payroll_handoff_packages' THEN
  IF NOT EXISTS(SELECT 1 FROM payroll_periods WHERE id=NEW."payrollPeriodId" AND "organizationId"=NEW."organizationId") THEN RAISE EXCEPTION 'HRIS_HANDOFF_TENANT_MISMATCH'; END IF;
  IF NEW."replacesPackageId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM hris_payroll_handoff_packages WHERE id=NEW."replacesPackageId" AND "organizationId"=NEW."organizationId" AND "payrollPeriodId"=NEW."payrollPeriodId" AND version=NEW.version-1) THEN RAISE EXCEPTION 'HRIS_HANDOFF_LINEAGE_MISMATCH'; END IF;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM hris_payroll_handoff_packages WHERE id=NEW."packageId" AND "organizationId"=NEW."organizationId" AND "packageHash"=NEW."packageHash" AND "recipientUserId"=NEW."actorId") THEN RAISE EXCEPTION 'HRIS_HANDOFF_RECEIPT_SCOPE_MISMATCH'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER hris_handoff_package_guard BEFORE INSERT OR UPDATE OR DELETE ON hris_payroll_handoff_packages FOR EACH ROW EXECUTE FUNCTION hris_handoff_immutable();
CREATE TRIGGER hris_handoff_receipt_guard BEFORE INSERT OR UPDATE OR DELETE ON hris_payroll_handoff_receipts FOR EACH ROW EXECUTE FUNCTION hris_handoff_immutable();
