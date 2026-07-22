CREATE TYPE "CashShortagePolicyStatus" AS ENUM ('DRAFT', 'APPROVED');
CREATE TYPE "CashShortagePolicyMode" AS ENUM ('OBSERVE');
CREATE TYPE "CashShortageRoundingMode" AS ENUM ('HALF_UP', 'HALF_EVEN');

CREATE TABLE "cash_shortage_policies" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "reviewThreshold" DECIMAL(19, 4) NOT NULL,
  "highThreshold" DECIMAL(19, 4) NOT NULL,
  "minorUnitScale" INTEGER NOT NULL,
  "roundingMode" "CashShortageRoundingMode" NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "mode" "CashShortagePolicyMode" NOT NULL DEFAULT 'OBSERVE',
  "status" "CashShortagePolicyStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "documentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cash_shortage_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cash_shortage_policies_version_check" CHECK ("version" > 0),
  CONSTRAINT "cash_shortage_policies_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "cash_shortage_policies_scale_check" CHECK ("minorUnitScale" BETWEEN 0 AND 4),
  CONSTRAINT "cash_shortage_policies_threshold_check" CHECK (
    "reviewThreshold" > 0
    AND "highThreshold" >= "reviewThreshold"
    AND "reviewThreshold" = ROUND("reviewThreshold", "minorUnitScale")
    AND "highThreshold" = ROUND("highThreshold", "minorUnitScale")
  ),
  CONSTRAINT "cash_shortage_policies_effective_window_check" CHECK (
    "effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom"
  ),
  CONSTRAINT "cash_shortage_policies_approval_evidence_check" CHECK (
    (
      "status" = 'DRAFT'
      AND "approvedById" IS NULL
      AND "approvedAt" IS NULL
      AND "documentHash" IS NULL
    )
    OR
    (
      "status" = 'APPROVED'
      AND "approvedById" IS NOT NULL
      AND "approvedAt" IS NOT NULL
      AND "documentHash" ~ '^[a-f0-9]{64}$'
    )
  ),
  CONSTRAINT "cash_shortage_policies_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cash_shortage_policies_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cash_shortage_policies_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "cash_shortage_policies_organizationId_currency_version_key"
  ON "cash_shortage_policies"("organizationId", "currency", "version");

CREATE INDEX "cash_shortage_policies_organizationId_currency_status_effectiveFrom_idx"
  ON "cash_shortage_policies"("organizationId", "currency", "status", "effectiveFrom");

CREATE INDEX "cash_shortage_policies_createdById_idx"
  ON "cash_shortage_policies"("createdById");

CREATE INDEX "cash_shortage_policies_approvedById_idx"
  ON "cash_shortage_policies"("approvedById");

CREATE FUNCTION "prevent_approved_cash_shortage_policy_update"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'APPROVED' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'approved cash-shortage policies are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "cash_shortage_policies_approved_immutable"
BEFORE UPDATE ON "cash_shortage_policies"
FOR EACH ROW
EXECUTE FUNCTION "prevent_approved_cash_shortage_policy_update"();
