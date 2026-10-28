-- CreateEnum
CREATE TYPE "AccountantAccessRole" AS ENUM ('READ_ONLY', 'REVIEWER', 'PREPARER');

-- CreateEnum
CREATE TYPE "AccountantAccessStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "accountant_access_grants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountantUserId" TEXT NOT NULL,
    "accountantFirmName" TEXT NOT NULL,
    "accountantFirmRegistrationNumber" TEXT,
    "role" "AccountantAccessRole" NOT NULL,
    "status" "AccountantAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeScopeKey" TEXT,
    "consentGrantedById" TEXT NOT NULL,
    "consentGrantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentEvidenceHash" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "correlationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accountant_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accountant_access_grants_activeScopeKey_key"
ON "accountant_access_grants"("activeScopeKey");

-- CreateIndex
CREATE INDEX "accountant_access_grants_organizationId_status_expiresAt_idx"
ON "accountant_access_grants"("organizationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "accountant_access_grants_accountantUserId_status_expiresAt_idx"
ON "accountant_access_grants"("accountantUserId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "accountant_access_grants_organizationId_accountantUserId_cr_idx"
ON "accountant_access_grants"("organizationId", "accountantUserId", "createdAt");

-- CreateIndex
CREATE INDEX "accountant_access_grants_correlationId_idx"
ON "accountant_access_grants"("correlationId");

-- AddForeignKey
ALTER TABLE "accountant_access_grants"
ADD CONSTRAINT "accountant_access_grants_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
