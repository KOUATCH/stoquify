-- Smallest P0 supplier-invoice match-exception boundary.
-- Exact matching remains the default. Exception request evidence is immutable;
-- only the explicit OPEN -> APPROVED/REJECTED/EXPIRED -> RESOLVED lifecycle may change.

CREATE TYPE "SupplierInvoiceMatchExceptionStatus" AS ENUM (
  'OPEN',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'RESOLVED'
);

CREATE UNIQUE INDEX "three_way_matches_organizationId_id_key"
  ON "three_way_matches"("organizationId", "id");

CREATE TABLE "supplier_invoice_match_exceptions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "supplierInvoiceId" TEXT NOT NULL,
  "threeWayMatchId" TEXT NOT NULL,
  "status" "SupplierInvoiceMatchExceptionStatus" NOT NULL DEFAULT 'OPEN',
  "policyVersion" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "evidenceReference" TEXT NOT NULL,
  "varianceAmount" DECIMAL(14,2) NOT NULL,
  "priceVariance" DECIMAL(14,2) NOT NULL,
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "rejectedById" TEXT,
  "resolvedById" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "supplier_invoice_match_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_invoice_match_exceptions_org_id_key"
  ON "supplier_invoice_match_exceptions"("organizationId", "id");

CREATE UNIQUE INDEX "supplier_invoice_match_exceptions_active_match_key"
  ON "supplier_invoice_match_exceptions"("organizationId", "threeWayMatchId")
  WHERE "status" IN ('OPEN', 'APPROVED');

CREATE INDEX "supplier_invoice_match_exceptions_invoice_status_idx"
  ON "supplier_invoice_match_exceptions"("organizationId", "supplierInvoiceId", "status");

CREATE INDEX "supplier_invoice_match_exceptions_match_status_idx"
  ON "supplier_invoice_match_exceptions"("organizationId", "threeWayMatchId", "status");

CREATE INDEX "supplier_invoice_match_exceptions_status_expiry_idx"
  ON "supplier_invoice_match_exceptions"("organizationId", "status", "expiresAt");

ALTER TABLE "supplier_invoice_match_exceptions"
  ADD CONSTRAINT "supplier_invoice_match_exceptions_org_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_invoice_match_exceptions_invoice_tenant_fkey"
    FOREIGN KEY ("organizationId", "supplierInvoiceId") REFERENCES "supplier_invoices"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "supplier_invoice_match_exceptions_match_tenant_fkey"
    FOREIGN KEY ("organizationId", "threeWayMatchId") REFERENCES "three_way_matches"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "purchasing_validate_match_exception_insert"()
RETURNS TRIGGER AS $$
DECLARE
  match_invoice_id TEXT;
  match_status "ThreeWayMatchStatus";
BEGIN
  SELECT "supplierInvoiceId", "status"
    INTO match_invoice_id, match_status
    FROM "three_way_matches"
   WHERE "organizationId" = NEW."organizationId"
     AND "id" = NEW."threeWayMatchId";

  IF match_invoice_id IS NULL
     OR match_invoice_id <> NEW."supplierInvoiceId"
     OR match_status <> 'EXCEPTION' THEN
    RAISE EXCEPTION 'Match exception source must be a tenant-scoped unresolved invoice match' USING ERRCODE = '23514';
  END IF;

  IF NEW."status" <> 'OPEN'
     OR NEW."expiresAt" <= NEW."requestedAt"
     OR NEW."approvedById" IS NOT NULL
     OR NEW."rejectedById" IS NOT NULL
     OR NEW."resolvedById" IS NOT NULL
     OR NEW."decidedAt" IS NOT NULL
     OR NEW."resolvedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Match exception must begin as an undecided OPEN request with future expiry' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "supplier_invoice_match_exceptions_validate_insert"
BEFORE INSERT ON "supplier_invoice_match_exceptions"
FOR EACH ROW EXECUTE FUNCTION "purchasing_validate_match_exception_insert"();

CREATE OR REPLACE FUNCTION "purchasing_match_exception_lifecycle_only"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Supplier invoice match exception evidence is immutable' USING ERRCODE = '23514';
  END IF;

  IF NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
     OR NEW."supplierInvoiceId" IS DISTINCT FROM OLD."supplierInvoiceId"
     OR NEW."threeWayMatchId" IS DISTINCT FROM OLD."threeWayMatchId"
     OR NEW."policyVersion" IS DISTINCT FROM OLD."policyVersion"
     OR NEW."reason" IS DISTINCT FROM OLD."reason"
     OR NEW."evidenceReference" IS DISTINCT FROM OLD."evidenceReference"
     OR NEW."varianceAmount" IS DISTINCT FROM OLD."varianceAmount"
     OR NEW."priceVariance" IS DISTINCT FROM OLD."priceVariance"
     OR NEW."requestedById" IS DISTINCT FROM OLD."requestedById"
     OR NEW."requestedAt" IS DISTINCT FROM OLD."requestedAt"
     OR NEW."expiresAt" IS DISTINCT FROM OLD."expiresAt"
     OR NEW."metadata" IS DISTINCT FROM OLD."metadata"
     OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN
    RAISE EXCEPTION 'Supplier invoice match exception request evidence is immutable' USING ERRCODE = '23514';
  END IF;

  IF OLD."status" = 'OPEN' AND NEW."status" = 'APPROVED' THEN
    IF NEW."approvedById" IS NULL
       OR NEW."approvedById" = OLD."requestedById"
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS NULL
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Match exception approval requires an independent approver' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'OPEN' AND NEW."status" = 'REJECTED' THEN
    IF NEW."rejectedById" IS NULL
       OR NEW."rejectedById" = OLD."requestedById"
       OR NEW."approvedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS NULL
       OR NEW."decisionReason" IS NULL
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Match exception rejection requires an independent reviewer' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'OPEN' AND NEW."status" = 'EXPIRED' THEN
    IF NEW."approvedById" IS NOT NULL
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS NOT NULL
       OR NEW."decisionReason" IS NOT NULL
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Open match exception expiry cannot add a decision' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'APPROVED' AND NEW."status" = 'EXPIRED' THEN
    IF NEW."approvedById" IS DISTINCT FROM OLD."approvedById"
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NOT NULL
       OR NEW."decidedAt" IS DISTINCT FROM OLD."decidedAt"
       OR NEW."decisionReason" IS DISTINCT FROM OLD."decisionReason"
       OR NEW."resolvedAt" IS NOT NULL THEN
      RAISE EXCEPTION 'Approved match exception expiry must preserve approval evidence' USING ERRCODE = '23514';
    END IF;
  ELSIF OLD."status" = 'APPROVED' AND NEW."status" = 'RESOLVED' THEN
    IF NEW."approvedById" IS DISTINCT FROM OLD."approvedById"
       OR NEW."rejectedById" IS NOT NULL
       OR NEW."resolvedById" IS NULL
       OR NEW."decidedAt" IS DISTINCT FROM OLD."decidedAt"
       OR NEW."resolvedAt" IS NULL
       OR NEW."decisionReason" IS DISTINCT FROM OLD."decisionReason" THEN
      RAISE EXCEPTION 'Resolved match exception must preserve approval and add posting resolution evidence' USING ERRCODE = '23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid supplier invoice match exception lifecycle transition' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "supplier_invoice_match_exceptions_lifecycle_only"
BEFORE UPDATE OR DELETE ON "supplier_invoice_match_exceptions"
FOR EACH ROW EXECUTE FUNCTION "purchasing_match_exception_lifecycle_only"();
