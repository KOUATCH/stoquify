-- Keep policy incidents tenant-consistent without blocking tenant lifecycle cleanup.
ALTER TABLE "agent_policy_incidents"
  DROP CONSTRAINT "agent_policy_incidents_runId_organizationId_fkey";

ALTER TABLE "agent_policy_incidents"
  ADD CONSTRAINT "agent_policy_incidents_runId_organizationId_fkey"
  FOREIGN KEY ("runId", "organizationId")
  REFERENCES "agent_runs"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;
