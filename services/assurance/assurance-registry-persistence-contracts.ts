import { BusinessRuleError } from "@/services/_shared/action-errors"

import {
  WORKFLOW_ASSURANCE_SEVERITIES,
  type WorkflowAssuranceCounts,
  type WorkflowAssuranceDefinitionExecution,
  type WorkflowAssuranceResultStatus,
  type WorkflowAssuranceSeverity,
} from "./assurance-registry-contracts"

const COUNT_FIELDS = [
  "scanned",
  "passed",
  "warning",
  "failed",
  "blocked",
  "skipped",
  "error",
] as const satisfies readonly (keyof WorkflowAssuranceCounts)[]

const STATUS_PRECEDENCE = {
  passed: 0,
  skipped: 1,
  warning: 2,
  failed: 3,
  blocked: 4,
  error: 5,
} as const satisfies Record<WorkflowAssuranceResultStatus, number>

const SEVERITY_PRECEDENCE = new Map<WorkflowAssuranceSeverity, number>(
  WORKFLOW_ASSURANCE_SEVERITIES.map((severity, index) => [severity, index]),
)

export function assertWorkflowAssuranceExecutionReconciled(
  execution: WorkflowAssuranceDefinitionExecution,
): WorkflowAssuranceDefinitionExecution {
  assertCounts(execution.aggregate.counts, "aggregate")
  for (const finding of execution.findings) {
    assertCounts(finding.counts, `source finding ${finding.ordinal}`)
  }

  if (execution.findings.length === 0) return execution

  const expectedCounts = execution.findings.reduce<WorkflowAssuranceCounts>(
    (counts, finding) => {
      for (const field of COUNT_FIELDS) counts[field] += finding.counts[field]
      return counts
    },
    { scanned: 0, passed: 0, warning: 0, failed: 0, blocked: 0, skipped: 0, error: 0 },
  )

  for (const field of COUNT_FIELDS) {
    if (execution.aggregate.counts[field] !== expectedCounts[field]) {
      throw new BusinessRuleError(
        `Workflow assurance aggregate ${field} count must equal the source-finding total`,
      )
    }
  }

  const expectedStatus = execution.findings.reduce<WorkflowAssuranceResultStatus>(
    (status, finding) =>
      STATUS_PRECEDENCE[finding.status] > STATUS_PRECEDENCE[status] ? finding.status : status,
    "passed",
  )
  if (execution.aggregate.status !== expectedStatus) {
    throw new BusinessRuleError(
      `Workflow assurance aggregate status must be ${expectedStatus} for its source findings`,
    )
  }

  const expectedSeverity = execution.findings.reduce<WorkflowAssuranceSeverity>(
    (severity, finding) =>
      severityRank(finding.severity) > severityRank(severity) ? finding.severity : severity,
    "info",
  )
  if (execution.aggregate.severity !== expectedSeverity) {
    throw new BusinessRuleError(
      `Workflow assurance aggregate severity must be ${expectedSeverity} for its source findings`,
    )
  }

  return execution
}

function assertCounts(counts: WorkflowAssuranceCounts, label: string) {
  for (const field of COUNT_FIELDS) {
    if (!Number.isSafeInteger(counts[field]) || counts[field] < 0) {
      throw new BusinessRuleError(
        `Workflow assurance ${label} ${field} count must be a non-negative safe integer`,
      )
    }
  }
}

function severityRank(severity: WorkflowAssuranceSeverity) {
  return SEVERITY_PRECEDENCE.get(severity) ?? -1
}
