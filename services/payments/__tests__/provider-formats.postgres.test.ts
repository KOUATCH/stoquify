jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const target = process.env.AF07_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF07_CLUSTER_DIR) throw Error("Explicit AF07 disposable target required")
  if (!require("node:path").isAbsolute(process.env.AF07_CLUSTER_DIR)) throw Error("Absolute AF07 cluster directory required")
  const u = new URL(target)
  if (u.protocol !== "postgresql:" || u.hostname !== "127.0.0.1" || !u.port || u.search || u.hash || !/^\/stoquify_local_af07_[a-z0-9_]+$/.test(u.pathname)) throw Error("Wrong AF07 target")
  return { db: new PrismaClient({ datasources: { db: { url: target } }, transactionOptions: { maxWait: 10000, timeout: 15000 } }) }
})
import { readFileSync, realpathSync, writeFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { importProviderStatement } from "../statement-import.service"
import { MobileMoneyHmacAdapter, sha256 } from "../adapters/mobile-money-hmac.adapter"
import { readAccountCloseCoverage } from "@/services/reconciliation/account-close-coverage.service"
import { createCloseControlScope } from "@/services/accounting/close-control-scope"
import { buildReconciliationEvidenceManifestInTx, stableReconciliationEvidenceStringify } from "@/services/reconciliation/payment-reconciliation-evidence.service"
import { proposeNoActivityEvidence, decideNoActivityEvidence } from "@/services/reconciliation/no-activity-evidence.service"
const adapter = new MobileMoneyHmacAdapter("SYNTHETIC_PILOT")
const prefix = `af07-${Date.now()}`
const start = new Date("2026-09-01"), end = new Date("2026-09-30T23:59:59.999Z")
const rawFixture = readFileSync(join(__dirname, "../__fixtures__/af07-pilot.csv"), "utf8")
beforeAll(async () => {
  const actual = await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory")
  if (realpathSync(actual[0].data_directory).toLowerCase() !== realpathSync(process.env.AF07_CLUSTER_DIR!).toLowerCase()) throw Error("Wrong owned cluster")
})
afterAll(async () => { await db.$disconnect() })
async function fixture(name: string) {
  const org = prefix + "-" + name
  await db.organization.create({ data: { id: org, name: "Synthetic AF07 " + name, slug: org, currency: "XAF" } })
  const rail = await db.paymentRail.create({ data: { organizationId: org, type: "MOBILE_MONEY", code: "synthetic", name: "Synthetic" } })
  const account = await db.providerAccount.create({ data: { organizationId: org, paymentRailId: rail.id, providerCode: "synthetic", displayName: "Synthetic", externalAccountHash: "synthetic", status: "ACTIVE" } })
  const year = await db.fiscalYear.create({ data: { organizationId: org, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  const period = await db.accountingPeriod.create({ data: { organizationId: org, fiscalYearId: year.id, periodNumber: 9, name: "September", startDate: start, endDate: end } })
  const input = { organizationId: org, providerAccountId: account.id, adapter }
  return { org, rail, account, period, input }
}
const single = (id: string, amount = "10.00") => JSON.stringify([{ transactionId: id, direction: "CREDIT", amount, currency: "XAF", date: "2026-09-01T10:00:00Z" }])
async function coverage(f: Awaited<ReturnType<typeof fixture>>) {
  return db.$transaction(tx => readAccountCloseCoverage(tx, createCloseControlScope(f.org, f.period, new Date())), { isolationLevel: "RepeatableRead" })
}
it("imports exact Decimal controls, preserves fingerprints and replays without another event/outbox", async () => {
  const f = await fixture("controls"), first = await importProviderStatement({ ...f.input, rawContent: rawFixture })
  expect(first).toMatchObject({ status: "IMPORTED", importedLineCount: 4 })
  const stored = await db.statementLine.findMany({ where: { statementFileId: first.statementFileId }, orderBy: { lineNumber: "asc" } })
  expect(stored.reduce((n, row) => n.plus(row.amount), new Prisma.Decimal(0)).toFixed(2)).toBe("126.70")
  expect(stored.reduce((n, row) => n.plus(row.feeAmount ?? 0), new Prisma.Decimal(0)).toFixed(2)).toBe("0.20")
  expect(stored[0].fingerprint).toBe(sha256('synthetic-1|receipt-1|CREDIT|100.20|XAF|2026-09-01T10:00:00.000Z'))
  expect((await importProviderStatement({ ...f.input, rawContent: rawFixture })).status).toBe("DUPLICATE_FILE")
  expect(await db.statementFile.count({ where: { organizationId: f.org } })).toBe(1)
  const events = await db.businessEvent.findMany({ where: { organizationId: f.org, eventType: "payment.statement.imported" }, include: { outboxMessages: true } })
  expect(events).toHaveLength(1); expect(events[0].outboxMessages).toHaveLength(1)
})
it("rejects an entire mixed file when one identity changes and replays the same retained exception", async () => {
  const f = await fixture("changed")
  await importProviderStatement({ ...f.input, rawContent: single("existing") })
  const rawContent = JSON.stringify([...JSON.parse(single("existing", "11.00")), ...JSON.parse(single("new"))])
  const a = await importProviderStatement({ ...f.input, rawContent })
  const b = await importProviderStatement({ ...f.input, rawContent })
  expect(a.status).toBe("DUPLICATE_LINE"); expect(b.exceptionId).toBe(a.exceptionId)
  expect(await db.statementLine.count({ where: { organizationId: f.org } })).toBe(1)
  expect(await db.paymentException.count({ where: { organizationId: f.org } })).toBe(1)
})
it("serializes simultaneous identical imports and changed identities", async () => {
  const f = await fixture("concurrent")
  const exact = await Promise.all([1, 2].map(() => importProviderStatement({ ...f.input, rawContent: single("one") })))
  expect(exact.map(r => r.status).sort()).toEqual(["DUPLICATE_FILE", "IMPORTED"])
  const changed = await Promise.all(["20.00", "21.00"].map(amount => importProviderStatement({ ...f.input, rawContent: single("two", amount) })))
  expect(changed.map(r => r.status).sort()).toEqual(["DUPLICATE_LINE", "IMPORTED"])
  expect(await db.statementLine.count({ where: { organizationId: f.org } })).toBe(2)
})
it("isolates identical file receipts across two accounts and denies a foreign account", async () => {
  const f = await fixture("accounts")
  const second = await db.providerAccount.create({ data: { organizationId: f.org, paymentRailId: f.rail.id, providerCode: "second", displayName: "Second", externalAccountHash: "second", status: "ACTIVE" } })
  const a = await importProviderStatement({ ...f.input, rawContent: rawFixture })
  const b = await importProviderStatement({ ...f.input, providerAccountId: second.id, rawContent: rawFixture })
  expect(a.inboxItemId).not.toBe(b.inboxItemId)
  const foreign = await fixture("foreign")
  await expect(importProviderStatement({ ...foreign.input, providerAccountId: f.account.id, rawContent: rawFixture })).rejects.toMatchObject({ reason: "PROVIDER_ACCOUNT_NOT_FOUND" })
  expect(await db.statementFile.count({ where: { organizationId: foreign.org } })).toBe(0)
})
it("rolls back files, lines and inbox when the transactional event fails, then safely retries", async () => {
  const f = await fixture("rollback")
  // Synthetic trigger on this disposable database only. All domain writers run.
  await db.$executeRawUnsafe(`CREATE FUNCTION af07_reject_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."correlationId" = 'af07-inject-failure' THEN RAISE EXCEPTION 'AF07 injected event failure'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe('CREATE TRIGGER af07_reject_event BEFORE INSERT ON "business_events" FOR EACH ROW EXECUTE FUNCTION af07_reject_event()')
  try {
    await expect(importProviderStatement({ ...f.input, rawContent: rawFixture, correlationId: "af07-inject-failure" })).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
    expect(await db.statementFile.count({ where: { organizationId: f.org } })).toBe(0)
    expect(await db.statementLine.count({ where: { organizationId: f.org } })).toBe(0)
    expect(await db.paymentReconciliationInboxItem.count({ where: { organizationId: f.org } })).toBe(0)
    expect(await db.businessEvent.count({ where: { organizationId: f.org } })).toBe(0)
  } finally {
    await db.$executeRawUnsafe('DROP TRIGGER af07_reject_event ON "business_events"')
    await db.$executeRawUnsafe("DROP FUNCTION af07_reject_event()")
  }
  expect((await importProviderStatement({ ...f.input, rawContent: rawFixture })).status).toBe("IMPORTED")
})
it("retains historical permissive file identity without reinterpreting old bytes", async () => {
  const f = await fixture("legacy"), rawContent = "old,ambiguous\n01/02/2026,100"
  const file = await db.statementFile.create({ data: { organizationId: f.org, providerAccountId: f.account.id, fileHash: sha256(rawContent), sourceType: "LEGACY", periodStart: start, periodEnd: end } })
  const receipt = await db.paymentReconciliationInboxItem.create({ data: { organizationId: f.org, providerAccountId: f.account.id,
    source: "STATEMENT_FILE", idempotencyKey: sha256(rawContent), payloadHash: sha256(rawContent) } })
  const result = await importProviderStatement({ ...f.input, rawContent })
  expect(result).toMatchObject({ status: "DUPLICATE_FILE", statementFileId: file.id, importedLineCount: 0, duplicateLineCount: 0 })
  expect(result.inboxItemId).toBe(receipt.id)
  expect(await db.paymentReconciliationInboxItem.count({ where: { organizationId: f.org } })).toBe(1)
})
it("rejects decoded invalid text and coerced line numbers before persisting source evidence", async () => {
  const f = await fixture("invalid-text")
  for (const change of [{ transactionId: "bad\u0000id" }, { transactionId: "bad\uD800id" }, { lineNumber: true }]) {
    const rawContent = JSON.stringify([{ ...JSON.parse(single("invalid"))[0], ...change }])
    await expect(importProviderStatement({ ...f.input, rawContent })).rejects.toMatchObject({ reason: "INVALID_PAYLOAD" })
  }
  expect(await db.statementFile.count({ where: { organizationId: f.org } })).toBe(0)
  expect(await db.statementLine.count({ where: { organizationId: f.org } })).toBe(0)
  expect(await db.paymentReconciliationInboxItem.count({ where: { organizationId: f.org } })).toBe(0)
  expect(await db.businessEvent.count({ where: { organizationId: f.org } })).toBe(0)
})
it("imports the supported 1000-line boundary atomically with exact totals", async () => {
  const f = await fixture("large")
  const rawContent = "transactionId,direction,amount,currency,date\n" + Array.from({ length: 1000 }, (_, n) =>
    `large-${n},CREDIT,0.10,XAF,2026-09-01T10:00:00Z`).join("\n")
  const started = performance.now()
  const result = await importProviderStatement({ ...f.input, rawContent })
  const elapsedMs = performance.now() - started
  expect(result.importedLineCount).toBe(1000)
  const totals = await db.statementLine.aggregate({ where: { statementFileId: result.statementFileId }, _sum: { amount: true }, _count: true })
  expect(totals._count).toBe(1000); expect(totals._sum.amount?.toFixed(2)).toBe("100.00")
  const evidence = process.env.AF07_EVIDENCE_DIR
  if (!evidence) return
  if (!isAbsolute(evidence)) throw Error("AF07_EVIDENCE_DIR must be absolute")
  writeFileSync(join(evidence, "import-performance.json"),
    JSON.stringify({ rows: 1000, utf8Bytes: Buffer.byteLength(rawContent), elapsedMs, total: "100.00",
      scope: "Synthetic local PostgreSQL import, including locks, statements, inbox, event/outbox and invalidation; no production SLO." }, null, 2), { flag: "wx" })
})
it("distinguishes absent coverage, independently approved zero activity and contradictory late imports", async () => {
  const f = await fixture("no-activity")
  expect((await coverage(f)).accounts[0].reasons).toContain("MISSING_STATEMENT")
  const control = (actorId: string) => ({ organizationId: f.org, actorId, actorPermissions: ["payments.reconciliation.run", "payments.reconciliation.sign"], lastAuthAt: new Date() })
  const proof = await proposeNoActivityEvidence({ providerAccountId: f.account.id, periodId: f.period.id, idempotencyKey: "zero",
    sourceReference: "synthetic-retained-zero-statement", sourceDocumentHash: "sha256:" + "a".repeat(64), reason: "Synthetic reviewed statement confirms zero activity" }, control("preparer"))
  const decision = { evidenceId: proof.id, expectedEvidenceHash: proof.evidenceHash, decision: "APPROVE" as const }
  await expect(decideNoActivityEvidence(decision, control("preparer"))).rejects.toThrow(/independent/)
  await decideNoActivityEvidence(decision, control("reviewer"))
  expect((await coverage(f)).accounts[0].status).toBe("NO_ACTIVITY_APPROVED")
  await importProviderStatement({ ...f.input, rawContent: rawFixture })
  expect((await coverage(f)).accounts[0].status).toBe("BLOCKED")
})
it("removes a signed run from current coverage after changed source evidence", async () => {
  const f = await fixture("freshness")
  await importProviderStatement({ ...f.input, rawContent: rawFixture })
  const [maker, signer] = await Promise.all(["maker", "signer"].map(role => db.user.create({ data: { organizationId: f.org, name: role, email: `${f.org}-${role}@example.invalid` } })))
  const run = await db.reconciliationRun.create({ data: { organizationId: f.org, providerAccountId: f.account.id, paymentRailId: f.rail.id,
    accountingPeriodId: f.period.id, runById: maker.id, businessDate: start, periodStart: start, periodEnd: new Date(+end + 1) } })
  const manifest = await db.$transaction(tx => buildReconciliationEvidenceManifestInTx(tx, { organizationId: f.org, providerAccountId: f.account.id, reconciliationRunId: run.id, periodStart: start, periodEnd: new Date(+end + 1), includeAmountSummary: true }))
  const signedAt = new Date(), sourceVersionHash = "sha256:" + "a".repeat(64)
  // Canonical v3 retained-envelope/audit fixture only. Financial signing and a
  // full-period producer lifecycle are deliberately not established by this test.
  const payload = { version: 3, mode: "DURABLE_EVIDENCE_KERNEL", organizationId: f.org, runId: run.id,
    providerAccountId: f.account.id, paymentRailId: f.rail.id, providerCode: f.account.providerCode, accountingPeriodId: f.period.id,
    businessDate: start.toISOString(), periodStart: start.toISOString(), periodEnd: new Date(+end + 1).toISOString(), sourceVersionHash,
    reviewedEvidenceRevision: "sha256:" + "b".repeat(64), amountSummary: manifest.amountSummary ?? null,
    recordedRunTotals: { basis: "CUMULATIVE_RUN_CAPTURE_NOT_CURRENT_EXPOSURE", internalAmount: "0.00", externalAmount: "0.00", matchedAmount: "0.00", suspenseAmount: "0.00", matchCount: 0, exceptionCount: 0 },
    evidence: { providerEventCount: manifest.counts.providerEventCount, statementLineCount: manifest.counts.statementLineCount, openExceptionCount: 0, openSuspenseCount: 0, sourceManifestVersion: manifest.version, sourceHash: manifest.sourceHash, sourceCounts: manifest.counts },
    controls: { makerCheckerEnforced: true, freshAuthEnforced: true, periodOpenVerified: true, providerAccountReadyVerified: true, suspensePostingGatewayOnly: true, sourceVersionGuardEnforced: true, conditionalTerminalTransition: true },
    signedById: signer.id, signedAt: signedAt.toISOString(), correlationId: "coverage-fixture" }
  const hash = createHash("sha256").update(stableReconciliationEvidenceStringify(payload)).digest("hex")
  await db.reconciliationRun.update({ where: { id: run.id }, data: { status: "SIGNED", signedById: signer.id, signedAt, certificatePayload: payload, certificateHash: hash,
    metadata: { signedSourceVersionHash: sourceVersionHash, immutableAfterSignoff: true } } })
  expect((await coverage(f)).accounts[0].signedRuns).toEqual([])
  await db.ledgerAuditEvent.create({ data: { organizationId: f.org, resourceType: "ReconciliationRun", resourceId: run.id, actorId: signer.id,
    action: "PAYMENT_RECONCILIATION_RUN_SIGN", metadata: { certificateHash: hash, sourceVersionHash } } })
  expect((await coverage(f)).accounts[0].signedRuns).toHaveLength(1)
  await importProviderStatement({ ...f.input, rawContent: single("late-arrival") })
  const row = (await coverage(f)).accounts[0]
  expect(row.reasons).toContain("STALE_SIGNOFF"); expect(row.signedRuns).toEqual([])
  expect((await db.reconciliationRun.findUniqueOrThrow({ where: { id: run.id } })).certificateHash).toBe(hash)
})
