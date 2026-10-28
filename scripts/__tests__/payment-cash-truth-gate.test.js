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
    "const mismatchReasons = [",
    '"PROVIDER_EVENT_AMOUNT"',
    '"STATEMENT_LINE_AMOUNT"',
    '"PROVIDER_EVENT_CURRENCY"',
    '"STATEMENT_LINE_CURRENCY"',
    "if (mismatchReasons.length > 0)",
    "type: PaymentExceptionType.AMOUNT_MISMATCH",
    "if (event || line)",
    "status: MatchStatus.AUTO_MATCHED",
  ].join("\n"))
  write(root, "services/reconciliation/payment-reconciliation-certification.service.ts", [
    "assertProviderAccountReconciliationReady({ providerAccountReadyVerified: true",
    "sourceManifestVersion: sourceEvidence.version",
    "sourceHash: sourceEvidence.sourceHash",
    "sourceCounts: sourceEvidence.counts",
    "assertPaymentSuspenseLedgerTruthInTx(",
    "const signedSourceHash = reconciliationCertificateSourceEvidenceHash",
    "signedSourceHash !== sourceEvidence.sourceHash",
    "return { driftError:",
    'if ("driftError" in result)',
    "throw new BusinessRuleError(result.driftError)",
  ].join("\n"))
  write(
    root,
    "services/reconciliation/payment-suspense-workflow.service.ts",
    "postPaymentSuspenseToLedger(",
  )
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
  write(root, "prisma/migrations/20260630090000_payment_reconciliation_foundation/migration.sql", [
    'CREATE TYPE "PaymentRailType"',
    'CREATE TYPE "ProviderAccountStatus"',
    'CREATE TYPE "ProviderEventStatus"',
    'CREATE TYPE "PaymentReconciliationInboxSource"',
    'CREATE TABLE "payment_rails"',
    'CREATE TABLE "provider_accounts"',
    'CREATE TABLE "settlement_accounts"',
    'CREATE TABLE "provider_events"',
    'CREATE TABLE "statement_files"',
    'CREATE TABLE "statement_lines"',
    'CREATE TABLE "payment_transactions"',
    'CREATE TABLE "match_records"',
    'CREATE TABLE "suspense_items"',
    'CREATE TABLE "reconciliation_runs"',
    'CREATE TABLE "payment_exceptions"',
    'CREATE TABLE "payment_reconciliation_inbox_items"',
    'FOREIGN KEY ("organizationId") REFERENCES "organizations"',
    'FOREIGN KEY ("providerAccountId") REFERENCES "provider_accounts"',
    'CREATE UNIQUE INDEX "payment_rails_organizationId_code_key" ON "payment_rails"("organizationId", "code")',
    'CREATE UNIQUE INDEX "provider_events_organizationId_providerAccountId_providerEv_key" ON "provider_events"("organizationId", "providerAccountId", "providerEventId")',
    'CREATE UNIQUE INDEX "statement_lines_organizationId_providerAccountId_fingerprin_key" ON "statement_lines"("organizationId", "providerAccountId", "fingerprint")',
    'CREATE UNIQUE INDEX "reconciliation_runs_organizationId_providerAccountId_busine_key" ON "reconciliation_runs"("organizationId", "providerAccountId", "businessDate")',
    'CREATE UNIQUE INDEX "payment_reconciliation_inbox_items_organizationId_source_id_key" ON "payment_reconciliation_inbox_items"("organizationId", "source", "idempotencyKey")',
  ].join("\n"))
  write(root, "prisma/migrations/20260630100000_payment_reconciliation_inbox_worker_leases/migration.sql", [
    'ALTER TABLE "payment_reconciliation_inbox_items"',
    'ADD COLUMN "leasedBy" TEXT',
    'ADD COLUMN "leaseToken" TEXT',
  ].join("\n"))
  write(root, "prisma/migrations/20260815190000_payment_reconciliation_evidence_immutability/migration.sql", [
    'CREATE OR REPLACE FUNCTION "payment_reconciliation_assert_immutable_evidence"',
    'CREATE OR REPLACE FUNCTION "payment_reconciliation_provider_events_prevent_evidence_mutation"',
    'CREATE OR REPLACE FUNCTION "payment_reconciliation_statement_files_prevent_evidence_mutation"',
    'CREATE OR REPLACE FUNCTION "payment_reconciliation_statement_lines_prevent_evidence_mutation"',
    'BEFORE UPDATE OR DELETE ON "provider_events"',
    'BEFORE UPDATE OR DELETE ON "statement_files"',
    'BEFORE UPDATE OR DELETE ON "statement_lines"',
    'Cannot modify immutable payment reconciliation evidence',
    'Cannot delete immutable payment reconciliation evidence',
  ].join("\n"))
}

describe("payment cash truth gate", () => {
  it("passes a complete provider-to-certificate source-truth boundary", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.summary).toMatchObject({ status: "ready", readyCount: 14, blockerCount: 0 })
    expect(gateResultForReport(report, "fail").exitCode).toBe(0)
  })

  it("blocks auto-match when external amount and currency agreement is not enforced", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    const runPath = path.join(
      root,
      "services/reconciliation/payment-reconciliation-run.service.ts",
    )
    write(
      root,
      "services/reconciliation/payment-reconciliation-run.service.ts",
      fs.readFileSync(runPath, "utf8").replace('"STATEMENT_LINE_AMOUNT"', '"REFERENCE_ONLY_MATCH"'),
    )

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "auto_match_requires_amount_and_currency_agreement",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when payment reconciliation tables are not in migration history before inbox leases", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    fs.rmSync(
      path.join(root, "prisma/migrations/20260630090000_payment_reconciliation_foundation"),
      { recursive: true, force: true },
    )

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain("durable_payment_reconciliation_schema_migration")
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks when provider and statement evidence has no database immutability boundary", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    fs.rmSync(
      path.join(root, "prisma/migrations/20260815190000_payment_reconciliation_evidence_immutability"),
      { recursive: true, force: true },
    )

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "provider_and_statement_evidence_is_database_immutable",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
  })

  it("blocks an empty suspense posting batch from satisfying ledger truth", () => {
    const root = makeTempRepo()
    writeReadyFixture(root)
    write(
      root,
      "services/reconciliation/payment-suspense-workflow.service.ts",
      "createLedgerPostingBatch(",
    )

    const report = buildPaymentCashTruthReadiness(root, { mode: "fail" })

    expect(report.blockers).toContain(
      "suspense_posting_reconciles_to_posted_ledger",
    )
    expect(gateResultForReport(report, "fail").exitCode).toBe(1)
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
