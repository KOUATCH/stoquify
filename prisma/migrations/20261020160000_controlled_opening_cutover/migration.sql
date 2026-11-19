-- AlterTable
ALTER TABLE "supplier_invoices" ADD COLUMN     "openingRevisionId" TEXT,
ADD COLUMN     "openingSourceId" TEXT;

-- AlterTable
ALTER TABLE "customer_receivable_documents" ADD COLUMN     "openingRevisionId" TEXT,
ADD COLUMN     "openingSourceId" TEXT,
ALTER COLUMN "sourceSalesOrderId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customer_settlement_allocations" ALTER COLUMN "salesOrderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "financial_opening_executions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "cutoverDate" TEXT NOT NULL,
    "activeScopeKey" TEXT,
    "manifestDigest" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "periodVersion" INTEGER NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvalKey" TEXT NOT NULL,
    "approvalHash" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "appliedById" TEXT,
    "appliedAt" TIMESTAMP(3),
    "applyKey" TEXT,
    "applyHash" TEXT,
    "reconciliation" JSONB,
    "reconciliationHash" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "financial_opening_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_opening_operations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "receipt" JSONB NOT NULL,
    "receiptHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_opening_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_opening_executions_activeScopeKey_key" ON "financial_opening_executions"("activeScopeKey");

