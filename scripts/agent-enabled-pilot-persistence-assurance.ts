import { db } from "@/prisma/db";

export type AgentAllowedPersistenceCounts = {
  runs: number;
  steps: number;
  evidenceLinks: number;
  feedback: number;
  costs: number;
  policyIncidents: number;
};

export async function countAgentAllowedPersistence(
  organizationId: string,
): Promise<AgentAllowedPersistenceCounts> {
  const [runs, steps, evidenceLinks, feedback, costs, policyIncidents] =
    await Promise.all([
      db.agentRun.count({ where: { organizationId } }),
      db.agentStep.count({ where: { run: { organizationId } } }),
      db.agentEvidenceLink.count({ where: { run: { organizationId } } }),
      db.agentFeedback.count({ where: { organizationId } }),
      db.agentCostLedger.count({ where: { organizationId } }),
      db.agentPolicyIncident.count({ where: { organizationId } }),
    ]);
  return {
    runs,
    steps,
    evidenceLinks,
    feedback,
    costs,
    policyIncidents,
  };
}

export function certifyAgentAllowedPersistence(
  before: AgentAllowedPersistenceCounts,
  after: AgentAllowedPersistenceCounts,
) {
  const delta = {
    runs: after.runs - before.runs,
    steps: after.steps - before.steps,
    evidenceLinks: after.evidenceLinks - before.evidenceLinks,
    feedback: after.feedback - before.feedback,
    costs: after.costs - before.costs,
    policyIncidents: after.policyIncidents - before.policyIncidents,
  };
  const expectedCommandExecutions = 2;
  if (
    delta.runs !== expectedCommandExecutions ||
    delta.feedback !== expectedCommandExecutions
  ) {
    throw new Error(
      "Enabled-pilot execution did not preserve one run and one feedback record per browser project.",
    );
  }
  if (
    delta.steps < expectedCommandExecutions ||
    delta.evidenceLinks < expectedCommandExecutions
  ) {
    throw new Error(
      "Enabled-pilot execution did not persist the required step and evidence records.",
    );
  }
  if (delta.costs !== 0 || delta.policyIncidents !== 0) {
    throw new Error(
      "Provider-free enabled-pilot execution created unexpected cost or policy-incident records.",
    );
  }

  return {
    withinPolicy: true,
    expectedCommandExecutions,
    before,
    after,
    delta,
    allowedTables: [
      "agent_runs",
      "agent_steps",
      "agent_evidence_links",
      "agent_feedback",
    ],
    unchangedOptionalTables: [
      "agent_cost_ledger",
      "agent_policy_incidents",
    ],
  };
}
