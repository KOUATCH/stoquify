const template = require("../../docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUTS_2026-07-25.json")
const {
  ENDPOINTS,
  REQUIRED_OWNER_ROLES,
  evaluateExternalInputs,
  renderMarkdown,
} = require("../agent-external-input-readiness")

const NOW = new Date("2026-07-25T21:00:00.000Z")
const HASH = `sha256:${"a".repeat(64)}`

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function completeInput() {
  const input = clone(template)
  input.release = {
    packageId: "stoquify-command-agent",
    releaseVersion: "2026.07.25-rc1",
    commitSha: "5dc78f2c007c51e151342de08be34b72994839bb",
    artifactDigest: HASH,
    artifactReference: "artifact://stoquify/command-agent/2026.07.25-rc1",
    deploymentReference: "deployment://internal-pilot/command-agent/2026.07.25-rc1",
    manifestHash: HASH,
    evidenceBundleHash: HASH,
    browserReportHash: HASH,
    pilotAllowlistReference: "policy://pilot/tenants/2026.07.25-rc1",
    roleAllowlistReference: "policy://pilot/roles/2026.07.25-rc1",
  }
  input.approvers = {
    product: {
      decision: "APPROVED",
      actorDirectoryId: "directory://person/product-owner",
      approvalReference: "approval://product/2026.07.25-rc1",
      decidedAt: "2026-07-25T19:00:00.000Z",
      expiresAt: "2026-07-27T19:00:00.000Z",
    },
    security: {
      decision: "APPROVED",
      actorDirectoryId: "directory://person/security-owner",
      approvalReference: "approval://security/2026.07.25-rc1",
      decidedAt: "2026-07-25T19:05:00.000Z",
      expiresAt: "2026-07-27T19:05:00.000Z",
    },
  }
  input.owners = REQUIRED_OWNER_ROLES.map((role, index) => ({
    role,
    primaryDirectoryId: `directory://person/${role.toLowerCase()}-primary`,
    backupDirectoryId: `directory://person/${role.toLowerCase()}-backup`,
    acceptedRunbookVersion: "2026.07.25",
    acceptedAt: `2026-07-25T19:${String(10 + index).padStart(2, "0")}:00.000Z`,
    coverageStartsAt: "2026-07-25T20:00:00.000Z",
    coverageEndsAt: "2026-07-27T20:00:00.000Z",
    escalationReference: `evidence://owners/${role.toLowerCase()}/2026.07.25-rc1`,
  }))
  input.evidenceEndpoints = Object.fromEntries(
    Object.keys(ENDPOINTS).map((name) => [
      name,
      {
        url:
          name === "reconciler"
            ? "https://runtime.stoquify.example/api/agent/reconcile"
            : `https://evidence.stoquify.example/${name}`,
        managedSecretReference: `secret-manager://internal-pilot/agent/${name}`,
        sourceSystemReference: `authority://${name}/internal-pilot`,
      },
    ]),
  )
  input.managedCredentials = {
    workloadIdentityReference: "identity://workload/agent-reconciler",
    collectorIdentityReference: "identity://workload/evidence-collectors",
    secretManagerNamespaceReference: "secret-manager://internal-pilot/agent-runtime",
    rotationAuthorityReference: "authority://security/credential-rotation",
    credentialInventoryReference: "inventory://security/agent-runtime",
  }
  input.statutoryApproval = {
    decision: "APPROVED",
    reviewerDirectoryId: "directory://person/qualified-ohada-reviewer",
    qualificationReference: "qualification://ohada/reviewer/current",
    sourceArtifactHash: HASH,
    approvalArtifactReference: "approval://statutory/cm/2026.07.25",
    approvalArtifactHash: HASH,
    reviewedAt: "2026-07-25T20:00:00.000Z",
  }
  input.pilot = {
    cohortReference: "cohort://internal-pilot/command-agent/2026.07.25",
    tenantScopeHash: HASH,
    roleScopeHash: HASH,
    supportCoverageReference: "support://internal-pilot/2026.07.25",
    rollbackPlanReference: "runbook://rollback/command-agent/2026.07.25",
    activationAuthorityDirectoryId: "directory://person/release-authority",
    activationDecision: "APPROVED",
    activationDecisionReference: "approval://activation/command-agent/2026.07.25",
    activationDecidedAt: "2026-07-25T20:30:00.000Z",
  }
  return input
}

describe("agent external input readiness", () => {
  it("accepts complete value-free external references without granting authority", () => {
    const result = evaluateExternalInputs(completeInput(), { now: NOW })

    expect(result.ready).toBe(true)
    expect(result.summary.blockers).toBe(0)
    expect(result.activationAuthorizedByGate).toBe(false)
    expect(result.phase3AuthorizedByGate).toBe(false)
    expect(result.handling.operationalRegisterMutated).toBe(false)
    expect(result.handling.approvalsCreated).toBe(false)
  })

  it("turns the empty intake template into a detailed external-input handoff", () => {
    const result = evaluateExternalInputs(clone(template), { now: NOW })

    expect(result.status).toBe("EXTERNAL_INPUTS_REQUIRED")
    expect(result.ready).toBe(false)
    expect(result.checks.find((check) => check.id === "SAFETY_BOUNDARY").ready).toBe(true)
    expect(result.endpointBindings.ci.urlEnvironmentVariable).toBe(
      "STOQUIFY_AGENT_CI_RELEASE_EVIDENCE_URL",
    )
  })

  it("rejects synthetic identities and product-security self-approval", () => {
    const input = completeInput()
    input.approvers.product.actorDirectoryId = "directory://person/test-owner"
    input.approvers.security.actorDirectoryId = "directory://person/test-owner"
    const result = evaluateExternalInputs(input, { now: NOW })
    const approval = result.checks.find(
      (check) => check.id === "PRODUCT_SECURITY_APPROVALS",
    )

    expect(approval.blockers).toEqual(
      expect.arrayContaining([
        "PRODUCT_IDENTITY_INVALID",
        "SECURITY_IDENTITY_INVALID",
      ]),
    )
  })

  it("rejects non-HTTPS, query-bearing endpoints and non-managed secret references", () => {
    const input = completeInput()
    input.evidenceEndpoints.alert.url =
      "http://evidence.stoquify.example/alert?token=forbidden"
    input.evidenceEndpoints.alert.managedSecretReference =
      "config://plain-text/alert-secret"
    const result = evaluateExternalInputs(input, { now: NOW })
    const alert = result.checks.find((check) => check.id === "ENDPOINT_ALERT")

    expect(alert.blockers).toEqual(
      expect.arrayContaining([
        "HTTPS_QUERY_FREE_URL_REQUIRED",
        "MANAGED_SECRET_REFERENCE_INVALID",
      ]),
    )
  })

  it("rejects secret-bearing fields structurally before producing a report", () => {
    const input = completeInput()
    input.evidenceEndpoints.ci.secretValue = "must-never-be-accepted"

    expect(() => evaluateExternalInputs(input, { now: NOW })).toThrow(
      "forbidden secret-bearing field",
    )
  })

  it("renders exact owners, collector variables, sequence, and intervention policy", () => {
    const input = clone(template)
    const markdown = renderMarkdown(
      input,
      evaluateExternalInputs(input, { now: NOW }),
    )

    expect(markdown).toContain("Collector Bindings")
    expect(markdown).toContain("STOQUIFY_AGENT_RECONCILER_BASE_URL")
    expect(markdown).toContain("Subsequent Intervention Treatment")
    expect(markdown).toContain("Blockers:** 102")
    expect(markdown).toContain("Activation authorized by this gate:** No")
  })
})
