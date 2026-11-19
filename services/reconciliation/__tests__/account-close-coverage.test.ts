jest.mock("server-only", () => ({}))
jest.mock("../payment-reconciliation-evidence.service", () => ({
  ...jest.requireActual("../payment-reconciliation-evidence.service"),
  buildReconciliationEvidenceManifestInTx: jest.fn(),
}))
import { createHash } from "node:crypto"
import { buildReconciliationEvidenceManifestInTx, stableReconciliationEvidenceStringify } from "../payment-reconciliation-evidence.service"
const currentSourceHash = "sha256:" + "c".repeat(64)
beforeEach(() => (buildReconciliationEvidenceManifestInTx as jest.Mock).mockReset().mockResolvedValue({ sourceHash: currentSourceHash }))
import { coverageGaps, eligibleNoActivity, noActivityEvidenceHash } from "../account-close-coverage"
import { readAccountCloseCoverage } from "../account-close-coverage.service"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { ConflictError } from "@/services/_shared/action-errors"
const start = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z"), cutoff = new Date("2026-10-06")
const scope = createCloseControlScope("org", { id: "sep", startDate: start, endDate: end }, cutoff)
const payload = { organizationId: "org", providerAccountId: "a", periodId: "sep", periodStart: start, periodEnd: end, currencyCode: "XAF", sourceReference: "retained-document:zero-statement", sourceDocumentHash: "sha256:" + "a".repeat(64), reason: "External statement confirms no activity", proposedById: "preparer" }
const evidence = { ...payload, id: "proof", evidenceHash: noActivityEvidenceHash(payload), idempotencyKey: "key", createdAt: new Date("2026-10-01"), status: "APPROVED", approvedById: "reviewer", approvedAt: new Date("2026-10-02"), revokedAt: null, revokedById: null, revocationReason: null }
const eligibility = { organizationId: "org", providerAccountId: "a", periodId: "sep", start, end, cutoff, currencyCode: "XAF", activityCount: 0, obligationCount: 0 }

const certificateHash = (payload: unknown) => createHash("sha256").update(stableReconciliationEvidenceStringify(payload)).digest("hex")
// Mocked imported envelope evidence; these fixtures do not replace a real import.
function declaredStatement(id = "statement", providerAccountId = "a", periodEnd = end) {
  const declared = { formatVersion: "stoquify-statement-v1", providerCode: "SYNTHETIC_PILOT", providerAccountId, currencyCode: "XAF", periodStart: start.toISOString(), periodEnd: periodEnd.toISOString() }
  const rawContent = JSON.stringify({ ...declared, lines: [{ transactionId: "synthetic", direction: "CREDIT", amount: "10.00", currency: "XAF", occurredAt: start.toISOString() }] })
  const fileHash = createHash("sha256").update(rawContent).digest("hex")
  return { id, organizationId: "org", providerAccountId, fileHash, periodStart: start, periodEnd,
    metadata: { lineCount: 1, coverageKind: "DECLARED", observedPeriodStart: start.toISOString(), observedPeriodEnd: start.toISOString(), declaredCoverage: { ...declared, sourceFileHash: fileHash } } }
}
// The retained v3 envelope mirrors the real signer's canonical fields. Current
// source collection is mocked independently; this is not an earned sign-off run.
function signedRun(id = "run", periodEnd = new Date(+end + 1)) {
  const sourceVersionHash = "sha256:" + "a".repeat(64)
  const certificatePayload: Record<string, unknown> = {
    version: 3, mode: "DURABLE_EVIDENCE_KERNEL", organizationId: "org", runId: id,
    providerAccountId: "a", paymentRailId: "rail", providerCode: "SYNTHETIC_PILOT", accountingPeriodId: "sep",
    businessDate: start.toISOString(), periodStart: start.toISOString(), periodEnd: periodEnd.toISOString(),
    sourceVersionHash, reviewedEvidenceRevision: "sha256:" + "b".repeat(64),
    amountSummary: { version: 1, basis: "GROSS_SOURCE_AMOUNTS_BY_CURRENCY", currencies: [{ currencyCode: "XAF", amounts: { payments: "10.00", providerEvents: "10.00", statementLines: "10.00", matched: "10.00", unresolvedSuspense: "0.00" } }] },
    recordedRunTotals: { basis: "CUMULATIVE_RUN_CAPTURE_NOT_CURRENT_EXPOSURE", internalAmount: "10.00", externalAmount: "10.00", matchedAmount: "10.00", suspenseAmount: "0.00", matchCount: 1, exceptionCount: 0 },
    evidence: { providerEventCount: 1, statementLineCount: 1, openExceptionCount: 0, openSuspenseCount: 0, sourceManifestVersion: 1, sourceHash: currentSourceHash,
      sourceCounts: { paymentTransactionCount: 1, providerEventCount: 1, statementFileCount: 1, statementLineCount: 1, matchRecordCount: 1, exceptionCount: 0, suspenseCount: 0 } },
    controls: { makerCheckerEnforced: true, freshAuthEnforced: true, periodOpenVerified: true, providerAccountReadyVerified: true, suspensePostingGatewayOnly: true, sourceVersionGuardEnforced: true, conditionalTerminalTransition: true },
    signedById: "reviewer", signedAt: cutoff.toISOString(), correlationId: "sign-correlation",
  }
  return { id, organizationId: "org", providerAccountId: "a", paymentRailId: "rail", status: "SIGNED", runById: "maker", signedById: "reviewer", signedAt: cutoff,
    certificateHash: certificateHash(certificatePayload), certificatePayload, metadata: { signedSourceVersionHash: sourceVersionHash, immutableAfterSignoff: true },
    voidedAt: null, periodStart: start, periodEnd, businessDate: start, accountingPeriodId: "sep" }
}

