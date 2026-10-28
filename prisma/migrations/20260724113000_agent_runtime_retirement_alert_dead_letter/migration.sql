ALTER TYPE "WorkflowAssuranceAlertDeliveryStatus"
ADD VALUE IF NOT EXISTS 'DEAD_LETTER';

ALTER TABLE "agent_activation_packages"
ADD COLUMN "retiredAt" TIMESTAMP(3),
ADD COLUMN "retiredById" TEXT,
ADD COLUMN "retirementReason" TEXT;

CREATE INDEX "agent_activation_packages_organizationId_retiredAt_idx"
ON "agent_activation_packages"("organizationId", "retiredAt");
