-- Phase 1 agent runtime governance. No operational business table is mutated.
CREATE TYPE "AgentDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');
CREATE TYPE "AgentRolloutMode" AS ENUM ('INTERNAL', 'SHADOW', 'PILOT', 'GENERAL');
CREATE TYPE "AgentRiskLevel" AS ENUM ('READ_ONLY', 'DRAFT', 'LOW_RISK', 'SENSITIVE', 'PROHIBITED');
CREATE TYPE "AgentToolType" AS ENUM ('READ_ONLY', 'DRAFT', 'ACTION', 'PROHIBITED');
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED');
CREATE TYPE "AgentStepKind" AS ENUM ('CONTEXT', 'TOOL', 'EVIDENCE', 'REDACTION', 'SUMMARY', 'POLICY');
CREATE TYPE "AgentStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED');
CREATE TYPE "AgentEvidenceFreshness" AS ENUM ('FRESH', 'STALE', 'PARTIAL', 'BLOCKED', 'FAILED', 'EMPTY', 'UNKNOWN');
CREATE TYPE "AgentPolicyIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AgentPolicyIncidentStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "agent_definitions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "ownerModuleSlug" TEXT NOT NULL,
  "status" "AgentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "rolloutMode" "AgentRolloutMode" NOT NULL DEFAULT 'INTERNAL',
  "riskLevel" "AgentRiskLevel" NOT NULL,
  "defaultModelPolicy" JSONB,
  "allowedToolKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowedSkillKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_skill_definitions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "domain" TEXT NOT NULL,
  "promptHash" TEXT NOT NULL,
  "ownerModuleSlug" TEXT NOT NULL,
  "requiredPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "redactionCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "AgentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_skill_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_tool_definitions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "ownerService" TEXT NOT NULL,
  "moduleSlug" TEXT NOT NULL,
  "requiredPermission" TEXT NOT NULL,
  "riskLevel" "AgentRiskLevel" NOT NULL,
  "toolType" "AgentToolType" NOT NULL,
  "inputSchemaHash" TEXT NOT NULL,
  "outputSchemaHash" TEXT NOT NULL,
  "approvalPolicy" TEXT NOT NULL,
  "idempotencyMode" TEXT NOT NULL,
  "status" "AgentDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_tool_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_runs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "agentDefinitionId" TEXT,
  "agentKey" TEXT NOT NULL,
  "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
  "sourceRoute" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "correlationId" TEXT NOT NULL,
  "safeSummary" TEXT,
  "failureCode" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_runs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_runs_agentDefinitionId_fkey" FOREIGN KEY ("agentDefinitionId") REFERENCES "agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "agent_steps" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "stepNumber" INTEGER NOT NULL,
  "kind" "AgentStepKind" NOT NULL,
  "toolKey" TEXT,
  "status" "AgentStepStatus" NOT NULL DEFAULT 'PENDING',
  "inputHash" TEXT,
  "outputHash" TEXT,
  "safeSummary" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_steps_stepNumber_check" CHECK ("stepNumber" >= 0)
);

CREATE TABLE "agent_evidence_links" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "stepId" TEXT,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "sourceTable" TEXT,
  "sourceHash" TEXT,
  "evidenceGrade" TEXT NOT NULL,
  "freshness" "AgentEvidenceFreshness" NOT NULL,
  "available" BOOLEAN NOT NULL DEFAULT true,
  "blockerCount" INTEGER NOT NULL DEFAULT 0,
  "redactionCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_evidence_links_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_evidence_links_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_evidence_links_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "agent_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "agent_evidence_links_counts_check" CHECK ("blockerCount" >= 0 AND "redactionCount" >= 0)
);