it("unions overlapping/adjacent intervals without losing a single millisecond gap", () => {
  expect(coverageGaps(0, 9, [{ start: 5, end: 9 }, { start: 0, end: 4 }])).toEqual([])
  expect(coverageGaps(0, 9, [{ start: 0, end: 3 }, { start: 5, end: 9 }])).toEqual([{ start: new Date(4).toISOString(), end: new Date(4).toISOString() }])
  expect(coverageGaps(0, 9, [{ start: 3, end: 2 }])).toHaveLength(1)
})
it("requires independently approved, hash-bound evidence", () => {
  expect(eligibleNoActivity(evidence, eligibility)).toBe(true)
  for (const change of [{ status: "PROPOSED" }, { approvedById: "preparer" }, { approvedAt: new Date(+cutoff + 1) }, { status: "REVOKED", revokedAt: cutoff }, { reason: "Changed supporting rationale" }, { sourceReference: "" }, { currencyCode: "USD" }, { organizationId: "foreign" }, { periodEnd: new Date(+end - 1) }]) {
    expect(eligibleNoActivity({ ...evidence, ...change }, eligibility)).toBe(false)
  }
  expect(eligibleNoActivity(evidence, { ...eligibility, activityCount: 1 })).toBe(false)
  expect(eligibleNoActivity(evidence, { ...eligibility, obligationCount: 1 })).toBe(false)
})

