-- Phase 5 / Slice 438: immutable posted customer receivable foundation.
-- This migration installs the append-only storage and a nullable legacy-link
-- bridge. The controlled application backfill must reach 100% coverage before
-- production release; a later rollout migration may make the bridge NOT NULL.

CREATE TYPE "CustomerReceivableDocumentStatus" AS ENUM (
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
  'VOIDED'
);

CREATE TABLE "customer_receivable_documents" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "sourceSalesOrderId" TEXT NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "sourceVersion" INTEGER NOT NULL DEFAULT 1,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paymentTermsDays" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "currencyPrecision" INTEGER NOT NULL DEFAULT 2,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "taxAmount" DECIMAL(14,2) NOT NULL,
  "shippingAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "initialPaidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "initialUnpaidAmount" DECIMAL(14,2) NOT NULL,
  "organizationSnapshot" JSONB NOT NULL,
  "customerSnapshot" JSONB NOT NULL,
  "sourceSnapshot" JSONB NOT NULL,
  "metadata" JSONB,
  "documentHash" TEXT NOT NULL,
  "sourceEvidenceHash" TEXT NOT NULL,
  "metadataHash" TEXT NOT NULL,
  "issuedById" TEXT NOT NULL,
  "supersedesDocumentId" TEXT,
  "correctionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_receivable_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_receivable_documents_identity_check" CHECK (
    "version" >= 1
    AND "sourceVersion" >= 1
    AND char_length(btrim("documentNumber")) BETWEEN 1 AND 120
    AND char_length(btrim("currency")) = 3
    AND "currencyPrecision" BETWEEN 0 AND 6
    AND "paymentTermsDays" BETWEEN 0 AND 3650
    AND "dueDate" >= "invoiceDate"
    AND "issuedAt" >= "invoiceDate"
  ),
  CONSTRAINT "customer_receivable_documents_money_check" CHECK (
    "subtotal" >= 0
    AND "taxAmount" >= 0
    AND "shippingAmount" >= 0
    AND "discountAmount" >= 0
    AND "totalAmount" > 0
    AND "initialPaidAmount" >= 0
    AND "initialUnpaidAmount" >= 0
    AND "initialPaidAmount" + "initialUnpaidAmount" = "totalAmount"
  ),
  CONSTRAINT "customer_receivable_documents_hash_check" CHECK (
    "documentHash" ~ '^[0-9a-f]{64}$'
    AND "sourceEvidenceHash" ~ '^[0-9a-f]{64}$'
    AND "metadataHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "customer_receivable_documents_correction_check" CHECK (
    (
      "supersedesDocumentId" IS NULL
      AND "correctionReason" IS NULL
      AND "version" = 1
    )
    OR (
      "supersedesDocumentId" IS NOT NULL
      AND "supersedesDocumentId" <> "id"
      AND char_length(btrim("correctionReason")) BETWEEN 3 AND 500
      AND "version" > 1
    )
  )
);

CREATE TABLE "customer_receivable_document_states" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "CustomerReceivableDocumentStatus" NOT NULL,
  "paidAmount" DECIMAL(14,2) NOT NULL,
  "unpaidAmount" DECIMAL(14,2) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "actorId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "reason" TEXT,
  "previousStateHash" TEXT,
  "stateHash" TEXT NOT NULL,
  "businessEventId" TEXT,
  "evidenceHash" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_receivable_document_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_receivable_document_states_version_check" CHECK ("version" >= 1),
  CONSTRAINT "customer_receivable_document_states_money_check" CHECK (
    "paidAmount" >= 0 AND "unpaidAmount" >= 0
  ),
  CONSTRAINT "customer_receivable_document_states_hash_check" CHECK (
    ("previousStateHash" IS NULL OR "previousStateHash" ~ '^[0-9a-f]{64}$')
    AND "stateHash" ~ '^[0-9a-f]{64}$'
    AND "evidenceHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "customer_receivable_document_states_lineage_check" CHECK (
    ("version" = 1 AND "previousStateHash" IS NULL)
    OR ("version" > 1 AND "previousStateHash" IS NOT NULL)
  ),
  CONSTRAINT "customer_receivable_document_states_reason_check" CHECK (
    "status" NOT IN ('CANCELLED', 'VOIDED')
    OR char_length(btrim("reason")) BETWEEN 3 AND 500
  )
);

CREATE UNIQUE INDEX "customer_receivable_documents_organizationId_id_key"
ON "customer_receivable_documents"("organizationId", "id");

