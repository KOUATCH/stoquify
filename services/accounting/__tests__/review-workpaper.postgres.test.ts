jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const target = process.env.AF08_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF08_CLUSTER_DIR) throw Error("Explicit synthetic AF08 target required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || url.port !== "55441" || url.pathname !== "/stoquify_local_af08_20261020_r1") throw Error("Wrong AF08 target")
  return { db: new PrismaClient({ datasources: { db: { url: target } }, transactionOptions: { maxWait: 10000, timeout: 15000 } }) }
})
import { realpathSync, writeFileSync } from "node:fs"
import { db } from "@/prisma/db"
import { getReviewWorkpaperBinder, recordWorkpaperDecision, rollForwardWorkpaperStructure, exportReviewWorkpapers, type WorkpaperActor } from "../review-workpaper.service"
import { proposeBalanceSheetEvidence, decideBalanceSheetEvidence } from "../balance-sheet-evidence.service"
import { executeFirmEngagementCommand } from "../firm-engagement.service"
import { WORKPAPER_KINDS } from "../review-workpaper.contract"
import { balanceSheetHash } from "../balance-sheet-contract"
const prefix = `af08-${Date.now()}`
const out = "docs/accounting-firms/roadmap-2026-10-19/execution/AF08/2026-10-20-run-01"
const permissions = ["accounting.audit.read", "accounting.close.read", "accounting.close.run", "accounting.close.certify",
  "accounting.close.accountant.invite", "accounting.close.accountant.review", "accounting.close.finding.comment", "accounting.exports.create"]
