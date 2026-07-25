-- Preserve tenant and evidence lineage at the database boundary.
CREATE UNIQUE INDEX "agent_runs_id_organizationId_key"
  ON "agent_runs"("id", "organizationId");

CREATE UNIQUE INDEX "agent_steps_id_runId_key"
  ON "agent_steps"("id", "runId");

ALTER TABLE "agent_evidence_links"
  DROP CONSTRAINT "agent_evidence_links_stepId_fkey";

ALTER TABLE "agent_feedback"
  DROP CONSTRAINT "agent_feedback_runId_fkey";

ALTER TABLE "agent_cost_ledger"
  DROP CONSTRAINT "agent_cost_ledger_runId_fkey";

ALTER TABLE "agent_policy_incidents"
  DROP CONSTRAINT "agent_policy_incidents_runId_fkey";

ALTER TABLE "agent_evidence_links"
  ADD CONSTRAINT "agent_evidence_links_stepId_runId_fkey"
  FOREIGN KEY ("stepId", "runId")
  REFERENCES "agent_steps"("id", "runId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_feedback"
  ADD CONSTRAINT "agent_feedback_runId_organizationId_fkey"
  FOREIGN KEY ("runId", "organizationId")
  REFERENCES "agent_runs"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_cost_ledger"
  ADD CONSTRAINT "agent_cost_ledger_runId_organizationId_fkey"
  FOREIGN KEY ("runId", "organizationId")
  REFERENCES "agent_runs"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_policy_incidents"
  ADD CONSTRAINT "agent_policy_incidents_runId_organizationId_fkey"
  FOREIGN KEY ("runId", "organizationId")
  REFERENCES "agent_runs"("id", "organizationId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