function fixture() {
  const tx = {
    accountingPeriod: { findFirst: jest.fn().mockResolvedValue({ id: "sep", startDate: start, endDate: end }) },
    providerAccount: { findMany: jest.fn().mockResolvedValue(["a", "b"].map(id => ({ id, displayName: id, providerCode: "SYNTHETIC_PILOT", currencyCode: "XAF", status: "ARCHIVED", settlementLagDays: 2, metadata: { statementCadenceDays: 7 } }))) },
    statementFile: { findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "a" ? [declaredStatement()] : [])) },
    reconciliationRun: { findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "a" ? [signedRun()] : [])) },
    ledgerAuditEvent: { findFirst: jest.fn().mockResolvedValue({ id: "retained-signature-audit" }) },
    reconciliationNoActivityEvidence: { findMany: jest.fn().mockResolvedValue([]) },
    providerEvent: { count: jest.fn().mockResolvedValue(0) }, paymentTransaction: { count: jest.fn().mockResolvedValue(0) },
    statementLine: { findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "a" ? [{ currencyCode: "XAF" }] : [])) },
    suspenseItem: { count: jest.fn().mockResolvedValue(0) }, paymentException: { count: jest.fn().mockResolvedValue(0) },
  }
  return tx
}
it("one reconciled account cannot mask another account, including archived accounts", async () => {
  const tx = fixture()
  const result = await readAccountCloseCoverage(tx as any, scope)
  expect(result).toMatchObject({ requiredAccountCount: 2, coveredAccountCount: 1, blockedAccountCount: 1 })
  expect(result.accounts[0].status).toBe("RECONCILED")
  expect(result.accounts[1].reasons).toEqual(["MISSING_STATEMENT", "MISSING_SIGNOFF", "NO_ACTIVITY_EVIDENCE_REQUIRED"])
  expect(tx.providerAccount.findMany.mock.calls[0][0].where).not.toHaveProperty("status")
  expect(result.accounts[0]).toMatchObject({ cadenceDays: 7, settlementLagDays: 2, overdue: false })
})
it("requires complete statement and daily signoff coverage, regardless of settlement grace", async () => {
  const tx = fixture()
  tx.reconciliationRun.findMany.mockResolvedValue([signedRun("day", new Date(+start + 86400000))])
  tx.statementFile.findMany.mockResolvedValue([declaredStatement("s", "a", new Date(+start + 86400000 - 1))])
  const row = (await readAccountCloseCoverage(tx as any, scope)).accounts[0]
  expect(row.reasons).toEqual(["PARTIAL_STATEMENT", "PARTIAL_SIGNOFF"])
  expect(row.signoffGaps[0]).toEqual({ start: "2026-09-02T00:00:00.000Z", end: end.toISOString() })
})
it.each(["legacy", "observed-only", "source hash", "provider", "account", "currency", "range", "observed dates"])("gives no declared coverage credit to %s statement evidence", async kind => {
  const tx = fixture(), statement: any = declaredStatement()
  if (kind === "legacy") statement.metadata = null
  if (kind === "observed-only") statement.metadata.coverageKind = "OBSERVED"
  if (kind === "source hash") statement.metadata.declaredCoverage.sourceFileHash = "b".repeat(64)
  if (kind === "provider") statement.metadata.declaredCoverage.providerCode = "foreign"
  if (kind === "account") statement.metadata.declaredCoverage.providerAccountId = "foreign"
  if (kind === "currency") statement.metadata.declaredCoverage.currencyCode = "USD"
  if (kind === "range") statement.metadata.declaredCoverage.periodEnd = new Date(+end - 1).toISOString()
  if (kind === "observed dates") statement.metadata.observedPeriodStart = new Date(+start - 1).toISOString()
  tx.statementFile.findMany.mockResolvedValue([statement])
  const row = (await readAccountCloseCoverage(tx as any, scope)).accounts[0]
  expect(row.status).toBe("BLOCKED"); expect(row.reasons).toContain("PARTIAL_STATEMENT")
  expect(row.statementGaps).toEqual([{ start: start.toISOString(), end: end.toISOString() }])
})
it("allows explicit no-activity proof, but rejects late activity and open obligations", async () => {
  const tx = fixture()
  const proofB = { ...evidence, providerAccountId: "b" }; proofB.evidenceHash = noActivityEvidenceHash(proofB)
  tx.reconciliationNoActivityEvidence.findMany.mockResolvedValue([proofB])
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[1].status).toBe("NO_ACTIVITY_APPROVED")
  tx.providerEvent.count.mockResolvedValue(1)
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[1].status).toBe("BLOCKED")
  tx.providerEvent.count.mockResolvedValue(0); tx.suspenseItem.count.mockResolvedValue(1)
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[1].reasons).toContain("OPEN_OBLIGATIONS")
})
it("does not infer no activity from empty signed runs, empty statements, or no accounts", async () => {
  const tx = fixture(); tx.statementLine.findMany.mockResolvedValue([])
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[0].reasons).toEqual(["NO_ACTIVITY_EVIDENCE_REQUIRED"])
  tx.providerAccount.findMany.mockResolvedValue([])
  expect(await readAccountCloseCoverage(tx as any, scope)).toMatchObject({ requiredAccountCount: 0, coveredAccountCount: 0, accounts: [] })
})
it("fails closed on currency mismatch, source failure, and foreign period", async () => {
  const tx = fixture(); tx.statementLine.findMany.mockResolvedValue([{ currencyCode: "USD" }])
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[0].reasons).toContain("CURRENCY_MISMATCH")
  tx.statementFile.findMany.mockRejectedValue(new Error("unavailable"))
  await expect(readAccountCloseCoverage(tx as any, scope)).rejects.toThrow("unavailable")
  tx.accountingPeriod.findFirst.mockResolvedValue(null)
  await expect(readAccountCloseCoverage(tx as any, scope)).rejects.toThrow("scope")
})

