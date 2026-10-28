const {
  EXPECTED_DECISION_IDS,
  EXPECTED_EVENT_TYPES,
  EXPECTED_STATE_MACHINE_IDS,
  buildG1ContractGate,
  hasApprovalEvidence,
  hasDecisionApprovalEvidence,
} = require("../pos-g1-contract-gate")

describe("POS G1 contract gate", () => {
  it("validates the corrected technical contract while blocking unproven approvals", () => {
    const report = buildG1ContractGate(process.cwd())

    expect(report.technicalStatus).toBe("READY_FOR_ACCOUNTABLE_REVIEW")
    expect(report.runtimeConformance).toBe("PARTIAL_WITH_EXPLICIT_GAPS")
    expect(report.approvalStatus).toBe("BLOCKED_0_OF_11")
    expect(report.status).toBe("BLOCKED")
    expect(report.productionAuthorized).toBe(false)
    expect(report.summary).toMatchObject({ technicalChecks: 13, technicalReady: 13 })
    expect(
      report.technicalChecks.find(
        (check) => check.id === "cash_only_and_store_credit_runtime_control",
      ),
    ).toEqual(expect.objectContaining({ ready: true }))
    expect(report.summary.approvedDecisions).toBe(0)
    expect(report.summary.decisions).toBe(EXPECTED_DECISION_IDS.length)
    expect(report.summary.stateMachines).toBe(EXPECTED_STATE_MACHINE_IDS.length)
    expect(report.summary.eventContracts).toBeGreaterThanOrEqual(EXPECTED_EVENT_TYPES.length)
  })

  it("requires artifact-bound fresh-auth signature evidence for approval", () => {
    expect(
      hasApprovalEvidence({
        approvalStatus: "APPROVED",
        requiredApproverRoles: ["Product owner"],
        approvals: [
          {
            accountableApprover: "Example Reviewer",
            approverRole: "Product owner",
            authorityReference: "idp://subject/example",
            freshAuthenticatedAt: "2026-08-17T16:00:00Z",
            approvedAt: "2026-08-17T16:01:00Z",
            signatureReference: "approval://example",
            signatureEvidenceSha256: "a".repeat(64),
          },
        ],
      }),
    ).toBe(true)

    expect(
      hasApprovalEvidence({
        approvalStatus: "APPROVED",
        requiredApproverRoles: ["Product owner"],
        approvals: [{ accountableApprover: "Typed Name Only" }],
      }),
    ).toBe(false)

    expect(
      hasApprovalEvidence({
        approvalStatus: "APPROVED",
        requiredApproverRoles: ["Product owner", "Security owner"],
        approvals: [
          {
            accountableApprover: "Example Reviewer",
            approverRole: "Product owner",
            authorityReference: "idp://subject/example",
            freshAuthenticatedAt: "2026-08-17T16:00:00Z",
            approvedAt: "2026-08-17T16:01:00Z",
            signatureReference: "approval://example",
            signatureEvidenceSha256: "a".repeat(64),
          },
        ],
      }),
    ).toBe(false)

    expect(
      hasDecisionApprovalEvidence(
        {
          id: "D-01",
          selectedOption: "DISABLED",
          requiredApproverRoles: ["Product owner"],
        },
        {
          decisionId: "D-01",
          selectedOption: "ENABLED",
          approvalStatus: "APPROVED",
          approvals: [],
        },
      ),
    ).toBe(false)

    expect(
      hasDecisionApprovalEvidence(
        {
          id: "D-01",
          selectedOption: "DISABLED",
          requiredApproverRoles: ["Product owner"],
        },
        {
          decisionId: "D-01",
          selectedOption: "DISABLED",
          rationale: "Fail closed until the controlled capability is approved.",
          approvalStatus: "APPROVED",
          effectiveVersion: "0.2.0",
          reviewOrExpiryAt: "2027-08-17T16:00:00Z",
          evidenceLinks: ["evidence://decision/d-01"],
          affectedCapabilities: ["pos.store-credit"],
          rollbackOrDisablePolicy: "Disable the capability on control failure.",
          approvals: [
            {
              accountableApprover: "Example Reviewer",
              approverRole: "Product owner",
              authorityReference: "idp://subject/example",
              freshAuthenticatedAt: "2026-08-17T16:00:00Z",
              approvedAt: "2026-08-17T16:01:00Z",
              signatureReference: "approval://example",
              signatureEvidenceSha256: "a".repeat(64),
            },
          ],
        },
      ),
    ).toBe(true)
  })
})
