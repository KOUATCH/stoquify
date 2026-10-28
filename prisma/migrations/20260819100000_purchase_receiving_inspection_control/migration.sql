-- P0 purchase receiving inspection control.
--
-- Additive only: legacy receipts remain readable as RECEIVED/COMPLETED facts.
-- New receipt commands must persist inspection evidence; failed or incomplete
-- inspections remain HELD and cannot post stock or qualify for AP matching.

ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'HELD' BEFORE 'RECEIVED';
ALTER TYPE "GoodsReceiptStatus" ADD VALUE IF NOT EXISTS 'REJECTED' BEFORE 'CANCELLED';

CREATE TYPE "GoodsReceiptInspectionOutcome" AS ENUM ('PASSED', 'FAILED', 'INCOMPLETE');
CREATE TYPE "GoodsReceiptInspectionResolutionDecision" AS ENUM ('ACCEPT', 'REJECT');

ALTER TABLE "goods_receipts"
    ADD COLUMN "inventoryPostedAt" TIMESTAMP(3);

-- Serial identifiers must remain attached to held arrival evidence so an
-- authorized later acceptance can create the exact available units once.
ALTER TABLE "goods_receipt_lines"
    ADD COLUMN "serialNumbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "goods_receipt_inspections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "outcome" "GoodsReceiptInspectionOutcome" NOT NULL,
    "inspectedById" TEXT NOT NULL,
    "reason" TEXT,
    "evidenceNotes" TEXT,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_inspections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goods_receipt_inspections_reason_check" CHECK (
        "outcome" = 'PASSED'
        OR ("reason" IS NOT NULL AND char_length(btrim("reason")) > 0)
    )
);

CREATE UNIQUE INDEX "goods_receipt_inspections_goodsReceiptId_key"
    ON "goods_receipt_inspections"("goodsReceiptId");
CREATE UNIQUE INDEX "gr_inspection_org_receipt_key"
    ON "goods_receipt_inspections"("organizationId", "goodsReceiptId");
CREATE INDEX "gr_inspection_org_outcome_at_idx"
    ON "goods_receipt_inspections"("organizationId", "outcome", "inspectedAt");

ALTER TABLE "goods_receipt_inspections"
    ADD CONSTRAINT "goods_receipt_inspections_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_inspections"
    ADD CONSTRAINT "goods_receipt_inspections_goodsReceiptId_fkey"
    FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_inspections"
    ADD CONSTRAINT "goods_receipt_inspections_inspectedById_fkey"
    FOREIGN KEY ("inspectedById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "goods_receipt_inspection_resolutions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "decision" "GoodsReceiptInspectionResolutionDecision" NOT NULL,
    "resolvedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" VARCHAR(191) NOT NULL,
    "payloadHash" VARCHAR(64) NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipt_inspection_resolutions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "goods_receipt_inspection_resolutions_reason_check" CHECK (
        char_length(btrim("reason")) > 0
    ),
    CONSTRAINT "goods_receipt_inspection_resolutions_command_evidence_check" CHECK (
        char_length(btrim("idempotencyKey")) BETWEEN 8 AND 191
        AND "idempotencyKey" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$'
        AND "payloadHash" ~ '^[0-9a-f]{64}$'
    )
);

CREATE UNIQUE INDEX "goods_receipt_inspection_resolutions_goodsReceiptId_key"
    ON "goods_receipt_inspection_resolutions"("goodsReceiptId");
CREATE UNIQUE INDEX "goods_receipt_inspection_resolutions_inspectionId_key"
    ON "goods_receipt_inspection_resolutions"("inspectionId");
CREATE UNIQUE INDEX "gr_inspection_resolution_org_idem_key"
    ON "goods_receipt_inspection_resolutions"("organizationId", "idempotencyKey");
CREATE INDEX "gr_inspection_resolution_org_decision_idx"
    ON "goods_receipt_inspection_resolutions"("organizationId", "decision", "resolvedAt");

ALTER TABLE "goods_receipt_inspection_resolutions"
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_inspection_resolutions"
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_goodsReceiptId_fkey"
    FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_inspection_resolutions"
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "goods_receipt_inspections"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_inspection_resolutions"
    ADD CONSTRAINT "goods_receipt_inspection_resolutions_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