CREATE TABLE "agent_feedback" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "helpful" BOOLEAN,
  "accepted" BOOLEAN,
  "rejectedReason" TEXT,
  "staleAnswer" BOOLEAN NOT NULL DEFAULT false,
  "wrongAnswer" BOOLEAN NOT NULL DEFAULT false,
  "unsafeAttempt" BOOLEAN NOT NULL DEFAULT false,
  "correctionText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_feedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_feedback_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_feedback_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "agent_cost_ledger" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "modelProvider" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCost" DECIMAL(19,6) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL,
  "budgetBucket" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_cost_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_cost_ledger_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_cost_ledger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "agent_cost_ledger_nonnegative_check" CHECK ("promptTokens" >= 0 AND "completionTokens" >= 0 AND "estimatedCost" >= 0)
);

CREATE TABLE "agent_policy_incidents" (
  "id" TEXT NOT NULL,
  "runId" TEXT,
  "organizationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "incidentType" TEXT NOT NULL,
  "severity" "AgentPolicyIncidentSeverity" NOT NULL,
  "policyKey" TEXT NOT NULL,
  "blockedToolKey" TEXT,
  "safeSummary" TEXT NOT NULL,
  "status" "AgentPolicyIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_policy_incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_policy_incidents_runId_fkey" FOREIGN KEY ("runId") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "agent_policy_incidents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "agent_definitions_key_key" ON "agent_definitions"("key");
CREATE INDEX "agent_definitions_ownerModuleSlug_status_idx" ON "agent_definitions"("ownerModuleSlug", "status");
CREATE UNIQUE INDEX "agent_skill_definitions_key_version_key" ON "agent_skill_definitions"("key", "version");
CREATE INDEX "agent_skill_definitions_ownerModuleSlug_status_idx" ON "agent_skill_definitions"("ownerModuleSlug", "status");
CREATE UNIQUE INDEX "agent_tool_definitions_key_key" ON "agent_tool_definitions"("key");
CREATE INDEX "agent_tool_definitions_moduleSlug_status_idx" ON "agent_tool_definitions"("moduleSlug", "status");
CREATE UNIQUE INDEX "agent_runs_correlationId_key" ON "agent_runs"("correlationId");
CREATE INDEX "agent_runs_organizationId_createdAt_idx" ON "agent_runs"("organizationId", "createdAt");
CREATE INDEX "agent_runs_actorId_createdAt_idx" ON "agent_runs"("actorId", "createdAt");
CREATE INDEX "agent_runs_agentKey_status_createdAt_idx" ON "agent_runs"("agentKey", "status", "createdAt");
CREATE UNIQUE INDEX "agent_steps_runId_stepNumber_key" ON "agent_steps"("runId", "stepNumber");
CREATE INDEX "agent_steps_toolKey_status_idx" ON "agent_steps"("toolKey", "status");
CREATE INDEX "agent_evidence_links_runId_idx" ON "agent_evidence_links"("runId");
CREATE INDEX "agent_evidence_links_stepId_idx" ON "agent_evidence_links"("stepId");
CREATE INDEX "agent_evidence_links_subjectType_subjectId_idx" ON "agent_evidence_links"("subjectType", "subjectId");
CREATE INDEX "agent_feedback_runId_idx" ON "agent_feedback"("runId");
CREATE INDEX "agent_feedback_organizationId_actorId_createdAt_idx" ON "agent_feedback"("organizationId", "actorId", "createdAt");
CREATE INDEX "agent_cost_ledger_runId_idx" ON "agent_cost_ledger"("runId");
CREATE INDEX "agent_cost_ledger_organizationId_createdAt_idx" ON "agent_cost_ledger"("organizationId", "createdAt");
CREATE INDEX "agent_cost_ledger_modelProvider_modelName_idx" ON "agent_cost_ledger"("modelProvider", "modelName");
CREATE INDEX "agent_policy_incidents_runId_idx" ON "agent_policy_incidents"("runId");
CREATE INDEX "agent_policy_incidents_organizationId_severity_status_idx" ON "agent_policy_incidents"("organizationId", "severity", "status");
CREATE INDEX "agent_policy_incidents_actorId_createdAt_idx" ON "agent_policy_incidents"("actorId", "createdAt");
