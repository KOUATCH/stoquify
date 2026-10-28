-- Preserve distinct economic and knowledge time for inventory movements.
-- Legacy rows cannot recover their original economic time, so the backfill is
-- explicitly labelled as an approximation instead of being presented as exact.

CREATE TYPE "InventoryTransactionTimeProvenance" AS ENUM (
  'EXPLICIT_SOURCE_TIME',
  'LEGACY_CREATED_AT_APPROXIMATION'
);

ALTER TABLE "inventory_transactions"
  ADD COLUMN "effectiveAt" TIMESTAMP(3),
  ADD COLUMN "recordedAt" TIMESTAMP(3),
  ADD COLUMN "timeProvenance" "InventoryTransactionTimeProvenance";

UPDATE "inventory_transactions"
SET
  "effectiveAt" = "createdAt",
  "recordedAt" = "createdAt",
  "timeProvenance" = 'LEGACY_CREATED_AT_APPROXIMATION'
WHERE
  "effectiveAt" IS NULL
  OR "recordedAt" IS NULL
  OR "timeProvenance" IS NULL;

ALTER TABLE "inventory_transactions"
  ALTER COLUMN "effectiveAt" SET NOT NULL,
  ALTER COLUMN "recordedAt" SET NOT NULL,
  ALTER COLUMN "timeProvenance" SET NOT NULL;

CREATE INDEX "inventory_transactions_org_effective_recorded_id_idx"
  ON "inventory_transactions"("organizationId", "effectiveAt", "recordedAt", "id");

CREATE INDEX "inventory_transactions_org_recorded_id_idx"
  ON "inventory_transactions"("organizationId", "recordedAt", "id");