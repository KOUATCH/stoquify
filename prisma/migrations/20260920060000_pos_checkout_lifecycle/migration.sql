CREATE TYPE "POSCartState" AS ENUM ('ACTIVE', 'PARKED', 'RETIRED');
ALTER TABLE "sales_orders" ADD COLUMN "posCartState" "POSCartState" NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE "pos_checkout_workspaces" (
  "sessionId" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "leaseId" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "pendingRequest" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pos_checkout_workspaces_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "pos_checkout_workspaces_organizationId_actorId_idx" ON "pos_checkout_workspaces"("organizationId", "actorId");
CREATE INDEX "sales_orders_pos_cart_scope_idx" ON "sales_orders"("organizationId", "createdById", "sessionId", "posCartState") WHERE "channel" = 'POS' AND "status" = 'DRAFT' AND "deletedAt" IS NULL;