beforeAll(async () => {
  const actual = await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory")
  if (realpathSync(actual[0].data_directory).toLowerCase() !== realpathSync(process.env.AF08_CLUSTER_DIR!).toLowerCase()) throw Error("Wrong owned cluster")
})
afterAll(async () => db.$disconnect())
async function fixture(name: string, missing = false) {
  const client = `${prefix}-${name}-client`, firm = `${prefix}-${name}-firm`
  for (const id of [client, firm]) await db.organization.create({ data: { id, slug: id, name: "Synthetic " + name, currency: "XAF", requestedModules: ["accounting", "close_assurance"], countryCode: "CM" } })
  const actors: Record<string, WorkpaperActor> = {}
  for (const who of ["preparer", "reviewer", "owner"]) {
    const home = who === "owner" ? client : firm, id = `${prefix}-${name}-${who}`
    await db.role.create({ data: { id: id + "-role", organizationId: home, code: who, nameEn: who, permissions } })
    await db.user.create({ data: { id, organizationId: home, email: id + "@example.invalid", name: who, emailVerified: true, roles: { connect: { id: id + "-role" } } } })
    const session = await db.session.create({ data: { userId: id, token: id + "-private-token", expiresAt: new Date("2099-01-01"), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: home, assuranceLevel: 1 } })
    actors[who] = { homeOrganizationId: home, actorId: id, actorPermissions: permissions, session: { id: session.id, token: session.token }, lastAuthAt: new Date() }
  }
  for (const who of ["preparer", "reviewer"]) await db.accountantAccessGrant.create({ data: { id: actors[who].actorId + "-grant", organizationId: client,
    accountantUserId: actors[who].actorId, accountantFirmName: "Synthetic", role: "REVIEWER", activeScopeKey: `${client}:${actors[who].actorId}`,
    consentGrantedById: actors.owner.actorId, consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") } })
  const command = (input: Record<string, unknown>) => executeFirmEngagementCommand(actors.preparer, { ...input, idempotencyKey: `${name}-${Math.random()}` })
  const e = await command({ command: "CREATE", clientOrganizationId: client, ownerUserId: actors.preparer.actorId, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
  for (const who of ["preparer", "reviewer"]) {
    await command({ command: "ASSIGN", engagementId: e.engagementId, expectedVersion: 0, accountantUserId: actors[who].actorId, expectedAssignmentVersion: 0,
      scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
    await command({ command: "ENROLL", engagementId: e.engagementId, expectedVersion: 0, grantId: actors[who].actorId + "-grant" })
  }
  await command({ command: "TRANSITION", engagementId: e.engagementId, expectedVersion: 0, status: "ACTIVE", reason: "Synthetic AF08 activation" })
  const year = await db.fiscalYear.create({ data: { organizationId: client, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  const period = await db.accountingPeriod.create({ data: { organizationId: client, fiscalYearId: year.id, periodNumber: 9, name: "AF08 September", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30T23:59:59.999Z") } })
  const journal = await db.journal.create({ data: { organizationId: client, code: "GEN", nameEn: "Synthetic", type: "GENERAL" } })
  const amounts = ["100.20", "200.10", "80.00", "50.05"]
  const accounts = []
  for (let i = 0; i < 4; i++) accounts.push(await db.chartOfAccount.create({ data: { organizationId: client, code: ["571", "411", "401", "311"][i],
    nameEn: "Synthetic " + WORKPAPER_KINDS[i], type: i === 2 ? "LIABILITY" : "ASSET", normalBalance: i === 2 ? "CREDIT" : "DEBIT", currency: "XAF" } }))
  const counter = await db.chartOfAccount.create({ data: { organizationId: client, code: "701", nameEn: "Synthetic counterpart", type: "REVENUE", normalBalance: "CREDIT" } })
  // Synthetic historical ledger fixture only. Production workpapers never write journals.
  await db.journalEntry.create({ data: { organizationId: client, journalId: journal.id, periodId: period.id, entryNumber: "SYNTHETIC-1",
    entryDate: new Date("2026-09-15"), status: "POSTED", postedAt: new Date(), currency: "XAF", lines: { create: [
      ...accounts.map((account, i) => ({ organizationId: client, accountId: account.id, lineNumber: i + 1, currency: "XAF",
        debit: i === 2 ? "0.00" : amounts[i], credit: i === 2 ? amounts[i] : "0.00", baseDebit: i === 2 ? "0.00" : amounts[i], baseCredit: i === 2 ? amounts[i] : "0.00" })),
      { organizationId: client, accountId: counter.id, lineNumber: 5, currency: "XAF", debit: "0.00", credit: "270.35", baseDebit: "0.00", baseCredit: "270.35" },
    ] } } })
  await db.closeRun.create({ data: { organizationId: client, periodId: period.id, status: "BLOCKED", runById: actors.owner.actorId, completedAt: new Date() } })
  const sourceControl = (who: string) => ({ organizationId: client, actorId: actors[who].actorId, actorPermissions: permissions, lastAuthAt: new Date() })
  const evidence = []
  for (let i = 0; i < (missing ? 3 : 4); i++) {
    const row = await proposeBalanceSheetEvidence({ ledgerAccountId: accounts[i].id, periodId: period.id, currency: "XAF", idempotencyKey: "source-" + i,
      scheduleKind: WORKPAPER_KINDS[i], basis: "SUPPORTING_SCHEDULE", explanation: "Synthetic supporting schedule",
      sourceReference: "private://synthetic-document", sourceDocumentHash: "sha256:" + "b".repeat(64), items: [{
        reference: `item-${i}`, description: "=HYPERLINK(\"private-personal-data\")", openingBalance: "0.00", additions: amounts[i], reductions: "0.00", closingBalance: amounts[i],
        sourceReference: "private://synthetic-document", sourceDocumentHash: "sha256:" + "b".repeat(64),
      }] }, sourceControl("owner"))
    evidence.push(await decideBalanceSheetEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: "APPROVE" }, sourceControl("reviewer")))
  }
  return { client, firm, actors, period, accounts, evidence, engagementId: e.engagementId, scope: { clientOrganizationId: client, periodId: period.id }, sourceControl }
}
async function prepare(f: Awaited<ReturnType<typeof fixture>>) {
  const binder = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  const input = { ...f.scope, expectedSourceHash: binder.sourceHash, idempotencyKey: "prepare", decision: "PREPARED", conclusion: "Synthetic preparation with private-personal-data" }
  const preparation = await recordWorkpaperDecision(f.actors.preparer, input)
  return { binder, input, preparation }
}
const exportInput = (f: Awaited<ReturnType<typeof fixture>>, binder: Awaited<ReturnType<typeof getReviewWorkpaperBinder>>, format = "json") =>
  ({ ...f.scope, expectedSourceHash: binder.sourceHash, expectedReviewHash: binder.reviewHash, idempotencyKey: "export", format })

it("ties all four schedules to current ledger support; independently reviews and exports one retained canonical object in three formats", async () => {
  const f = await fixture("journey"), p = await prepare(f)
  expect(p.binder.schedules.map(row => row.availability)).toEqual(Array(4).fill("RECONCILED"))
  expect(p.binder.schedules.map(row => row.accounts[0].balances!.ledger.closingBalance)).toEqual(["100.20", "200.10", "80.00", "50.05"])
  expect(await recordWorkpaperDecision(f.actors.preparer, p.input)).toMatchObject({ id: p.preparation.id, replayed: true })
  await expect(recordWorkpaperDecision(f.actors.preparer, { ...p.input, conclusion: "Changed original preparation" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  const review = { ...p.input, idempotencyKey: "review", decision: "REVIEWED", preparationId: p.preparation.id, conclusion: "Independent review of the four supported schedules" }
  await expect(recordWorkpaperDecision(f.actors.preparer, review)).rejects.toMatchObject({ code: "SOD_VIOLATION" })
  await recordWorkpaperDecision(f.actors.reviewer, review)
  const current = await getReviewWorkpaperBinder(f.actors.reviewer, f.scope)
  expect(current.reviewState).toBe("REVIEWED")
  const artifacts = []
  for (const format of ["json", "csv", "pdf"]) {
    const artifact = await exportReviewWorkpapers(f.actors.reviewer, exportInput(f, current, format))
    artifacts.push(artifact)
    const bytes = Buffer.from(artifact.contentBase64, "base64")
    writeFileSync(`${out}/sample-workpapers.${format}`, bytes)
    if (format !== "pdf") expect(bytes.toString()).not.toContain("private-personal-data")
  }
  expect(new Set(artifacts.map(row => row.exportId)).size).toBe(1)
  const stored = await db.closePackExport.findUniqueOrThrow({ where: { id: artifacts[0].exportId } })
  expect(stored.isCertified).toBe(false)
  const canonical = JSON.parse(Buffer.from(artifacts[0].contentBase64, "base64").toString())
  expect(balanceSheetHash(canonical)).toBe(stored.contentHash)
  expect(await db.accountantReview.count({ where: { organizationId: f.client, status: "APPROVED_FOR_CLOSE" } })).toBe(0)
  writeFileSync(`${out}/reconciliation-checks.json`, JSON.stringify({ canonicalHash: stored.contentHash, formats: artifacts.map(({ contentBase64, ...row }) => row),
    ledgerClosingByKind: current.schedules.map(row => ({ kind: row.kind, currency: row.accounts[0].currency, balances: row.accounts[0].balances })), noCertificationCreated: true }, null, 2))
  // Retain this populated client for the real browser verification.
  writeFileSync(`${out}/browser-fixture.json`, JSON.stringify({ client: f.client, firm: f.firm, periodId: f.period.id,
    actors: Object.fromEntries(Object.entries(f.actors).map(([key, actor]) => [key, actor.actorId])), engagementId: f.engagementId }, null, 2))
})
it("marks old review stale immediately on financial source change and denies an old export retry", async () => {
  const f = await fixture("stale"), p = await prepare(f)
  const current = await getReviewWorkpaperBinder(f.actors.reviewer, f.scope)
  await exportReviewWorkpapers(f.actors.reviewer, exportInput(f, current))
  await db.chartOfAccount.update({ where: { id: f.accounts[0].id }, data: { mappingKey: "synthetic-changed-mapping" } })
  const changed = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  expect(changed.sourceHash).not.toBe(p.binder.sourceHash); expect(changed.reviewState).toBe("STALE")
  expect(changed.schedules[0].accounts[0].balances).toBeNull()
  await expect(exportReviewWorkpapers(f.actors.reviewer, exportInput(f, current))).rejects.toMatchObject({ code: "CONFLICT" })
})
it("discloses missing support and refuses an unqualified positive review", async () => {
  const f = await fixture("missing", true), p = await prepare(f)
  expect(p.binder.schedules[3]).toMatchObject({ availability: "UNAVAILABLE", accounts: [] })
  expect(p.binder.unclassifiedAccounts).toHaveLength(1)
  await expect(recordWorkpaperDecision(f.actors.reviewer, { ...p.input, idempotencyKey: "review", decision: "REVIEWED", preparationId: p.preparation.id })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  await recordWorkpaperDecision(f.actors.reviewer, { ...p.input, idempotencyKey: "changes", decision: "CHANGES_REQUESTED", preparationId: p.preparation.id })
  expect((await getReviewWorkpaperBinder(f.actors.preparer, f.scope)).reviewState).toBe("CHANGES_REQUESTED")
})
it("denies a foreign client period, revoked mandate, suspended engagement and expired step-up", async () => {
  const f = await fixture("authority"), p = await prepare(f)
  await expect(getReviewWorkpaperBinder(f.actors.preparer, { periodId: f.period.id })).rejects.toMatchObject({ code: "NOT_FOUND" })
  await db.session.update({ where: { id: f.actors.reviewer.session.id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } })
  await expect(exportReviewWorkpapers(f.actors.reviewer, exportInput(f, p.binder))).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  await executeFirmEngagementCommand(f.actors.preparer, { command: "TRANSITION", engagementId: f.engagementId, expectedVersion: 1, status: "SUSPENDED", reason: "Synthetic suspension test", idempotencyKey: "suspend-engagement" })
  await expect(getReviewWorkpaperBinder(f.actors.preparer, f.scope)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.accountantAccessGrant.update({ where: { id: f.actors.preparer.actorId + "-grant" }, data: { status: "REVOKED", revokedAt: new Date(), revokedById: f.actors.owner.actorId, activeScopeKey: null } })
  await expect(recordWorkpaperDecision(f.actors.preparer, p.input)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("copies only structure to a later period, with no financial amounts or approval", async () => {
  const f = await fixture("roll"), p = await prepare(f)
  const next = await db.accountingPeriod.create({ data: { organizationId: f.client, fiscalYearId: f.period.fiscalYearId, name: "October completed slice",
    periodNumber: 10, startDate: new Date("2026-10-01"), endDate: new Date("2026-10-02") } })
  await db.closeRun.create({ data: { organizationId: f.client, periodId: next.id, status: "BLOCKED" } })
  const input = { clientOrganizationId: f.client, periodId: next.id, fromPeriodId: f.period.id, idempotencyKey: "roll" }
  const copied = await rollForwardWorkpaperStructure(f.actors.preparer, input)
  expect(await rollForwardWorkpaperStructure(f.actors.preparer, input)).toMatchObject({ id: copied.id, replayed: true })
  const stored = await db.accountantComment.findUniqueOrThrow({ where: { id: copied.id } })
  expect(stored.metadata).toMatchObject({ headings: [...WORKPAPER_KINDS], fromPeriodId: f.period.id })
  expect(JSON.stringify(stored.metadata)).not.toContain(p.binder.sourceHash)
  const nextBinder = await getReviewWorkpaperBinder(f.actors.preparer, { clientOrganizationId: f.client, periodId: next.id })
  expect(nextBinder.decisions).toEqual([]); expect(nextBinder.reviewState).toBe("UNPREPARED")
  expect(nextBinder.schedules.every(row => row.availability === "UNAVAILABLE")).toBe(true)
  await expect(rollForwardWorkpaperStructure(f.actors.preparer, { ...input, fromPeriodId: next.id })).rejects.toMatchObject({ code: "NOT_FOUND" })
})
it("serializes duplicate preparations and exports; rolls back a failed export audit before safe retry", async () => {
  const f = await fixture("retry"), binder = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  const input = { ...f.scope, expectedSourceHash: binder.sourceHash, idempotencyKey: "same", decision: "PREPARED", conclusion: "Concurrent preparation of verified schedules" }
  const results = await Promise.all([1, 2].map(() => recordWorkpaperDecision(f.actors.preparer, input)))
  expect(new Set(results.map(row => row.id)).size).toBe(1)
  const current = await getReviewWorkpaperBinder(f.actors.reviewer, f.scope)
  const exports = await Promise.all([1, 2].map(() => exportReviewWorkpapers(f.actors.reviewer, exportInput(f, current))))
  expect(new Set(exports.map(row => row.exportId)).size).toBe(1)
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af08_fail_export() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'WORKPAPER_EXPORT' AND NEW."organizationId" = '${f.client}' THEN RAISE EXCEPTION 'AF08 synthetic failure'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe('CREATE TRIGGER af08_fail_export BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af08_fail_export()')
  const retry = { ...exportInput(f, current), idempotencyKey: "failure" }
  try { await expect(exportReviewWorkpapers(f.actors.reviewer, retry)).rejects.toThrow() }
  finally { await db.$executeRawUnsafe("DROP TRIGGER af08_fail_export ON audit_logs") }
  expect(await db.closePackExport.count({ where: { organizationId: f.client } })).toBe(1)
  expect(await exportReviewWorkpapers(f.actors.reviewer, retry)).toMatchObject({ replayed: false })
})

it("keeps currencies separate and immediately invalidates a revoked evidence decision", async () => {
  const f = await fixture("currencies")
  const euro = await db.chartOfAccount.create({ data: { organizationId: f.client, code: "572", nameEn: "Synthetic EUR cash",
    currency: "EUR", type: "ASSET", normalBalance: "DEBIT" } })
  const row = await proposeBalanceSheetEvidence({ ledgerAccountId: euro.id, periodId: f.period.id, currency: "EUR", idempotencyKey: "euro",
    scheduleKind: "CASH", basis: "ZERO_ACTIVITY", explanation: "Explicit independent zero activity evidence", sourceReference: "synthetic:euro",
    sourceDocumentHash: "sha256:" + "c".repeat(64), items: [] }, f.sourceControl("owner"))
  await decideBalanceSheetEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: "APPROVE" }, f.sourceControl("reviewer"))
  const before = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  expect(before.schedules[0].accounts.map(a => a.currency).sort()).toEqual(["EUR", "XAF"])
  expect(before.schedules[0].accounts.find(a => a.currency === "EUR")?.balances?.ledger.closingBalance).toBe("0.00")
  await decideBalanceSheetEvidence({ evidenceId: row.id, expectedEvidenceHash: row.evidenceHash, decision: "REVOKE", reason: "Synthetic source approval withdrawal" }, f.sourceControl("reviewer"))
  const after = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  expect(after.sourceHash).not.toBe(before.sourceHash)
  expect(after.schedules[0].accounts.find(a => a.currency === "EUR")?.balances).toBeNull()
})

it("invalidates superseded review decisions and old export previews when a new preparation is recorded", async () => {
  const f = await fixture("superseded"), p = await prepare(f)
  await recordWorkpaperDecision(f.actors.reviewer, { ...p.input, decision: "REVIEWED", idempotencyKey: "review", preparationId: p.preparation.id })
  const reviewed = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  await recordWorkpaperDecision(f.actors.preparer, { ...p.input, idempotencyKey: "new-preparation", conclusion: "New preparation supersedes the earlier conclusion" })
  const current = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  expect(current.reviewState).toBe("PREPARED")
  expect(current.decisions.filter(row => row.current)).toHaveLength(1)
  expect(current.decisions.find(row => row.decision === "REVIEWED")?.current).toBe(false)
  await expect(exportReviewWorkpapers(f.actors.reviewer, exportInput(f, reviewed))).rejects.toMatchObject({ code: "CONFLICT" })
})

it("rolls back an export when the persisted session expires during an audit wait", async () => {
  const f = await fixture("expiry-wait"), binder = await getReviewWorkpaperBinder(f.actors.reviewer, f.scope)
  // Sequence advancement is nontransactional, proving the delayed audit was
  // reached even though both the publication and audit rows must roll back.
  await db.$executeRawUnsafe("CREATE SEQUENCE IF NOT EXISTS af08_expiry_marker START 1")
  await db.$executeRawUnsafe("ALTER SEQUENCE af08_expiry_marker RESTART WITH 1")
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af08_delay_export() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'WORKPAPER_EXPORT' AND NEW."organizationId" = '${f.client}' THEN PERFORM nextval('af08_expiry_marker'); PERFORM pg_sleep(9); END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe("CREATE TRIGGER af08_delay_export BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af08_delay_export()")
  await db.session.update({ where: { id: f.actors.reviewer.session.id }, data: { expiresAt: new Date(Date.now() + 8000) } })
  try {
    await expect(exportReviewWorkpapers(f.actors.reviewer, exportInput(f, binder))).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
    expect((await db.$queryRawUnsafe<Array<{ is_called: boolean }>>("SELECT is_called FROM af08_expiry_marker"))[0].is_called).toBe(true)
    expect(await db.closePackExport.count({ where: { organizationId: f.client } })).toBe(0)
    expect(await db.auditLog.count({ where: { organizationId: f.client, action: "WORKPAPER_EXPORT" } })).toBe(0)
  } finally { await db.$executeRawUnsafe("DROP TRIGGER af08_delay_export ON audit_logs") }
})

it("rejects the 101st decision while retaining read, exact replay and export access at the history limit", async () => {
  const f = await fixture("history-limit"), p = await prepare(f)
  const original = await db.accountantReview.findUniqueOrThrow({ where: { id: p.preparation.id } })
  await db.accountantReview.createMany({ data: Array.from({ length: 99 }, (_, index) => ({
    organizationId: f.client, periodId: f.period.id, closeRunId: original.closeRunId,
    status: "OPEN" as const, reviewerId: f.actors.preparer.actorId, openedById: f.actors.preparer.actorId,
    reviewedAt: original.reviewedAt, decisionNotes: original.decisionNotes,
    metadata: { kind: "review-workpaper-v1", decision: "PREPARED", sourceHash: p.binder.sourceHash,
      idempotencyKey: `synthetic-history-${index}` },
  })) })
  const current = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  expect(current.decisions).toHaveLength(100)
  expect(await recordWorkpaperDecision(f.actors.preparer, p.input)).toMatchObject({ id: p.preparation.id, replayed: true })
  await expect(recordWorkpaperDecision(f.actors.preparer, { ...p.input, idempotencyKey: "over-limit" })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(await db.accountantReview.count({ where: { organizationId: f.client } })).toBe(100)
  expect((await getReviewWorkpaperBinder(f.actors.preparer, f.scope)).decisions).toHaveLength(100)
  expect(await exportReviewWorkpapers(f.actors.reviewer, exportInput(f, current))).toMatchObject({ replayed: false })
})
