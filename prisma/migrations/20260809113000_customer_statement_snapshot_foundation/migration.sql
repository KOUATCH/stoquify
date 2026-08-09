-- Phase 5 / statement proof network: immutable customer statement snapshots.
--
-- This migration adds no public route, token, recipient command, delivery
-- channel, or dispute authority. It freezes only an internally generated,
-- tenant-scoped proof snapshot sourced from posted customer receivables.

CREATE TABLE "customer_statement_snapshots" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "statementNumber" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "asOf" TIMESTAMP(3) NOT NULL,
  "recordedThrough" TIMESTAMP(3) NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL,
  "currencyPrecision" INTEGER NOT NULL DEFAULT 2,
  "openingBalance" DECIMAL(14,2) NOT NULL,
  "periodDebits" DECIMAL(14,2) NOT NULL,
  "periodCredits" DECIMAL(14,2) NOT NULL,
  "closingBalance" DECIMAL(14,2) NOT NULL,
  "overdueBalance" DECIMAL(14,2) NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "movementCount" INTEGER NOT NULL,
  "sourceItemCount" INTEGER NOT NULL,
  "includedItemCount" INTEGER NOT NULL,
  "itemLimit" INTEGER NOT NULL,
  "truncated" BOOLEAN NOT NULL DEFAULT false,
  "organizationSnapshot" JSONB NOT NULL,
  "customerSnapshot" JSONB NOT NULL,
  "statementPayload" JSONB NOT NULL,
  "sourceTables" JSONB NOT NULL,
  "sourceDocumentHashes" JSONB NOT NULL,
  "sourceStateHashes" JSONB NOT NULL,
  "sourceLedgerEntryIds" JSONB NOT NULL,
  "contentHash" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "idempotencyPayloadHash" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "generatedById" TEXT NOT NULL,
  "businessEventId" TEXT NOT NULL,
  "supersedesStatementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_statement_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_statement_scope_check" CHECK (
    "periodStart" <= "periodEnd"
    AND "asOf" = "periodEnd"
    AND "recordedThrough" >= "periodEnd"
    AND "generatedAt" = "recordedThrough"
  ),
  CONSTRAINT "customer_statement_currency_check" CHECK (
    "currency" ~ '^[A-Z]{3}$'
    AND "currencyPrecision" BETWEEN 0 AND 6
  ),
  CONSTRAINT "customer_statement_money_check" CHECK (
    "openingBalance" >= 0
    AND "periodDebits" >= 0
    AND "closingBalance" >= 0
    AND "overdueBalance" >= 0
    AND "overdueBalance" <= "closingBalance"
    AND "openingBalance" + "periodDebits" - "periodCredits" = "closingBalance"
  ),
  CONSTRAINT "customer_statement_count_check" CHECK (
    "version" > 0
    AND "itemCount" >= 0
    AND "movementCount" >= 0
    AND "sourceItemCount" >= 0
    AND "includedItemCount" >= 0
    AND "itemLimit" > 0
    AND "includedItemCount" = "itemCount"
    AND "sourceItemCount" = "includedItemCount"
    AND "truncated" = false
  ),
  CONSTRAINT "customer_statement_json_shape_check" CHECK (
    jsonb_typeof("organizationSnapshot") = 'object'
    AND jsonb_typeof("customerSnapshot") = 'object'
    AND jsonb_typeof("statementPayload") = 'object'
    AND jsonb_typeof("sourceTables") = 'array'
    AND jsonb_typeof("sourceDocumentHashes") = 'array'
    AND jsonb_typeof("sourceStateHashes") = 'array'
    AND jsonb_typeof("sourceLedgerEntryIds") = 'array'
  ),
  CONSTRAINT "customer_statement_hash_check" CHECK (
    "contentHash" ~ '^[0-9a-f]{64}$'
    AND "idempotencyPayloadHash" ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT "customer_statement_identity_check" CHECK (
    char_length(btrim("statementNumber")) BETWEEN 8 AND 80
    AND char_length(btrim("idempotencyKey")) BETWEEN 8 AND 160
    AND char_length(btrim("correlationId")) BETWEEN 8 AND 160
    AND char_length(btrim("generatedById")) > 0
    AND char_length(btrim("businessEventId")) > 0
    AND ("supersedesStatementId" IS NULL OR "supersedesStatementId" <> "id")
  )
);

CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_id_key"
  ON "customer_statement_snapshots"("organizationId", "id");
CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_statementNumber_version_key"
  ON "customer_statement_snapshots"("organizationId", "statementNumber", "version");
CREATE UNIQUE INDEX "customer_statement_scope_version_key"
  ON "customer_statement_snapshots"(
    "organizationId",
    "customerId",
    "periodStart",
    "periodEnd",
    "currency",
    "version"
  );
CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_idempotencyKey_key"
  ON "customer_statement_snapshots"("organizationId", "idempotencyKey");
CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_correlationId_key"
  ON "customer_statement_snapshots"("organizationId", "correlationId");
CREATE UNIQUE INDEX "customer_statement_snapshots_organizationId_contentHash_key"
  ON "customer_statement_snapshots"("organizationId", "contentHash");
CREATE INDEX "customer_statement_snapshots_organizationId_customerId_periodEnd_idx"
  ON "customer_statement_snapshots"("organizationId", "customerId", "periodEnd");
CREATE INDEX "customer_statement_snapshots_organizationId_customerId_currency_periodEnd_idx"
  ON "customer_statement_snapshots"("organizationId", "customerId", "currency", "periodEnd");
CREATE INDEX "customer_statement_snapshots_organizationId_supersedesStatementId_idx"
  ON "customer_statement_snapshots"("organizationId", "supersedesStatementId");

ALTER TABLE "customer_statement_snapshots"
  ADD CONSTRAINT "customer_statement_snapshots_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_snapshots"
  ADD CONSTRAINT "customer_statement_snapshots_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_statement_snapshots"
  ADD CONSTRAINT "customer_statement_snapshots_supersedesStatementId_fkey"
  FOREIGN KEY ("organizationId", "supersedesStatementId")
  REFERENCES "customer_statement_snapshots"("organizationId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "customer_statement_snapshots_prevent_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Customer statement snapshots are immutable and append-only';
END;
$$;

CREATE TRIGGER "customer_statement_snapshots_prevent_mutation_trigger"
BEFORE UPDATE OR DELETE ON "customer_statement_snapshots"
FOR EACH ROW EXECUTE FUNCTION "customer_statement_snapshots_prevent_mutation"();
