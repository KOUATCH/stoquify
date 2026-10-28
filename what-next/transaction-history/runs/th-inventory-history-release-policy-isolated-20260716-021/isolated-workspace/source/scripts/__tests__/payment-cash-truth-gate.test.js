const fs = require("fs")
const os = require("os")
const path = require("path")

const {
  buildPaymentCashTruthReadiness,
  gateResultForReport,
} = require("../payment-cash-truth-gate")

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "payment-cash-truth-gate-"))
}

function write(root, relativePath, source) {
  const target = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, source, "utf8")
}

function writeReadyFixture(root) {
  write(root, "services/reconciliation/payment-reconciliation-evidence.service.ts", [
    "ProviderAccountStatus.ACTIVE paymentRail.isActive",
    "settlementLedgerAccountId suspenseLedgerAccountId settlementAccounts.length === 0",
    "buildReconciliationEvidenceManifestInTx rawPayloadHash fileHash fingerprint ledgerPostingBatchId",
    'stableReconciliationEvidenceStringify createHash("sha256") sortedById',
  ].join("\n"))
  write(root, "services/reconciliation/payment-reconciliation-run.service.ts", [
    "const providerAccount = await tx.providerAccount.findFirst(",
    "assertProviderAccountReconciliationReady(providerAccount)",
    "const existingRun = await tx.reconciliationRun.findFirst(",
    "run = await tx.reconciliationRun.create(",
  ].join("\n"))
  write(root, "services/reconciliation/payment-reconciliation-certification.service.ts", [
    "assertProviderAccountReconciliationReady({ providerAccountReadyVerified: true",
    "sourceManifestVersion: sourceEvidence.version",
    "sourceHash: sourceEvidence.sourceHash",
    "sourceCounts: sourceEvidence.counts",
    "const signedSourceHash = reconciliationCertificateSourceEvidenceHash",
    "signedSourceHash !== sourceEvidence.sourceHash",
    "return { driftError:",
    'if ("driftError" in result)',
    "throw new BusinessRuleError(result.driftError)",
  ].join("\n"))
  write(root, "services/assurance/assurance-registry.service.ts", [
    "sourceDriftedRunIds",
    "buildReconciliationEvidenceManifestInTx(",
    "reconciliationCertificateSourceEvidenceHash(",
  ].join("\n"))
  write(root, "package.json", JSON.stringify({
    scripts: {
      "payment:cash-truth:gate": "node scripts/payment-cash-truth-gate.js",
      "policy:gates": "npm run payment:cash-truth:gate",
    },
  }))
}

describe("payment cash truth gate", () => {
  it("passes a complete provider-to-certificate source-truth boundary", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.summary).toMatchObject({ status: "ready", readyCount: 10, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks when provider readiness and live source recomputation disappear", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(root, "services/reconciliation/payment-reconciliation-run.service.ts", "run = await tx.reconciliationRun.create(")
    write(root, "services/assurance/assurance-registry.service.ts", "reconciliationCertificateHash(payload)")

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toEqual(expect.arrayContaining([
      "run_blocks_unready_provider_before_creation",
      "scheduled_assurance_recomputes_source_evidence",
    ]))
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks throw-inside-transaction drift handling", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const certification = fs.readFileSync(
      path.join(root, "services/reconciliation/payment-reconciliation-certification.service.ts"),
      "utf8",
    ).replace(
      "return { driftError:",
      'throw new BusinessRuleError("Reconciliation certificate hash drift detected; rerun sign-off before export.")',
    )
    write(root, "services/reconciliation/payment-reconciliation-certification.service.ts", certification)

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("drift_invalidation_commits_before_error")
  })
})
