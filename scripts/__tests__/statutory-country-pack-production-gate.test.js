const fs = require("fs")
const os = require("os")
const path = require("path")
const crypto = require("crypto")

const { buildStatutoryCountryPackReadiness, gateResultForReport } = require("../statutory-country-pack-production-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "statutory-country-pack-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  const artifact = "official reviewed statutory source"
  const artifactHash = crypto.createHash("sha256").update(artifact).digest("hex")
  const approvalArtifact = "signed qualified reviewer approval"
  const approvalArtifactHash = crypto.createHash("sha256").update(approvalArtifact).digest("hex")
  write(root, "services/regulatory/country-packs/schemas.ts", "countryPackHeaderSchema legalReferenceSchema effectiveFrom verifiedBy hash: z.string().regex(/^sha256:")
  write(root, "services/regulatory/country-packs/resolve.ts", 'pack.header.status === "PUBLISHED" isDateInPackWindow pinnedPackVersion resolutionHash')
  write(root, "services/regulatory/country-packs/validation.ts", "validateCountryPackForPublish requirePublished: true requireNoExpertReview: true GOLDEN_FIXTURE_FAILED")
  write(root, "services/regulatory/country-packs/cameroon.ts", `"compliance.eInvoicing": "REQUIRES_EXPERT_REVIEW" productionAutomationAllowed: false adapterReadiness: "REQUIRES_EXPERT_REVIEW" sourceEvidenceHash: "sha256:${artifactHash}"`)
  write(root, "services/payroll/payroll-tax-rule-evaluator.ts", 'PRODUCTION_TAX_CAPABILITY_STATUSES rule.productionCalculationSupported === true status: "BLOCKED_REQUIRES_EXPERT_REVIEW"')
  write(root, "services/compliance/adapters/registry.ts", "fakeSandboxComplianceAdapter cameroonDgiSandboxComplianceAdapter official specifications, sandbox proof, and expert review")
  write(root, "services/compliance/fiscal-document.service.ts", "ComplianceAdapterEnvironment.PRODUCTION Production tax-authority certification is blocked until an official adapter is reviewed and registered.")
  write(root, "services/compliance/certification-outbox.service.ts", 'parsed.environment === ComplianceAdapterEnvironment.PRODUCTION submission.environment === ComplianceAdapterEnvironment.PRODUCTION errorCode: "PRODUCTION_ADAPTER_BLOCKED"')
  write(root, "services/compliance/adapters/fake-sandbox.ts", 'context.environment !== "FAKE_SANDBOX" productionCertification: false')
  write(root, "services/compliance/adapters/cameroon-dgi-sandbox.ts", 'context.environment !== "SANDBOX" SANDBOX_ONLY_NO_PRODUCTION_CERTIFICATION')
  write(root, "scripts/regulatory-hardcode-gate.js", "regulatory-hardcode")
  write(root, "package.json", '{"scripts":{"regulatory:hardcode:fail":"node hardcode","statutory:country-pack:gate":"node gate","policy:gates":"npm run statutory:country-pack:gate"}}')
  write(root, "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/source.txt", artifact)
  write(root, "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/approval.txt", approvalArtifact)
  write(root, "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json", JSON.stringify({
    reviewStatus: "EXPERT_REVIEWED",
    productionUseAllowed: true,
    artifacts: [{
      file: "source.txt",
      sha256: artifactHash,
      reviewStatus: "EXPERT_REVIEWED",
      productionUseAllowed: true,
    }],
    requiredApproval: {
      reviewerIdentity: "Qualified reviewer",
      reviewedAt: "2026-07-19T00:00:00.000Z",
      effectiveFrom: "2026-01-01",
      approvalArtifactFile: "approval.txt",
      approvalArtifactHash,
      approvedFixtureFamilies: [
        "payroll.cnps.pensionRatesBps",
        "payroll.cnps.familyAllowanceRatesBps",
        "payroll.cnps.occupationalRiskRatesBps",
        "payroll.cnps.employerRules",
      ],
    },
  }))
}

describe("statutory country-pack production gate", () => {
  it("passes a fail-closed statutory production posture", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const report = buildStatutoryCountryPackReadiness(root, { mode: "fail" })
    expect(report.summary).toMatchObject({ status: "ready", readyCount: 12, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks when direct production enqueue is no longer rejected", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/compliance/certification-outbox.service.ts", 'submission.environment === ComplianceAdapterEnvironment.PRODUCTION errorCode: "PRODUCTION_ADAPTER_BLOCKED"')
    const report = buildStatutoryCountryPackReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("enqueue_and_worker_block_production")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when fake sandbox accepts non-sandbox execution", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/compliance/adapters/fake-sandbox.ts", "productionCertification: false")
    const report = buildStatutoryCountryPackReadiness(root, { mode: "fail" })
    expect(report.blockers).toContain("sandbox_adapters_self_enforce_environment")
  })

  it("blocks symbolic source evidence hashes that are not bound to artifact bytes", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/regulatory/country-packs/cameroon.ts", '"compliance.eInvoicing": "REQUIRES_EXPERT_REVIEW" productionAutomationAllowed: false adapterReadiness: "REQUIRES_EXPERT_REVIEW" sourceEvidenceHash: "sha256:symbolic-label"')

    const report = buildStatutoryCountryPackReadiness(root, { mode: "fail" })

    expect(report.blockers).toEqual(expect.arrayContaining([
      "source_artifact_hash_verification",
      "source_artifact_expert_approval",
    ]))
  })

  it("blocks captured source artifacts until expert approval permits production use", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const manifestPath = path.join(root, "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    manifest.reviewStatus = "PENDING_EXPERT_REVIEW"
    manifest.productionUseAllowed = false
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), "utf8")

    const report = buildStatutoryCountryPackReadiness(root, { mode: "fail" })

    expect(report.blockers).not.toContain("source_artifact_hash_verification")
    expect(report.blockers).toContain("source_artifact_expert_approval")
  })

  it("blocks manifest approval without a matching signed approval artifact", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const manifestPath = path.join(root, "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    manifest.requiredApproval.approvalArtifactHash = "0".repeat(64)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest), "utf8")

    const report = buildStatutoryCountryPackReadiness(root, { mode: "fail" })

    expect(report.blockers).not.toContain("source_artifact_hash_verification")
    expect(report.blockers).toContain("source_artifact_expert_approval")
  })
})
