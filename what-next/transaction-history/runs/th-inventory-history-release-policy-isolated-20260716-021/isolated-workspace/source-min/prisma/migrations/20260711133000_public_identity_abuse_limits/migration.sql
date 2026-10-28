-- Durable, privacy-preserving throttling for custom public identity workflows.
-- Only HMAC subject hashes are stored. Raw email, token, user id, and IP values are prohibited.

CREATE TABLE "public_identity_abuse_buckets" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "blockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "public_identity_abuse_buckets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "public_identity_abuse_buckets_scope_subjectHash_key"
  ON "public_identity_abuse_buckets"("scope", "subjectHash");

CREATE INDEX "public_identity_abuse_buckets_blockedUntil_idx"
  ON "public_identity_abuse_buckets"("blockedUntil");

CREATE INDEX "public_identity_abuse_buckets_updatedAt_idx"
  ON "public_identity_abuse_buckets"("updatedAt");
