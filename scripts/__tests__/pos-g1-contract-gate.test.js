const {
  EXPECTED_DECISION_IDS,
  EXPECTED_EVENT_TYPES,
  EXPECTED_STATE_MACHINE_IDS,
  buildG1ContractGate,
  hasApprovalEvidence,
  hasDecisionApprovalEvidence,
  approvalBinding,
} = require("../pos-g1-contract-gate")
const { signedFixture } = require("../pos-governance-test-fixture")

const unsignedApproval = () => ({
  approvalStatus: "APPROVED",
  requiredApproverRoles: ["Product owner"],
  approvals: [{
    accountableApprover: "Unverified typed identity",
    approverRole: "Product owner",
    authorityReference: "idp://invented/identity",
    freshAuthenticatedAt: "2026-08-17T16:00:00Z",
    approvedAt: "2026-08-17T16:01:00Z",
    signatureReference: "missing-signature.json",
    signatureEvidenceSha256: "a".repeat(64),
  }],
})

describe("POS G1 approval false-pass regressions", () => {
  it("does not credit invented signature references without verified evidence", () => {
    expect(hasApprovalEvidence(unsignedApproval())).toBe(false)
  })

  it("does not credit a future authenticated approval", () => {
    const record = unsignedApproval()
    record.approvals[0].freshAuthenticatedAt = "2099-08-17T16:00:00Z"
    record.approvals[0].approvedAt = "2099-08-17T16:01:00Z"
    expect(hasApprovalEvidence(record)).toBe(false)
  })
})

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

  it("rejects plausible approval metadata without authenticated evidence bytes", () => {
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
    ).toBe(false)

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
    ).toBe(false)
  })
})

describe("POS G1 signed decision validation", () => {
  let fixture, decision, record, binding
  beforeEach(() => {
    fixture = signedFixture()
    decision = { id: "D-01", selectedOption: "DISABLED", requiredApproverRoles: ["Product owner"] }
    binding = { contractArtifactId: "UNIT_ONLY", contractPath: "contract.json", contractVersion: "0.2.0", contractSha256: "b".repeat(64), releaseScope: { environment: "DEVELOPMENT_ONLY", tenders: ["CASH"] } }
    record = { decisionId: "D-01", selectedOption: "DISABLED", approvalStatus: "APPROVED", rationale: "Unit fixture only", effectiveVersion: "0.2.0",
      reviewOrExpiryAt: "2027-01-01T00:00:00Z", evidenceLinks: ["source.txt"], affectedCapabilities: ["pos.store-credit"], rollbackOrDisablePolicy: "Disable on control failure", approvals: [{
        accountableApprover: "Unit reviewer", approverRole: "Product owner", authorityReference: "unit://not-a-real-identity",
        freshAuthenticatedAt: "2026-09-24T11:00:00Z", approvedAt: "2026-09-24T11:01:00Z",
      }] }
    sign()
  })
  afterEach(() => fixture.dispose())
  function sign(overrides) {
    const approval = record.approvals[0]
    const proof = fixture.sign(approvalBinding(binding, record, approval), overrides)
    approval.signatureReference = proof.reference
    approval.signatureEvidenceSha256 = proof.sha256
  }
  const valid = () => hasDecisionApprovalEvidence(decision, record, fixture.context, binding)

  it("accepts a currently valid, role-complete, scoped issuer attestation", () => expect(valid()).toBe(true))
  it.each([
    ["expired decision", () => { record.reviewOrExpiryAt = "2026-09-24T10:00:00Z"; sign() }],
    ["future approval", () => { record.approvals[0].freshAuthenticatedAt = "2026-09-25T11:00:00Z"; record.approvals[0].approvedAt = "2026-09-25T11:01:00Z"; sign() }],
    ["stale fresh authentication", () => { record.approvals[0].freshAuthenticatedAt = "2026-09-24T10:30:00Z"; sign() }],
    ["wrong effective version", () => { record.effectiveVersion = "0.1.0"; sign() }],
    ["missing role", () => { decision.requiredApproverRoles.push("Security owner") }],
    ["changed contract hash", () => { binding.contractSha256 = "c".repeat(64) }],
    ["expanded release scope", () => { binding.releaseScope.tenders.push("CARD") }],
    ["changed decision option", () => { decision.selectedOption = "ENABLED"; record.selectedOption = "ENABLED" }],
    ["changed approver identity", () => { record.approvals[0].accountableApprover = "Different identity" }],
    ["blank evidence link", () => { record.evidenceLinks = [" "]; sign() }],
    ["blank capability", () => { record.affectedCapabilities = [""]; sign() }],
    ["expired attestation", () => { sign({ reviewOrExpiryAt: "2026-09-24T11:59:00Z" }) }],
  ])("rejects %s", (_label, mutate) => { mutate(); expect(valid()).toBe(false) })
})
