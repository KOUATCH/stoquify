DROP INDEX "agent_runs_correlationId_key";

CREATE UNIQUE INDEX "agent_runs_organizationId_actorId_agentKey_correlationId_key"
  ON "agent_runs"("organizationId", "actorId", "agentKey", "correlationId");