it("excludes stale signatures and never masks source read failures", async () => {
  const tx = fixture()
  ;(buildReconciliationEvidenceManifestInTx as jest.Mock).mockResolvedValue({ sourceHash: "changed" })
  const result = (await readAccountCloseCoverage(tx as any, scope)).accounts[0]
  expect(result.status).toBe("BLOCKED"); expect(result.reasons).toContain("STALE_SIGNOFF"); expect(result.signedRuns).toEqual([])
  ;(buildReconciliationEvidenceManifestInTx as jest.Mock).mockRejectedValue(new Error("source unavailable"))
  await expect(readAccountCloseCoverage(tx as any, scope)).rejects.toThrow("source unavailable")
})

it("admits the retained v3 approval/audit before checking current sources", async () => {
  const tx = fixture(), run = signedRun()
  const row = (await readAccountCloseCoverage(tx as any, scope)).accounts[0]
  expect(row.signedRuns).toEqual([{ id: run.id, hash: run.certificateHash }])
  expect(tx.reconciliationRun.findMany.mock.calls[0][0].select).toMatchObject({ organizationId: true, providerAccountId: true, paymentRailId: true, runById: true, signedById: true, metadata: true, voidedAt: true })
  expect(tx.ledgerAuditEvent.findFirst).toHaveBeenCalledWith({ where: { organizationId: "org", resourceType: "ReconciliationRun", resourceId: "run", actorId: "reviewer", action: "PAYMENT_RECONCILIATION_RUN_SIGN", metadata: { path: ["certificateHash"], equals: run.certificateHash } }, select: { id: true } })
  expect(tx.ledgerAuditEvent.findFirst.mock.invocationCallOrder[0]).toBeLessThan((buildReconciliationEvidenceManifestInTx as jest.Mock).mock.invocationCallOrder[0])
})

it("continues to admit a valid retained v2 approval without rewriting it", async () => {
  const tx = fixture(), run = signedRun(); run.certificatePayload.version = 2; run.certificateHash = certificateHash(run.certificatePayload)
  const before = JSON.stringify(run)
  tx.reconciliationRun.findMany.mockResolvedValue([run])
  expect((await readAccountCloseCoverage(tx as any, scope)).accounts[0].signedRuns).toEqual([{ id: run.id, hash: run.certificateHash }])
  expect(JSON.stringify(run)).toBe(before)
})

