-- CreateEnum
CREATE TYPE "AiActionProposalStatus" AS ENUM (
  'DRAFT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "ai_action_proposals" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "proposalType" TEXT NOT NULL,
  "targetRoute" TEXT NOT NULL,
  "requiredPermission" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "evidenceRefs" JSONB NOT NULL,
  "sourceHash" VARCHAR(64) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "asOf" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "AiActionProposalStatus" NOT NULL DEFAULT 'DRAFT',
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_action_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_action_proposals_organizationId_idempotencyKey_key"
ON "ai_action_proposals"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ai_action_proposals_id_organizationId_key"
ON "ai_action_proposals"("id", "organizationId");

-- CreateIndex
CREATE INDEX "ai_action_proposals_organizationId_status_createdAt_idx"
ON "ai_action_proposals"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ai_action_proposals_runId_organizationId_idx"
ON "ai_action_proposals"("runId", "organizationId");

-- CreateIndex
CREATE INDEX "ai_action_proposals_expiresAt_status_idx"
ON "ai_action_proposals"("expiresAt", "status");

-- AddForeignKey
ALTER TABLE "ai_action_proposals"
ADD CONSTRAINT "ai_action_proposals_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action_proposals"
ADD CONSTRAINT "ai_action_proposals_runId_organizationId_fkey"
FOREIGN KEY ("runId", "organizationId")
REFERENCES "agent_runs"("id", "organizationId")
ON DELETE CASCADE ON UPDATE CASCADE;
