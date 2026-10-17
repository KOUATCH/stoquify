CREATE UNIQUE INDEX "provider_accounts_organizationId_id_key" ON "provider_accounts"("organizationId", "id");
CREATE UNIQUE INDEX "accounting_periods_organizationId_id_key" ON "accounting_periods"("organizationId", "id");
CREATE TABLE "reconciliation_no_activity_evidence" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "sourceDocumentHash" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evidenceHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "proposedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  CONSTRAINT "no_activity_account_tenant_fk" FOREIGN KEY ("organizationId", "providerAccountId") REFERENCES "provider_accounts"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "no_activity_period_tenant_fk" FOREIGN KEY ("organizationId", "periodId") REFERENCES "accounting_periods"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "no_activity_shape" CHECK (
    "periodStart" <= "periodEnd" AND length(trim("reason")) >= 10 AND length(trim("sourceReference")) > 0
    AND "sourceDocumentHash" ~ '^sha256:[a-f0-9]{64}$' AND "evidenceHash" ~ '^sha256:[a-f0-9]{64}$'
    AND length(trim("proposedById")) > 0
    AND (("approvedAt" IS NULL AND "approvedById" IS NULL) OR
      ("approvedAt" IS NOT NULL AND "approvedById" IS NOT NULL AND length(trim("approvedById")) > 0 AND "approvedById" <> "proposedById" AND "approvedAt" >= "createdAt"))
    AND (("status" = 'PROPOSED' AND "approvedAt" IS NULL AND "revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL)
      OR ("status" = 'APPROVED' AND "approvedAt" IS NOT NULL AND "revokedAt" IS NULL AND "revokedById" IS NULL AND "revocationReason" IS NULL)
      OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL AND "revokedAt" >= "createdAt" AND "revokedById" IS NOT NULL AND length(trim("revokedById")) > 0 AND "revocationReason" IS NOT NULL AND length(trim("revocationReason")) >= 10))
  )
);
CREATE UNIQUE INDEX "reconciliation_no_activity_org_key" ON "reconciliation_no_activity_evidence"("organizationId", "idempotencyKey");
CREATE INDEX "reconciliation_no_activity_scope_idx" ON "reconciliation_no_activity_evidence"("organizationId", "providerAccountId", "periodId", "status");
CREATE FUNCTION protect_reconciliation_no_activity_evidence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'No-activity evidence must be retained'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','approvedById','approvedAt','revokedById','revokedAt','revocationReason']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','approvedById','approvedAt','revokedById','revokedAt','revocationReason'])
    OR OLD."status" = 'REVOKED'
    OR (NEW."status" = 'REVOKED' AND (NEW."approvedById" IS DISTINCT FROM OLD."approvedById" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"))
    OR (OLD."status" = 'APPROVED' AND (NEW."status" <> 'REVOKED' OR NEW."approvedById" IS DISTINCT FROM OLD."approvedById" OR NEW."approvedAt" IS DISTINCT FROM OLD."approvedAt"))
    OR (OLD."status" = 'PROPOSED' AND NEW."status" NOT IN ('APPROVED','REVOKED'))
  THEN RAISE EXCEPTION 'No-activity evidence is immutable; use an allowed transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "no_activity_retention" BEFORE UPDATE OR DELETE ON "reconciliation_no_activity_evidence"
FOR EACH ROW EXECUTE FUNCTION protect_reconciliation_no_activity_evidence();
