jest.mock("server-only", () => ({}))

import { normalizeWorkflowAssuranceRunnerOutput } from "../assurance-registry-contracts"
import { assertWorkflowAssuranceExecutionReconciled } from "../assurance-registry-persistence-contracts"

const IDENTITY = {
  organizationId: "org-1",
  checkKey: "cert.multi-finding.persistence",
  definitionVersion: 1,
}

describe("workflow assurance persistence reconciliation contracts", () => {
  it("accepts fieldwise aggregate counts, strongest status, and maximum severity", () => {
    expect(assertWorkflowAssuranceExecutionReconciled(validExecution())).toMatchObject({
      aggregate: {
        status: "failed",
        severity: "blocking",
        counts: { scanned: 2, passed: 1, failed: 1 },
      },
      findings: [{ ordinal: 0 }, { ordinal: 1 }],
    })
  })

  it("accepts aggregate-only permission, missing-runner, or runner-error evidence", () => {
    const execution = normalizeWorkflowAssuranceRunnerOutput({
      ...IDENTITY,
      output: {
        aggregate: {
          status: "skipped",
          severity: "info",
          counts: { scanned: 0, skipped: 1 },
        },
        findings: [],
      },
    })

    expect(assertWorkflowAssuranceExecutionReconciled(execution).findings).toEqual([])
  })

  it("rejects an aggregate count that does not equal the finding total", () => {
    const execution = validExecution()
    execution.aggregate.counts.scanned = 3

    expect(() => assertWorkflowAssuranceExecutionReconciled(execution)).toThrow(
      /aggregate scanned count must equal/i,
    )
  })

  it("rejects an aggregate status weaker than the strongest finding", () => {
    const execution = validExecution()
    execution.aggregate.status = "warning"

    expect(() => assertWorkflowAssuranceExecutionReconciled(execution)).toThrow(
      /aggregate status must be failed/i,
    )
  })

  it("rejects an aggregate severity below the maximum finding severity", () => {
    const execution = validExecution()
    execution.aggregate.severity = "high"

    expect(() => assertWorkflowAssuranceExecutionReconciled(execution)).toThrow(
      /aggregate severity must be blocking/i,
    )
  })

  it("rejects negative, fractional, and unsafe counts before persistence", () => {
    for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      const execution = validExecution()
      execution.findings[0].counts.scanned = invalid

      expect(() => assertWorkflowAssuranceExecutionReconciled(execution)).toThrow(
        /non-negative safe integer/i,
      )
    }
  })
})

function validExecution() {
  return normalizeWorkflowAssuranceRunnerOutput({
    ...IDENTITY,
    output: {
      aggregate: {
        status: "failed",
        severity: "blocking",
        counts: { scanned: 2, passed: 1, failed: 1 },
      },
      findings: [
        {
          ordinal: 0,
          status: "passed",
          severity: "info",
          sourceType: "certification_source",
          sourceId: "source-1",
          counts: { scanned: 1, passed: 1 },
        },
        {
          ordinal: 1,
          status: "failed",
          severity: "blocking",
          sourceType: "certification_source",
          sourceId: "source-2",
          counts: { scanned: 1, failed: 1 },
        },
      ],
    },
  })
}