-- CreateIndex
CREATE INDEX "financial_opening_executions_organizationId_cutoverDate_app_idx" ON "financial_opening_executions"("organizationId", "cutoverDate", "approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "financial_opening_executions_organizationId_id_key" ON "financial_opening_executions"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_opening_executions_organizationId_approvalKey_key" ON "financial_opening_executions"("organizationId", "approvalKey");

-- CreateIndex
CREATE UNIQUE INDEX "financial_opening_operations_executionId_domain_sourceId_key" ON "financial_opening_operations"("executionId", "domain", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_opening_revisions_organizationId_id_key" ON "financial_opening_revisions"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_organizationId_openingRevisionId_openingS_key" ON "supplier_invoices"("organizationId", "openingRevisionId", "openingSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_receivable_documents_organizationId_openingRevisio_key" ON "customer_receivable_documents"("organizationId", "openingRevisionId", "openingSourceId");

-- AddForeignKey
ALTER TABLE "financial_opening_executions" ADD CONSTRAINT "financial_opening_executions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_opening_executions" ADD CONSTRAINT "financial_opening_executions_organizationId_revisionId_fkey" FOREIGN KEY ("organizationId", "revisionId") REFERENCES "financial_opening_revisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_opening_operations" ADD CONSTRAINT "financial_opening_operations_organizationId_executionId_fkey" FOREIGN KEY ("organizationId", "executionId") REFERENCES "financial_opening_executions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_organizationId_openingRevisionId_fkey" FOREIGN KEY ("organizationId", "openingRevisionId") REFERENCES "financial_opening_revisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_receivable_documents" ADD CONSTRAINT "customer_receivable_documents_organizationId_openingRevisi_fkey" FOREIGN KEY ("organizationId", "openingRevisionId") REFERENCES "financial_opening_revisions"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Explicit origins keep existing sales-backed documents unchanged.
ALTER TABLE customer_receivable_documents ADD CONSTRAINT opening_receivable_origin CHECK (
  ("sourceSalesOrderId" IS NOT NULL AND "openingRevisionId" IS NULL AND "openingSourceId" IS NULL)
  OR ("sourceSalesOrderId" IS NULL AND "openingRevisionId" IS NOT NULL AND "openingSourceId" IS NOT NULL AND length("openingSourceId") > 0));
ALTER TABLE supplier_invoices ADD CONSTRAINT opening_payable_origin CHECK (
  ("openingRevisionId" IS NULL AND "openingSourceId" IS NULL)
  OR ("openingRevisionId" IS NOT NULL AND "openingSourceId" IS NOT NULL AND length("openingSourceId") > 0 AND "purchaseOrderId" IS NULL));
ALTER TABLE customer_settlement_allocations ADD CONSTRAINT opening_allocation_target CHECK (
  "salesOrderId" IS NOT NULL OR "customerReceivableDocumentId" IS NOT NULL);

ALTER TABLE financial_opening_executions ADD CONSTRAINT opening_execution_shape CHECK (
  "cutoverDate" = '2026-10-01' AND "periodVersion" >= 0 AND "expiresAt" > "approvedAt"
  AND length("conclusion") BETWEEN 10 AND 2000
  AND "manifestDigest" ~ '^sha256:[0-9a-f]{64}$' AND "approvalHash" ~ '^sha256:[0-9a-f]{64}$'
  AND (
    ("status" = 'APPROVED' AND "activeScopeKey" IS NOT NULL AND "activeScopeKey" = "organizationId" || ':' || "cutoverDate"
      AND "appliedById" IS NULL AND "appliedAt" IS NULL AND "applyKey" IS NULL AND "applyHash" IS NULL
      AND "reconciliation" IS NULL AND "reconciliationHash" IS NULL
      AND "cancelledById" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
    OR ("status" = 'ACTIVE' AND "activeScopeKey" IS NOT NULL AND "activeScopeKey" = "organizationId" || ':' || "cutoverDate"
      AND "appliedById" IS NOT NULL AND "appliedById" = "approvedById" AND "appliedAt" IS NOT NULL AND "applyKey" IS NOT NULL AND "applyHash" IS NOT NULL
      AND "reconciliation" IS NOT NULL AND "reconciliationHash" IS NOT NULL AND "reconciliationHash" ~ '^sha256:[0-9a-f]{64}$'
      AND "cancelledById" IS NULL AND "cancelledAt" IS NULL AND "cancellationReason" IS NULL)
    OR ("status" = 'CANCELLED' AND "activeScopeKey" IS NULL AND "cancelledById" IS NOT NULL AND "cancelledAt" IS NOT NULL
      AND "cancellationReason" IS NOT NULL AND length("cancellationReason") BETWEEN 10 AND 2000 AND "appliedById" IS NULL AND "appliedAt" IS NULL
      AND "applyKey" IS NULL AND "applyHash" IS NULL AND "reconciliation" IS NULL AND "reconciliationHash" IS NULL)
  )
);
ALTER TABLE financial_opening_operations ADD CONSTRAINT opening_operation_shape CHECK (
  "domain" IN ('LEDGER','AR','AP','STOCK') AND length("sourceId") > 0
  AND "sourceHash" ~ '^sha256:[0-9a-f]{64}$' AND "receiptHash" ~ '^sha256:[0-9a-f]{64}$');

CREATE FUNCTION financial_opening_preserve_execution() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Opening execution is retained'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'APPROVED' OR NOT EXISTS (
      SELECT 1 FROM financial_opening_revisions r WHERE r.id = NEW."revisionId" AND r."organizationId" = NEW."organizationId"
      AND r.status = 'REVIEWED' AND r."createdById" <> NEW."approvedById"
      AND r."reviewDigest" = NEW."manifestDigest" AND r."manifestDigest" = NEW."manifestDigest"
    ) THEN RAISE EXCEPTION 'Opening approval requires independent reviewed evidence'; END IF;
  ELSE
    IF OLD.status <> 'APPROVED' OR NEW.status NOT IN ('ACTIVE','CANCELLED') OR
      (to_jsonb(NEW) - ARRAY['status','activeScopeKey','appliedById','appliedAt','applyKey','applyHash','reconciliation','reconciliationHash','cancelledById','cancelledAt','cancellationReason'])
      IS DISTINCT FROM
      (to_jsonb(OLD) - ARRAY['status','activeScopeKey','appliedById','appliedAt','applyKey','applyHash','reconciliation','reconciliationHash','cancelledById','cancelledAt','cancellationReason'])
    THEN RAISE EXCEPTION 'Opening approval and committed receipts are immutable'; END IF;
    IF NEW.status = 'CANCELLED' AND EXISTS (SELECT 1 FROM financial_opening_operations WHERE "executionId" = OLD.id)
    THEN RAISE EXCEPTION 'Opening operations require controlled correction'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opening_execution_immutable BEFORE INSERT OR UPDATE OR DELETE ON financial_opening_executions
FOR EACH ROW EXECUTE FUNCTION financial_opening_preserve_execution();

CREATE FUNCTION financial_opening_preserve_operation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Opening operation receipts are immutable and retained'; END IF;
  IF NOT EXISTS (SELECT 1 FROM financial_opening_executions WHERE id = NEW."executionId"
    AND "organizationId" = NEW."organizationId" AND status = 'APPROVED')
  THEN RAISE EXCEPTION 'Opening operation requires its approved execution'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opening_operation_immutable BEFORE INSERT OR UPDATE OR DELETE ON financial_opening_operations
FOR EACH ROW EXECUTE FUNCTION financial_opening_preserve_operation();

-- Existing AP payments may change amountPaid/status; opening source identity
-- and original financial terms remain evidence. Event linkage is filled once.
CREATE FUNCTION financial_opening_preserve_payable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."openingRevisionId" IS NOT NULL THEN RAISE EXCEPTION 'Opening payable is retained'; END IF;
    RETURN OLD;
  END IF;
  IF NEW."openingRevisionId" IS DISTINCT FROM OLD."openingRevisionId" OR NEW."openingSourceId" IS DISTINCT FROM OLD."openingSourceId"
    OR (OLD."openingRevisionId" IS NOT NULL AND
      ((to_jsonb(NEW) - ARRAY['amountPaid','status','postedBusinessEventId','updatedAt'])
        IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['amountPaid','status','postedBusinessEventId','updatedAt'])
       OR (OLD."postedBusinessEventId" IS NOT NULL AND NEW."postedBusinessEventId" IS DISTINCT FROM OLD."postedBusinessEventId")))
  THEN RAISE EXCEPTION 'Opening payable source is immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opening_payable_immutable BEFORE UPDATE OR DELETE ON supplier_invoices
FOR EACH ROW EXECUTE FUNCTION financial_opening_preserve_payable();
