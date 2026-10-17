CREATE UNIQUE INDEX "chart_of_accounts_organizationId_id_key" ON chart_of_accounts("organizationId", id);
CREATE TABLE balance_sheet_evidence (
  id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "ledgerAccountId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL, currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  input JSONB NOT NULL, snapshot JSONB NOT NULL, "evidenceHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL, "proposedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'PROPOSED', "approvedById" TEXT, "approvedAt" TIMESTAMP(3),
  "revokedById" TEXT, "revokedAt" TIMESTAMP(3), "revocationReason" TEXT,
  CONSTRAINT balance_sheet_account_tenant_fk FOREIGN KEY ("organizationId", "ledgerAccountId") REFERENCES chart_of_accounts("organizationId",id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT balance_sheet_period_tenant_fk FOREIGN KEY ("organizationId", "periodId") REFERENCES accounting_periods("organizationId",id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT balance_sheet_shape CHECK (
    jsonb_typeof(input) = 'object' AND jsonb_typeof(snapshot) = 'object' AND "evidenceHash" ~ '^sha256:[a-f0-9]{64}$'
    AND length(trim("proposedById")) > 0
    AND (("approvedAt" IS NULL AND "approvedById" IS NULL) OR ("approvedAt" IS NOT NULL AND "approvedById" IS NOT NULL AND length(trim("approvedById")) > 0 AND "approvedById" <> "proposedById" AND "approvedAt" >= "createdAt"))
    AND ((status = 'PROPOSED' AND "approvedAt" IS NULL AND "revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL)
      OR (status = 'APPROVED' AND "approvedAt" IS NOT NULL AND "revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL)
      OR (status = 'REVOKED' AND "revokedAt" IS NOT NULL AND "revokedAt" >= "createdAt" AND "revokedById" IS NOT NULL AND length(trim("revokedById")) > 0 AND length(trim("revocationReason")) >= 10 AND "revocationReason" IS NOT NULL))
  )
);
CREATE UNIQUE INDEX balance_sheet_org_key ON balance_sheet_evidence("organizationId","idempotencyKey");
CREATE INDEX balance_sheet_scope_idx ON balance_sheet_evidence("organizationId","ledgerAccountId","periodId",currency,"createdAt");
CREATE FUNCTION protect_balance_sheet_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Balance-sheet evidence must be retained'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','approvedById','approvedAt','revokedById','revokedAt','revocationReason']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','approvedById','approvedAt','revokedById','revokedAt','revocationReason'])
    OR OLD."status" = 'REVOKED'
    OR (NEW."status" = 'REVOKED' AND (NEW."approvedById" IS DISTINCT FROM OLD."approvedById" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"))
    OR (OLD."status" = 'APPROVED' AND (NEW."status" <> 'REVOKED' OR NEW."approvedById" IS DISTINCT FROM OLD."approvedById" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"))
    OR (OLD."status" = 'PROPOSED' AND NEW."status" NOT IN ('APPROVED','REVOKED'))
  THEN RAISE EXCEPTION 'Balance-sheet evidence is immutable; use an allowed transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "balance_sheet_retention" BEFORE UPDATE OR DELETE ON "balance_sheet_evidence"
FOR EACH ROW EXECUTE FUNCTION protect_balance_sheet_evidence();

CREATE TRIGGER close_source_revision_change BEFORE INSERT OR UPDATE OR DELETE ON balance_sheet_evidence
FOR EACH ROW EXECUTE FUNCTION invalidate_close_on_source_change();
DO $$ DECLARE tenant TEXT; BEGIN
  FOR tenant IN SELECT DISTINCT "organizationId" FROM close_runs ORDER BY "organizationId" LOOP
    PERFORM advance_close_source_revision(tenant, 'balance_sheet_contract', NULL, 'CONTRACT_UPGRADE');
  END LOOP;
END $$;
