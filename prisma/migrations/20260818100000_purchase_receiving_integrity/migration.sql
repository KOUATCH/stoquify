-- P0 purchase receiving integrity boundary.
--
-- Additive only: existing PO/GRN identifiers and receipt facts are preserved.
-- Legacy rows keep nullable command evidence; every new receipt finalized by the
-- application supplies an idempotency key, payload hash, and finalized timestamp.

CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" VARCHAR(32) NOT NULL,
    "scopeKey" VARCHAR(64) NOT NULL DEFAULT 'GLOBAL',
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "document_sequences_next_value_check" CHECK ("nextValue" > 0)
);

CREATE UNIQUE INDEX "document_sequences_organizationId_documentType_scopeKey_key"
    ON "document_sequences"("organizationId", "documentType", "scopeKey");
CREATE INDEX "document_sequences_organizationId_documentType_idx"
    ON "document_sequences"("organizationId", "documentType");

ALTER TABLE "document_sequences"
    ADD CONSTRAINT "document_sequences_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goods_receipts"
    ADD COLUMN "idempotencyKey" VARCHAR(191),
    ADD COLUMN "payloadHash" VARCHAR(64),
    ADD COLUMN "finalizedAt" TIMESTAMP(3);

ALTER TABLE "goods_receipts"
    ADD CONSTRAINT "goods_receipts_command_evidence_check" CHECK (
        ("idempotencyKey" IS NULL AND "payloadHash" IS NULL)
        OR (
            "idempotencyKey" IS NOT NULL
            AND char_length(btrim("idempotencyKey")) BETWEEN 8 AND 191
            AND "idempotencyKey" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,190}$'
            AND "payloadHash" IS NOT NULL
            AND "payloadHash" ~ '^[0-9a-f]{64}$'
            AND "finalizedAt" IS NOT NULL
        )
    );

CREATE UNIQUE INDEX "goods_receipts_organizationId_idempotencyKey_key"
    ON "goods_receipts"("organizationId", "idempotencyKey");
CREATE INDEX "goods_receipts_organizationId_purchaseOrderId_status_idx"
    ON "goods_receipts"("organizationId", "purchaseOrderId", "status");

-- Start each allocator above the highest conforming legacy identifier. The
-- deterministic IDs make this backfill stable in rehearsals without changing
-- or reusing any previously issued number.
INSERT INTO "document_sequences" (
    "id", "organizationId", "documentType", "scopeKey", "nextValue", "createdAt", "updatedAt"
)
SELECT
    'p2pseq_' || md5(po."organizationId" || ':PURCHASE_ORDER:GLOBAL'),
    po."organizationId",
    'PURCHASE_ORDER',
    'GLOBAL',
    COALESCE(MAX(
        CASE
            WHEN po."orderNumber" ~ '^PO-[0-9]+$'
            THEN substring(po."orderNumber" FROM 4)::INTEGER
            ELSE NULL
        END
    ), 0) + 1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "purchase_orders" po
GROUP BY po."organizationId";

INSERT INTO "document_sequences" (
    "id", "organizationId", "documentType", "scopeKey", "nextValue", "createdAt", "updatedAt"
)
SELECT
    'p2pseq_' || md5(gr."organizationId" || ':GOODS_RECEIPT:GLOBAL'),
    gr."organizationId",
    'GOODS_RECEIPT',
    'GLOBAL',
    COALESCE(MAX(
        CASE
            WHEN gr."receiptNumber" ~ '^GR-[0-9]+$'
            THEN substring(gr."receiptNumber" FROM 4)::INTEGER
            ELSE NULL
        END
    ), 0) + 1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "goods_receipts" gr
GROUP BY gr."organizationId";