it.each(["self-hash-only", "missing-maker", "missing-signer", "same-maker-checker", "foreign-organization", "foreign-account", "foreign-payload-organization", "foreign-payload-run", "foreign-payload-account", "foreign-payload-rail", "foreign-payload-period", "missing-period", "missing-lineage", "mutable-signature", "missing-audit", "voided", "wrong-version", "changed-signature-time", "changed-certificate-hash"])("denies %s SIGNED coverage without current-source credit", async kind => {
  const tx = fixture(), run: any = signedRun()
  if (kind === "self-hash-only") run.certificatePayload = { evidence: { sourceHash: currentSourceHash } }
  if (kind === "missing-maker") run.runById = null
  if (kind === "missing-signer") run.signedById = null
  if (kind === "same-maker-checker") run.runById = run.signedById
  if (kind === "foreign-organization") run.organizationId = "foreign"
  if (kind === "foreign-account") run.providerAccountId = "foreign"
  if (kind === "foreign-payload-organization") run.certificatePayload.organizationId = "foreign"
  if (kind === "foreign-payload-run") run.certificatePayload.runId = "foreign"
  if (kind === "foreign-payload-account") run.certificatePayload.providerAccountId = "foreign"
  if (kind === "foreign-payload-rail") run.certificatePayload.paymentRailId = "foreign"
  if (kind === "foreign-payload-period") run.certificatePayload.accountingPeriodId = "foreign"
  if (kind === "missing-period") run.accountingPeriodId = null
  if (kind === "missing-lineage") run.metadata = {}
  if (kind === "mutable-signature") run.metadata.immutableAfterSignoff = false
  if (kind === "missing-audit") tx.ledgerAuditEvent.findFirst.mockResolvedValue(null)
  if (kind === "voided") run.voidedAt = cutoff
  if (kind === "wrong-version") run.certificatePayload.version = 1
  if (kind === "changed-signature-time") run.certificatePayload.signedAt = start.toISOString()
  run.certificateHash = kind === "changed-certificate-hash" ? "b".repeat(64) : certificateHash(run.certificatePayload)
  tx.reconciliationRun.findMany.mockResolvedValue([run])
  const row = (await readAccountCloseCoverage(tx as any, scope)).accounts[0]
  expect(row.status).toBe("BLOCKED"); expect(row.reasons).toContain("STALE_SIGNOFF"); expect(row.signedRuns).toEqual([])
  expect(buildReconciliationEvidenceManifestInTx).not.toHaveBeenCalled()
})

it("does not reinterpret a signature audit read failure as invalid historical approval", async () => {
  const tx = fixture(); tx.ledgerAuditEvent.findFirst.mockRejectedValue(new Error("signature audit unavailable"))
  await expect(readAccountCloseCoverage(tx as any, scope)).rejects.toThrow("signature audit unavailable")
  expect(buildReconciliationEvidenceManifestInTx).not.toHaveBeenCalled()
})

it("propagates a current-source conflict after valid retained approval", async () => {
  const tx = fixture(); (buildReconciliationEvidenceManifestInTx as jest.Mock).mockRejectedValue(new ConflictError("source evidence requires review"))
  await expect(readAccountCloseCoverage(tx as any, scope)).rejects.toThrow("source evidence requires review")
})

it("keeps an invalid signed row as an open obligation even beside a valid retained approval", async () => {
  const tx = fixture(), valid = signedRun(), invalid = { ...signedRun("unsigned-envelope"), runById: null }
  tx.reconciliationRun.findMany.mockImplementation(({ where }) => Promise.resolve(where.providerAccountId === "a" ? [valid, invalid] : []))
  const row = (await readAccountCloseCoverage(tx as any, scope)).accounts[0]
  expect(row.status).toBe("BLOCKED"); expect(row.reasons).toEqual(["STALE_SIGNOFF", "OPEN_OBLIGATIONS"])
  expect(row.signedRuns).toEqual([{ id: valid.id, hash: valid.certificateHash }]); expect(row.obligationCount).toBe(1)
})
