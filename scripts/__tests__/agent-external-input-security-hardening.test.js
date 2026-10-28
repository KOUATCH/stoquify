const template = require("../../docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUTS_2026-07-25.json")
const {
  evaluateExternalInputs,
} = require("../agent-external-input-readiness")

const NOW = new Date("2026-07-26T08:00:00.000Z")

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

describe("agent external input security hardening", () => {
  it("rejects case variants and common raw secret field names", () => {
    const input = clone(template)
    input.evidenceEndpoints.ci.ApiKey = "must-never-be-accepted"

    expect(() => evaluateExternalInputs(input, { now: NOW })).toThrow(
      "forbidden secret-bearing field",
    )
  })

  it("rejects self-approval even when the shared identity is otherwise valid", () => {
    const input = clone(template)
    const sharedIdentity = "directory://person/release-reviewer"
    input.approvers.product = {
      decision: "APPROVED",
      actorDirectoryId: sharedIdentity,
      approvalReference: "approval://product/release-1",
      decidedAt: "2026-07-26T07:00:00.000Z",
      expiresAt: "2026-07-27T07:00:00.000Z",
    }
    input.approvers.security = {
      decision: "APPROVED",
      actorDirectoryId: sharedIdentity,
      approvalReference: "approval://security/release-1",
      decidedAt: "2026-07-26T07:05:00.000Z",
      expiresAt: "2026-07-27T07:05:00.000Z",
    }

    const result = evaluateExternalInputs(input, { now: NOW })
    const approval = result.checks.find(
      (check) => check.id === "PRODUCT_SECURITY_APPROVALS",
    )

    expect(approval.blockers).toContain("APPROVER_SEGREGATION_REQUIRED")
  })
})
