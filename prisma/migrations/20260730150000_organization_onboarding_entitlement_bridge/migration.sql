-- Baseline-only organization onboarding and entitlement bridge reconstructed
-- from the schema at commit 1b83ef12c792e1956f1108962ec9634257f55feb.
-- Existing databases that already contain these columns must adopt this
-- migration with `prisma migrate resolve --applied`; they must never execute it.
BEGIN;

DO $baseline_guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'requestedModules'
  )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Organization entitlement baseline bridge refused: use prisma migrate resolve --applied after schema verification on an existing database.';
  END IF;
END
$baseline_guard$;

ALTER TABLE "organizations"
ADD COLUMN "assistedSetupRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "branchCount" TEXT,
ADD COLUMN "businessType" TEXT,
ADD COLUMN "companySize" TEXT,
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN "onboardingSource" TEXT,
ADD COLUMN "primaryPain" TEXT,
ADD COLUMN "requestedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "setupRole" TEXT,
ADD COLUMN "taxIdentifier" TEXT,
ADD COLUMN "tradeName" TEXT;

COMMIT;
