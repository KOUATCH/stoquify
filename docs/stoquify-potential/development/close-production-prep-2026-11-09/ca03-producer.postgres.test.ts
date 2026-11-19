/** @jest-environment node */
// Actual statement import -> matching run -> independent preview/sign services.
// Raw CONFIRMED payment inputs and configuration are synthetic fixture facts;
// no READY/SIGNED/T4/posted-journal/close-certificate state is seeded or claimed.
import fs from "node:fs"
import crypto from "node:crypto"
import { db } from "@/prisma/db"
import { MobileMoneyHmacAdapter, sha256 } from "@/services/payments/adapters/mobile-money-hmac.adapter"
import { importProviderStatement } from "@/services/payments/statement-import.service"
import { runPaymentReconciliation } from "@/services/reconciliation/payment-reconciliation-run.service"
import { previewReconciliationSignOff, signReconciliationRun } from "@/services/reconciliation/payment-reconciliation-certification.service"
import { readAccountCloseCoverage } from "@/services/reconciliation/account-close-coverage.service"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"

const url = new URL(process.env.CA03_POSTGRES_URL || "")
if (url.hostname !== "localhost" || url.pathname !== "/" + process.env.CA03_DATABASE_NAME || !/^\/stoquify_replay_close_producer_20261109_[a-f0-9]{10}$/.test(url.pathname) || url.searchParams.get("schema") !== "public") throw Error("Exact new owned CA03 producer database required")
const start = new Date("2026-09-01T00:00:00.000Z"), end = new Date("2026-09-30T23:59:59.999Z")
const evidence: Array<Record<string, unknown>> = []
const makerPermissions = ["payments.reconciliation.read", "payments.reconciliation.run", "payments.reconciliation.import"]
const signerPermissions = ["payments.reconciliation.read", "payments.reconciliation.sign"]

async function fixture(options: { dailyFirst?: boolean; midDay?: boolean } = {}) {
  const id = "ca03-" + crypto.randomBytes(5).toString("hex"), organizationId = id + "-org"
  const modules = ["accounting", "finance", "payment_reconciliation", "close_assurance"]
  await db.organization.create({ data: { id: organizationId, name: "Synthetic CA03 producer", slug: id, countryCode: "CM", currency: "XAF", requestedModules: modules } })
  await db.tenantModuleConfiguration.create({ data: { organizationId, manifestHash: sha256(id), revision: 1, activeRevision: 1, selectedModules: modules, activeModules: modules } })
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId, moduleSlug, status: "active", source: "manual_override" })) })
  async function actor(kind: string, permissions: string[]) {
    const role = await db.role.create({ data: { organizationId, code: id + "-" + kind, nameEn: "Synthetic " + kind, permissions } })
    const user = await db.user.create({ data: { organizationId, email: id + "-" + kind + "@example.invalid", name: "Synthetic " + kind, emailVerified: true, isVerified: true, roles: { connect: { id: role.id } } } })
    const session = await db.session.create({ data: { userId: user.id, token: "ca03_session_" + crypto.randomBytes(32).toString("hex"), expiresAt: new Date(Date.now() + 3600000), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: organizationId, assuranceLevel: 1 } })
    return { user, session, permissions }
  }
  const maker = await actor("maker", makerPermissions), signer = await actor("signer", signerPermissions)
  const year = await db.fiscalYear.create({ data: { organizationId, name: id, startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-12-31T23:59:59.999Z") } })
  const period = await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: year.id, name: "Synthetic September", periodNumber: 9,
    startDate: options.midDay ? new Date("2026-09-01T12:00:00Z") : start, endDate: end, status: "OPEN" } })
  const settlement = await db.chartOfAccount.create({ data: { organizationId, code: "512-CA03", nameEn: "Synthetic settlement", type: "ASSET", normalBalance: "DEBIT", currency: "XAF" } })
  const suspense = await db.chartOfAccount.create({ data: { organizationId, code: "471-CA03", nameEn: "Synthetic suspense", type: "LIABILITY", normalBalance: "CREDIT", currency: "XAF" } })
  const rail = await db.paymentRail.create({ data: { organizationId, type: "MOBILE_MONEY", code: "SYNTHETIC_PILOT", name: "Synthetic local statement rail", currencyCode: "XAF" } })
  const account = await db.providerAccount.create({ data: { organizationId, paymentRailId: rail.id, providerCode: "SYNTHETIC_PILOT", displayName: "Synthetic CA03 account", status: "ACTIVE", currencyCode: "XAF",
    externalAccountHash: sha256(id + "-external-account"), settlementLedgerAccountId: settlement.id, suspenseLedgerAccountId: suspense.id } })
  await db.settlementAccount.create({ data: { organizationId, providerAccountId: account.id, ledgerAccountId: settlement.id, approvalStatus: "APPROVED", requestedById: maker.user.id, approvedById: signer.user.id, approvedAt: new Date(), effectiveFrom: start } })
  const occurredAt = new Date(options.dailyFirst ? "2026-09-01T12:00:00Z" : "2026-09-15T12:00:00Z")
  const transactionId = id + "-payment", reference = id + "-reference"
  // Raw internal-source fixture only. Matching/signing states below are earned.
  await db.paymentTransaction.create({ data: { organizationId, providerAccountId: account.id, direction: "INBOUND", state: "CONFIRMED", amount: "100.00", currencyCode: "XAF",
    providerTransactionId: transactionId, providerReference: reference, idempotencyKey: id + "-raw-source", occurredAt, confirmedAt: occurredAt, payloadHash: sha256(id + "-raw-payment"), sourceType: "SYNTHETIC_CA03_INPUT" } })
  const line = { providerTransactionId: transactionId, providerReference: reference, direction: "CREDIT", amount: "100.00", currencyCode: "XAF", occurredAt: occurredAt.toISOString() }
  const envelope = { formatVersion: "stoquify-statement-v1", providerCode: "SYNTHETIC_PILOT", providerAccountId: account.id, currencyCode: "XAF", periodStart: start.toISOString(), periodEnd: end.toISOString(), lines: [line] }
  return { id, organizationId, maker, signer, period, account, line, envelope, adapter: new MobileMoneyHmacAdapter("SYNTHETIC_PILOT") }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
