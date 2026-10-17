CREATE UNIQUE INDEX "statement_files_organizationId_id_key" ON statement_files("organizationId", id);
CREATE TABLE bank_balance_evidence (
  id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL, "statementFileId" TEXT NOT NULL,
  input JSONB NOT NULL, snapshot JSONB NOT NULL, "evidenceHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "proposedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'PROPOSED', "approvedById" TEXT, "approvedAt" TIMESTAMP(3),
  "revokedById" TEXT, "revokedAt" TIMESTAMP(3), "revocationReason" TEXT,
  CONSTRAINT bank_balance_account_tenant_fk FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES provider_accounts("organizationId",id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT bank_balance_period_tenant_fk FOREIGN KEY ("organizationId", "periodId") REFERENCES accounting_periods("organizationId",id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT bank_balance_statement_tenant_fk FOREIGN KEY ("organizationId", "statementFileId") REFERENCES statement_files("organizationId",id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT bank_balance_shape CHECK (
    jsonb_typeof(input) = 'object' AND jsonb_typeof(snapshot) = 'object' AND "evidenceHash" ~ '^sha256:[a-f0-9]{64}$'
    AND length(trim("proposedById")) > 0
    AND (("approvedAt" IS NULL AND "approvedById" IS NULL) OR ("approvedAt" IS NOT NULL AND "approvedById" IS NOT NULL AND length(trim("approvedById")) > 0 AND "approvedById" <> "proposedById" AND "approvedAt" >= "createdAt"))
    AND ((status = 'PROPOSED' AND "approvedAt" IS NULL AND "revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL)
      OR (status = 'APPROVED' AND "approvedAt" IS NOT NULL AND "revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL)
      OR (status = 'REVOKED' AND "revokedAt" IS NOT NULL AND "revokedAt" >= "createdAt" AND "revokedById" IS NOT NULL AND length(trim("revokedById")) > 0 AND length(trim("revocationReason")) >= 10 AND "revocationReason" IS NOT NULL))
  )
);
CREATE UNIQUE INDEX bank_balance_org_key ON bank_balance_evidence("organizationId","idempotencyKey");
CREATE INDEX bank_balance_scope_idx ON bank_balance_evidence("organizationId","providerAccountId","periodId","createdAt");
CREATE FUNCTION protect_bank_balance_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Bank balance evidence must be retained'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','approvedById','approvedAt','revokedById','revokedAt','revocationReason']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','approvedById','approvedAt','revokedById','revokedAt','revocationReason'])
    OR OLD."status" = 'REVOKED'
    OR (NEW."status" = 'REVOKED' AND (NEW."approvedById" IS DISTINCT FROM OLD."approvedById" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"))
    OR (OLD."status" = 'APPROVED' AND (NEW."status" <> 'REVOKED' OR NEW."approvedById" IS DISTINCT FROM OLD."approvedById" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"))
    OR (OLD."status" = 'PROPOSED' AND NEW."status" NOT IN ('APPROVED','REVOKED'))
  THEN RAISE EXCEPTION 'Bank balance evidence is immutable; use an allowed transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "bank_balance_retention" BEFORE UPDATE OR DELETE ON "bank_balance_evidence"
FOR EACH ROW EXECUTE FUNCTION protect_bank_balance_evidence();

CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON bank_balance_evidence
FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change();
DO $$ DECLARE tenant TEXT; BEGIN
  FOR tenant IN SELECT DISTINCT "organizationId" FROM close_runs ORDER BY "organizationId" LOOP
    PERFORM advance_close_source_revision(tenant, 'bank_balance_contract', NULL, 'CONTRACT_UPGRADE');
  END LOOP;
END $$;
