CREATE TYPE "AgentReconcilerInvocationStatus" AS ENUM (
  'RUNNING',
  'COMPLETED',
  'COMPLETED_WITH_WARNINGS',
  'FAILED'
);

CREATE TABLE "agent_reconciler_invocations" (
  "id" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "scheduleKey" VARCHAR(100) NOT NULL,
  "runId" VARCHAR(191) NOT NULL,
  "requestHash" VARCHAR(71) NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "status" "AgentReconcilerInvocationStatus" NOT NULL DEFAULT 'RUNNING',
  "activeKey" VARCHAR(100),
  "correlationId" VARCHAR(191) NOT NULL,
  "result" JSONB,
  "failureCode" VARCHAR(100),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agent_reconciler_invocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_reconciler_invocation_identity"
  ON "agent_reconciler_invocations"("environment", "scheduleKey", "runId");

CREATE UNIQUE INDEX "agent_reconciler_active_lease"
  ON "agent_reconciler_invocations"("environment", "activeKey");

CREATE INDEX "agent_reconciler_invocation_schedule_idx"
  ON "agent_reconciler_invocations"("environment", "scheduleKey", "scheduledAt");

CREATE INDEX "agent_reconciler_invocation_status_idx"
  ON "agent_reconciler_invocations"("environment", "status", "startedAt");
