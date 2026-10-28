-- Persist the approval risk decision so maker-checker evidence remains bound to
-- the reviewed batch. Existing batches are standard until they are restaged.

CREATE TYPE "OnboardingImportRiskLevel" AS ENUM ('STANDARD', 'HIGH');

ALTER TABLE "onboarding_import_batches"
ADD COLUMN "riskLevel" "OnboardingImportRiskLevel" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "riskReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "onboarding_import_batches_org_risk_status_idx"
ON "onboarding_import_batches"("organizationId", "riskLevel", "status", "createdAt");
