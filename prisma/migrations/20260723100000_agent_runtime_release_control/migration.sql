ALTER TYPE "WorkflowAssuranceAlertDeliveryStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TABLE "workflow_assurance_alert_deliveries"
  ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "externalReference" TEXT;
CREATE INDEX IF NOT EXISTS "workflow_assurance_alert_deliveries_channel_status_nextAttemptAt_idx"
  ON "workflow_assurance_alert_deliveries"("channel", "status", "nextAttemptAt");
ALTER TYPE "WorkflowAssuranceWorkflow" ADD VALUE IF NOT EXISTS 'AGENT_RUNTIME';

CREATE TYPE "AgentActivationState" AS ENUM ('DRAFT','REVIEWED','APPROVED','PROVISIONED_INACTIVE','PILOT_CERTIFIED','ACTIVE_INTERNAL','SUSPENDED','RETIRED');
CREATE TYPE "AgentApprovalType" AS ENUM ('PRODUCT','SECURITY');
CREATE TYPE "AgentApprovalDecision" AS ENUM ('APPROVED','REJECTED','REVOKED');
CREATE TYPE "AgentOwnerResponsibility" AS ENUM ('ROLLOUT','ROLLBACK','SUPPORT','PILOT','SECURITY_INCIDENT','ON_CALL_BACKUP');
CREATE TYPE "AgentCertificationResult" AS ENUM ('PASSED','FAILED','INVALIDATED');

CREATE TABLE "agent_activation_packages" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentKey" TEXT NOT NULL,
  "releaseVersion" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "commitSha" VARCHAR(64) NOT NULL,
  "manifestHash" VARCHAR(71) NOT NULL,
  "manifest" JSONB NOT NULL,
  "modelProviderPolicy" JSONB NOT NULL,
  "allowedRoleCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "activationStartsAt" TIMESTAMP(3) NOT NULL,
  "activationEndsAt" TIMESTAMP(3) NOT NULL,
  "residualRisks" JSONB,
  "state" "AgentActivationState" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "requestedById" TEXT NOT NULL,
  "activatedById" TEXT,
  "activatedAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "suspensionReason" TEXT,
  "lastReconciledAt" TIMESTAMP(3),
  "reconciliationState" TEXT,
  "alertTransportReady" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_activation_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_activation_approvals" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "approvalType" "AgentApprovalType" NOT NULL,
  "decision" "AgentApprovalDecision" NOT NULL,
  "approverId" TEXT NOT NULL,
  "evidenceHash" VARCHAR(71) NOT NULL,
  "riskAcceptance" JSONB,
  "decidedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_activation_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_activation_owners" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "responsibility" "AgentOwnerResponsibility" NOT NULL,
  "primaryUserId" TEXT NOT NULL,
  "backupUserId" TEXT,
  "escalationRouteRef" TEXT NOT NULL,
  "runbookVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "coverageStartsAt" TIMESTAMP(3) NOT NULL,
  "coverageEndsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_activation_owners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_pilot_certifications" (
  "id" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "commitSha" VARCHAR(64) NOT NULL,
  "manifestHash" VARCHAR(71) NOT NULL,
  "suiteVersion" TEXT NOT NULL,
  "ciRunId" TEXT NOT NULL,
  "result" "AgentCertificationResult" NOT NULL,
  "reportHash" VARCHAR(71) NOT NULL,
  "passedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_pilot_certifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_activation_packages_environment_agentKey_releaseVersion_key" ON "agent_activation_packages"("environment","agentKey","releaseVersion");
CREATE INDEX "agent_activation_packages_organizationId_agentKey_state_idx" ON "agent_activation_packages"("organizationId","agentKey","state");
CREATE INDEX "agent_activation_packages_environment_agentKey_state_idx" ON "agent_activation_packages"("environment","agentKey","state");
CREATE INDEX "agent_activation_packages_manifestHash_idx" ON "agent_activation_packages"("manifestHash");
CREATE INDEX "agent_activation_approvals_packageId_approvalType_decision_expiresAt_idx" ON "agent_activation_approvals"("packageId","approvalType","decision","expiresAt");
CREATE INDEX "agent_activation_approvals_approverId_decidedAt_idx" ON "agent_activation_approvals"("approverId","decidedAt");
CREATE UNIQUE INDEX "agent_activation_owners_packageId_responsibility_key" ON "agent_activation_owners"("packageId","responsibility");
CREATE INDEX "agent_activation_owners_primaryUserId_responsibility_idx" ON "agent_activation_owners"("primaryUserId","responsibility");
CREATE INDEX "agent_activation_owners_packageId_acceptedAt_validUntil_idx" ON "agent_activation_owners"("packageId","acceptedAt","validUntil");
CREATE UNIQUE INDEX "agent_pilot_certifications_packageId_ciRunId_key" ON "agent_pilot_certifications"("packageId","ciRunId");
CREATE INDEX "agent_pilot_certifications_packageId_result_expiresAt_idx" ON "agent_pilot_certifications"("packageId","result","expiresAt");
CREATE INDEX "agent_pilot_certifications_commitSha_manifestHash_idx" ON "agent_pilot_certifications"("commitSha","manifestHash");

ALTER TABLE "agent_activation_packages" ADD CONSTRAINT "agent_activation_packages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_activation_approvals" ADD CONSTRAINT "agent_activation_approvals_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "agent_activation_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_activation_owners" ADD CONSTRAINT "agent_activation_owners_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "agent_activation_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_pilot_certifications" ADD CONSTRAINT "agent_pilot_certifications_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "agent_activation_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
