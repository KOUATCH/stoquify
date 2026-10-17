-- No business PO, number, stock or payable is created by saving authoring work.
-- Depends on the compound User key in 20261004120000_access_requests.
CREATE TABLE "purchase_order_authoring_drafts" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "title" VARCHAR(100) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "content" JSONB NOT NULL,
  "lastSaveHash" TEXT NOT NULL,
  "commandHash" TEXT,
  "preparedAt" TIMESTAMP(3),
  "resultOrderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "po_authoring_actor_fkey" FOREIGN KEY ("organizationId", "actorId") REFERENCES "users" ("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "po_authoring_result_fkey" FOREIGN KEY ("organizationId", "resultOrderId") REFERENCES "purchase_orders" ("organizationId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "po_authoring_revision_check" CHECK (revision > 0),
  CONSTRAINT "po_authoring_content_check" CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT "po_authoring_state_check" CHECK (
    (status = 'ACTIVE' AND "commandHash" IS NULL AND "preparedAt" IS NULL AND "resultOrderId" IS NULL) OR
    (status = 'PREPARED' AND "commandHash" IS NOT NULL AND "preparedAt" IS NOT NULL AND "resultOrderId" IS NULL) OR
    (status = 'CREATED' AND "commandHash" IS NOT NULL AND "preparedAt" IS NOT NULL AND "resultOrderId" IS NOT NULL) OR
    (status = 'DISCARDED' AND "resultOrderId" IS NULL)
  )
);
CREATE INDEX "po_authoring_scope_page_idx" ON "purchase_order_authoring_drafts" ("organizationId", "actorId", "createdAt", "id");
CREATE UNIQUE INDEX "po_authoring_result_key" ON "purchase_order_authoring_drafts" ("organizationId", "resultOrderId");