CREATE UNIQUE INDEX "customer_receivable_documents_document_version_key"
ON "customer_receivable_documents"("organizationId", "documentNumber", "version");

CREATE UNIQUE INDEX "customer_receivable_documents_source_version_key"
ON "customer_receivable_documents"("organizationId", "sourceSalesOrderId", "version");

CREATE INDEX "customer_receivable_documents_customer_invoice_idx"
ON "customer_receivable_documents"("organizationId", "customerId", "invoiceDate");

CREATE INDEX "customer_receivable_documents_customer_due_idx"
ON "customer_receivable_documents"("organizationId", "customerId", "dueDate");

CREATE INDEX "customer_receivable_documents_supersedes_idx"
ON "customer_receivable_documents"("organizationId", "supersedesDocumentId");

CREATE UNIQUE INDEX "customer_receivable_document_states_organizationId_id_key"
ON "customer_receivable_document_states"("organizationId", "id");

CREATE UNIQUE INDEX "customer_receivable_states_document_version_key"
ON "customer_receivable_document_states"("organizationId", "documentId", "version");

CREATE UNIQUE INDEX "customer_receivable_states_state_hash_key"
ON "customer_receivable_document_states"("organizationId", "stateHash");

CREATE INDEX "customer_receivable_states_document_effective_idx"
ON "customer_receivable_document_states"("organizationId", "documentId", "effectiveAt");

CREATE INDEX "customer_receivable_states_source_idx"
ON "customer_receivable_document_states"("organizationId", "sourceType", "sourceId");

ALTER TABLE "customer_settlement_allocations"
ADD COLUMN "customerReceivableDocumentId" TEXT;

CREATE UNIQUE INDEX "customer_settlement_allocations_settlement_receivable_key"
ON "customer_settlement_allocations"("customerSettlementId", "customerReceivableDocumentId");

CREATE INDEX "customer_settlement_allocations_receivable_idx"
ON "customer_settlement_allocations"("organizationId", "customerReceivableDocumentId");

ALTER TABLE "customer_receivable_documents"
ADD CONSTRAINT "customer_receivable_documents_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_receivable_documents"
ADD CONSTRAINT "customer_receivable_documents_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_receivable_documents"
ADD CONSTRAINT "customer_receivable_documents_sourceSalesOrderId_fkey"
FOREIGN KEY ("sourceSalesOrderId") REFERENCES "sales_orders"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_receivable_documents"
ADD CONSTRAINT "customer_receivable_documents_supersedes_fkey"
FOREIGN KEY ("organizationId", "supersedesDocumentId")
REFERENCES "customer_receivable_documents"("organizationId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_receivable_document_states"
ADD CONSTRAINT "customer_receivable_document_states_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_receivable_document_states"
ADD CONSTRAINT "customer_receivable_document_states_document_fkey"
FOREIGN KEY ("organizationId", "documentId")
REFERENCES "customer_receivable_documents"("organizationId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_settlement_allocations"
ADD CONSTRAINT "customer_settlement_allocations_receivable_fkey"
FOREIGN KEY ("organizationId", "customerReceivableDocumentId")
REFERENCES "customer_receivable_documents"("organizationId", "id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "receivable_prevent_document_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable customer receivable document %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable customer receivable document %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "receivable_prevent_state_mutation"()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete immutable customer receivable state %', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RAISE EXCEPTION 'Cannot modify immutable customer receivable state %', OLD."id"
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION "receivable_prevent_allocation_relink"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."customerReceivableDocumentId" IS NOT NULL
    AND NEW."customerReceivableDocumentId" IS DISTINCT FROM OLD."customerReceivableDocumentId" THEN
    RAISE EXCEPTION 'Cannot relink customer settlement allocation % from immutable receivable document', OLD."id"
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "customer_receivable_documents_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_receivable_documents"
FOR EACH ROW EXECUTE FUNCTION "receivable_prevent_document_mutation"();

CREATE TRIGGER "customer_receivable_document_states_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_receivable_document_states"
FOR EACH ROW EXECUTE FUNCTION "receivable_prevent_state_mutation"();

CREATE TRIGGER "customer_settlement_allocations_prevent_receivable_relink_trigger"
BEFORE UPDATE OF "customerReceivableDocumentId" ON "customer_settlement_allocations"
FOR EACH ROW EXECUTE FUNCTION "receivable_prevent_allocation_relink"();
