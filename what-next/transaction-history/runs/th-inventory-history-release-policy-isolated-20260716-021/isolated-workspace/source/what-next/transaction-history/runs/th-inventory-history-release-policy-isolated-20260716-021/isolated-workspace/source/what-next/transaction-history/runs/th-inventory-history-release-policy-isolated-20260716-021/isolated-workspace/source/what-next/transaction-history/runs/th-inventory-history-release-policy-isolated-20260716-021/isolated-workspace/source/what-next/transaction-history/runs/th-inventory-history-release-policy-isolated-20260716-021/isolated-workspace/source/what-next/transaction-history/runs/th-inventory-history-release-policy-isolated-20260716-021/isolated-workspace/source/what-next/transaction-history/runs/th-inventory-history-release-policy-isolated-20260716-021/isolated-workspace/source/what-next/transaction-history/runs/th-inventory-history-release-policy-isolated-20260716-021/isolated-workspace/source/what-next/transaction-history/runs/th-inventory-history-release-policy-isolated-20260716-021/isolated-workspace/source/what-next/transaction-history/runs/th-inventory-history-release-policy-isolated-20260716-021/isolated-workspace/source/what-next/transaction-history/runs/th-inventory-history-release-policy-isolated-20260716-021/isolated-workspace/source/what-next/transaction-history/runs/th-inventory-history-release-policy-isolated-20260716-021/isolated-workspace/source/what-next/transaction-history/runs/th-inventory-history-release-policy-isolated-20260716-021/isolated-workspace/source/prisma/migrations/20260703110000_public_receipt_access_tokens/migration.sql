-- Add durable, hash-only public receipt token registry for revocation.
CREATE TYPE "PublicReceiptAccessTokenStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

CREATE TABLE "public_receipt_access_tokens" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "jtiHash" TEXT NOT NULL,
  "status" "PublicReceiptAccessTokenStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedById" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  "lastAccessedAt" TIMESTAMP(3),
  "accessCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "public_receipt_access_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_receipt_access_tokens_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "public_receipt_access_tokens_salesOrderId_fkey"
    FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "public_receipt_access_tokens_org_token_hash_key"
  ON "public_receipt_access_tokens"("organizationId", "tokenHash");

CREATE UNIQUE INDEX "public_receipt_access_tokens_org_jti_hash_key"
  ON "public_receipt_access_tokens"("organizationId", "jtiHash");

CREATE INDEX "public_receipt_access_tokens_org_sale_status_idx"
  ON "public_receipt_access_tokens"("organizationId", "salesOrderId", "status");

CREATE INDEX "public_receipt_access_tokens_org_status_expires_idx"
  ON "public_receipt_access_tokens"("organizationId", "status", "expiresAt");