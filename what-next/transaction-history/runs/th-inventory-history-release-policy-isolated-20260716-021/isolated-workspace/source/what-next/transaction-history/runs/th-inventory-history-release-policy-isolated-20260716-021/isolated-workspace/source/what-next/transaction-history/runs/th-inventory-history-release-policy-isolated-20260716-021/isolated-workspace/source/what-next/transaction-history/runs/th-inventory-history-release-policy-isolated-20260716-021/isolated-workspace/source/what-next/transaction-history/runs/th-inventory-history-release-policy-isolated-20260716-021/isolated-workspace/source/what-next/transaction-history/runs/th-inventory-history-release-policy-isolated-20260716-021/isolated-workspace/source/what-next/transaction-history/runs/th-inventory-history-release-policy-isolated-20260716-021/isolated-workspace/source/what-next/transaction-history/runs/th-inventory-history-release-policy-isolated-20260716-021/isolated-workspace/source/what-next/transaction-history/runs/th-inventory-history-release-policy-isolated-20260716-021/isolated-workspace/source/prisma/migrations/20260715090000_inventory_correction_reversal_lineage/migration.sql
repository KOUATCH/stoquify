CREATE TYPE "StockAdjustmentCorrectionKind" AS ENUM ('REVERSAL');

ALTER TABLE "stock_adjustments"
  ADD COLUMN "correctionKind" "StockAdjustmentCorrectionKind",
  ADD COLUMN "reversalOfAdjustmentId" TEXT;

ALTER TABLE "inventory_transactions"
  ADD COLUMN "reversalOfTransactionId" TEXT;

CREATE UNIQUE INDEX "stock_adjustments_reversalOfAdjustmentId_key"
  ON "stock_adjustments"("reversalOfAdjustmentId");

CREATE UNIQUE INDEX "inventory_transactions_reversalOfTransactionId_key"
  ON "inventory_transactions"("reversalOfTransactionId");

ALTER TABLE "stock_adjustments"
  ADD CONSTRAINT "stock_adjustments_reversalOfAdjustmentId_fkey"
  FOREIGN KEY ("reversalOfAdjustmentId") REFERENCES "stock_adjustments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_reversalOfTransactionId_fkey"
  FOREIGN KEY ("reversalOfTransactionId") REFERENCES "inventory_transactions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_adjustments"
  ADD CONSTRAINT "stock_adjustments_reversal_control_check"
  CHECK (
    ("reversalOfAdjustmentId" IS NULL AND "correctionKind" IS NULL)
    OR (
      "reversalOfAdjustmentId" IS NOT NULL
      AND "reversalOfAdjustmentId" <> "id"
      AND "correctionKind" = 'REVERSAL'
      AND "createdById" IS NOT NULL
      AND "approvedById" IS NOT NULL
      AND "createdById" <> "approvedById"
      AND length(btrim("reason")) > 0
    )
  );

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_reversal_control_check"
  CHECK (
    "reversalOfTransactionId" IS NULL
    OR "reversalOfTransactionId" <> "id"
  );
