ALTER TABLE "sessions"
ADD COLUMN "assuranceVerifiedAt" TIMESTAMP(3),
ADD COLUMN "assuranceMethod" TEXT,
ADD COLUMN "assuranceOrganizationId" TEXT,
ADD COLUMN "assuranceLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "assuranceFailureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "assuranceLockedUntil" TIMESTAMP(3);
