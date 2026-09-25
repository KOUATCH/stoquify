CREATE TABLE "picture_assets" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT 'item',
  "providerKey" TEXT,
  "providerUrl" TEXT,
  "encryptionKey" TEXT NOT NULL,
  "encryptionIv" TEXT NOT NULL,
  "encryptionTag" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteLength" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'uploading',
  "attachedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "picture_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "picture_assets_providerKey_key" ON "picture_assets"("providerKey");
CREATE INDEX "picture_assets_organizationId_status_createdAt_idx" ON "picture_assets"("organizationId", "status", "createdAt");