async function scopedCounts(f: Fixture) {
  const where = { organizationId: f.organizationId }
  return { files: await db.statementFile.count({ where }), lines: await db.statementLine.count({ where }), runs: await db.reconciliationRun.count({ where }), matches: await db.matchRecord.count({ where }), exceptions: await db.paymentException.count({ where }), suspense: await db.suspenseItem.count({ where }), events: await db.businessEvent.count({ where }) }
}
async function importAndRun(f: Fixture, declared: boolean) {
  const rawContent = JSON.stringify(declared ? f.envelope : [f.line])
  const imported = await importProviderStatement({ organizationId: f.organizationId, providerAccountId: f.account.id, adapter: f.adapter, rawContent, importedById: f.maker.user.id, correlationId: f.id + "-import" })
  expect(imported.status).toBe("IMPORTED"); expect(imported.fileHash).toBe(sha256(rawContent))
  const row = await db.statementFile.findUniqueOrThrow({ where: { id: imported.statementFileId! } })
  expect((row.metadata as any).coverageKind).toBe(declared ? "DECLARED" : "OBSERVED")
  expect((row.metadata as any).observedPeriodStart).toBe(f.line.occurredAt)
  if (declared) { expect(row.periodStart).toEqual(start); expect(row.periodEnd).toEqual(end); expect((row.metadata as any).declaredCoverage.sourceFileHash).toBe(imported.fileHash) }
  const result = await runPaymentReconciliation({ organizationId: f.organizationId, providerAccountId: f.account.id, accountingPeriodId: f.period.id, runById: f.maker.user.id, correlationId: f.id + "-run" })
  expect(result.status).toBe("READY_FOR_SIGNOFF"); expect(result.matchCount).toBe(1); expect(result.exceptionCount).toBe(0)
  const run = await db.reconciliationRun.findUniqueOrThrow({ where: { id: result.runId } })
  expect(run.periodStart).toEqual(start); expect(run.periodEnd).toEqual(new Date(+end + 1)); expect(run.accountingPeriodId).toBe(f.period.id)
  expect((run.metadata as any).scope.kind).toBe("ACCOUNTING_PERIOD"); expect((run.metadata as any).scope.scopeHash).toMatch(/^sha256:[a-f0-9]{64}$/)
  return { run, imported }
}
async function independentlySign(f: Fixture, runId: string) {
  const review = await previewReconciliationSignOff({ organizationId: f.organizationId, runId, actorId: f.signer.user.id, actorPermissions: f.signer.permissions })
  if (!review.canSign || !review.expectedEvidenceRevision || !review.expectedSourceVersionHash) throw Error("Actual independent sign-off preparation remained blocked: " + review.blocker)
  const signed = await signReconciliationRun({ organizationId: f.organizationId, runId, signedById: f.signer.user.id,
    expectedEvidenceRevision: review.expectedEvidenceRevision, expectedSourceVersionHash: review.expectedSourceVersionHash,
    control: { actorPermissions: f.signer.permissions, lastAuthAt: f.signer.session.assuranceVerifiedAt! }, correlationId: f.id + "-sign" })
  expect(signed.outcome).toBe("SIGNED"); expect(signed.replayed).toBe(false)
  expect(await db.ledgerAuditEvent.count({ where: { organizationId: f.organizationId, resourceId: runId, action: "PAYMENT_RECONCILIATION_RUN_SIGN", actorId: f.signer.user.id } })).toBe(1)
  return signed
}
afterAll(async () => {
  try {
    const counts = { signedReconciliationRuns: await db.reconciliationRun.count({ where: { status: "SIGNED" } }), journals: await db.journalEntry.count(), closeRuns: await db.closeRun.count(), certifiedCloseExports: await db.closePackExport.count({ where: { isCertified: true } }) }
    expect(counts.journals + counts.closeRuns + counts.certifiedCloseExports).toBe(0)
    fs.writeFileSync(process.env.CA03_PROBE_EVIDENCE!, JSON.stringify({ checks: evidence, counts, limitation: "Actual import/matching/independent sign-off/coverage service lifecycle over synthetic raw confirmed-payment facts; no seeded READY/SIGNED/T4, posted ledger, earned close certificate, real provider, HTTP authentication or deployment claim." }, null, 2) + "\n", { flag: "wx" })
  } finally { await db.$disconnect() }
})
it("earns full-period reconciliation/signature and declared account coverage through actual producers", async () => {
  const f = await fixture(), { run, imported } = await importAndRun(f, true)
  const signed = await independentlySign(f, run.id)
  const scope = createCloseControlScope(f.organizationId, f.period, new Date())
  const coverage = await db.$transaction(tx => readAccountCloseCoverage(tx, scope))
  expect(coverage.requiredAccountCount).toBe(1); expect(coverage.accounts[0].status).toBe("RECONCILED")
  expect(coverage.accounts[0].statementGaps).toEqual([]); expect(coverage.accounts[0].signoffGaps).toEqual([])
  expect(coverage.accounts[0].signedRuns).toEqual([{ id: run.id, hash: signed.certificateHash }])
  evidence.push({ name: "actual-declared-import-period-run-independent-sign-coverage", organizationId: f.organizationId, statementFileId: imported.statementFileId, sourceFileHash: imported.fileHash, runId: run.id, certificateHash: signed.certificateHash, earnedReconciliationSignature: true, seededTerminalStatus: false, earnedCloseCertificate: false })
})
it("keeps observed-only legacy input ineligible for period coverage even after actual independent sign-off", async () => {
  const f = await fixture(), { run } = await importAndRun(f, false)
  await independentlySign(f, run.id)
  const coverage = await db.$transaction(tx => readAccountCloseCoverage(tx, createCloseControlScope(f.organizationId, f.period, new Date())))
  expect(coverage.accounts[0].status).toBe("BLOCKED"); expect(coverage.accounts[0].reasons).toContain("PARTIAL_STATEMENT")
  evidence.push({ name: "legacy-observed-no-period-credit", actualSignedReconciliation: true, coverageBlocked: true, sourceMetadataPromoted: false })
})
it("preserves an actual daily run and rejects a competing full-period identity without effects", async () => {
  const f = await fixture({ dailyFirst: true })
  await importProviderStatement({ organizationId: f.organizationId, providerAccountId: f.account.id, adapter: f.adapter, rawContent: JSON.stringify(f.envelope), importedById: f.maker.user.id })
  const daily = await runPaymentReconciliation({ organizationId: f.organizationId, providerAccountId: f.account.id, businessDate: start, runById: f.maker.user.id })
  expect(daily.matchCount).toBe(1)
  const before = await scopedCounts(f), original = await db.reconciliationRun.findUniqueOrThrow({ where: { id: daily.runId } })
  await expect(runPaymentReconciliation({ organizationId: f.organizationId, providerAccountId: f.account.id, accountingPeriodId: f.period.id, runById: f.maker.user.id })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(await scopedCounts(f)).toEqual(before); expect(await db.reconciliationRun.findUniqueOrThrow({ where: { id: daily.runId } })).toEqual(original)
  evidence.push({ name: "limited-daily-period-coexistence", dailyRunId: daily.runId, collisionDenied: true, noExpansionOrRewrite: true })
})
it.each(["account", "provider", "currency", "bounds", "version"])("rejects declared %s mismatch before importing financial evidence", async kind => {
  const f = await fixture(), before = await scopedCounts(f), envelope = { ...f.envelope }
  if (kind === "account") envelope.providerAccountId = "foreign-account"
  if (kind === "provider") envelope.providerCode = "foreign-provider"
  if (kind === "currency") envelope.currencyCode = "USD"
  if (kind === "bounds") envelope.periodEnd = start.toISOString()
  if (kind === "version") envelope.formatVersion = "unsupported-version"
  const message = kind === "account" ? "Declared statement coverage does not match the provider account, currency or line dates."
    : kind === "provider" ? "Statement provider identity does not match its adapter."
      : kind === "version" ? "Use the supported versioned statement envelope with explicit coverage and account identity."
        : "Statement lines must match the declared currency and coverage bounds."
  await expect(importProviderStatement({ organizationId: f.organizationId, providerAccountId: f.account.id, adapter: f.adapter, rawContent: JSON.stringify(envelope), importedById: f.maker.user.id })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION", reason: "INVALID_PAYLOAD", message })
  expect(await scopedCounts(f)).toEqual(before); evidence.push({ name: "declared-input-denial", kind, allScopedCountsUnchanged: true })
})
it.each(["foreign", "mid-day", "daily operation"])("rejects %s period scope without creating a run", async kind => {
  const f = await fixture({ ...(kind === "mid-day" ? { midDay: true } : {}) }), before = await scopedCounts(f)
  await expect(runPaymentReconciliation({ organizationId: f.organizationId, providerAccountId: f.account.id, accountingPeriodId: kind === "foreign" ? "foreign-period" : f.period.id, runById: f.maker.user.id,
    ...(kind === "daily operation" ? { providerOperationId: "daily-only-operation" } : {}) })).rejects.toMatchObject({ code: kind === "foreign" ? "NOT_FOUND" : "CONFLICT" })
  expect(await scopedCounts(f)).toEqual(before); evidence.push({ name: "period-scope-denial", kind, allScopedCountsUnchanged: true })
})
it("retains the real period-control guard against an unauthorized direct close transition", async () => {
  const f = await fixture(), before = await scopedCounts(f)
  const original = await db.accountingPeriod.findUniqueOrThrow({ where: { id: f.period.id } })
  const historyCount = await db.periodControlEvent.count({ where: { organizationId: f.organizationId, periodId: f.period.id } })
  let failure: unknown
  try { await db.$executeRaw`UPDATE accounting_periods SET status = 'CLOSED' WHERE id = ${f.period.id} AND "organizationId" = ${f.organizationId}` } catch (error) { failure = error }
  expect(failure).toMatchObject({ code: "P2010", meta: expect.objectContaining({ code: "P0001", message: expect.stringContaining("Period transition requires a matching retained receipt and version") }) })
  expect(await db.accountingPeriod.findUniqueOrThrow({ where: { id: f.period.id } })).toEqual(original)
  expect(await db.periodControlEvent.count({ where: { organizationId: f.organizationId, periodId: f.period.id } })).toBe(historyCount)
  expect(await scopedCounts(f)).toEqual(before)
  evidence.push({ name: "real-period-control-guard", unauthorizedDirectCloseDenied: true, periodAndHistoryUnchanged: true, allScopedCountsUnchanged: true, closedPeriodProducerDenial: "mocked-unit-only" })
})
