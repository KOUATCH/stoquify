/** @jest-environment node */
// Actual frozen-candidate services + real PostgreSQL. Identity/setup fixtures
// are synthetic; no READY/T4/CERTIFIED/SIGNED evidence or financial rows are seeded.
import fs from "node:fs"
import crypto from "node:crypto"
import { db } from "@/prisma/db"
import { runCloseAssurance, assignCloseFinding, commentOnCloseFinding, requestCloseWaiver, approveCloseWaiver, updateAccountantReview } from "@/services/accounting/close-assurance.service"
import { exportClosePack } from "@/services/accounting/close-assurance-pack.service"

const url = new URL(process.env.CLOSE_WRITE_POSTGRES_URL || "")
if (url.hostname !== "localhost" || url.pathname !== "/" + process.env.CLOSE_WRITE_DATABASE_NAME || !/^\/stoquify_replay_close_authority_20261109_[a-f0-9]{10}$/.test(url.pathname) || url.searchParams.get("schema") !== "public") throw Error("Exact owned new close-release database required")
const permissions = ["accounting.close.read", "accounting.close.run", "accounting.close.finding.assign", "accounting.close.finding.comment", "accounting.close.waiver.request", "accounting.close.waiver.approve", "accounting.close.accountant.review", "accounting.close.export", "accounting.close.certify"]
const evidence: Array<Record<string, unknown>> = []
const token = () => "cr_session_" + crypto.randomBytes(32).toString("hex")
const hash = (text: string) => "sha256:" + crypto.createHash("sha256").update(text).digest("hex")
function canonical(value: any): string { return value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? "[" + value.map(canonical).join(",") + "]" : "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}" }
async function fixture() {
  const id = "cr-" + crypto.randomBytes(5).toString("hex"), org = id + "-org"
  await db.organization.create({ data: { id: org, name: "Synthetic hardened close service qualification", slug: id, currency: "XAF", countryCode: "CM", requestedModules: ["accounting", "close_assurance"] } })
  await db.tenantModuleConfiguration.create({ data: { organizationId: org, manifestHash: hash(id), selectedModules: ["accounting", "close_assurance"], activeModules: ["accounting", "close_assurance"] } })
  await db.tenantModuleGrant.createMany({ data: ["accounting", "close_assurance"].map(moduleSlug => ({ id: id + "-" + moduleSlug, organizationId: org, moduleSlug, status: "active", source: "manual_override" })) })
  const role = await db.role.create({ data: { organizationId: org, code: id, nameEn: "Synthetic close operator", permissions } })
  const actors = []
  for (const suffix of ["maker", "checker"]) {
    const user = await db.user.create({ data: { id: id + "-" + suffix, organizationId: org, email: `${id}-${suffix}@example.invalid`, emailVerified: true, isVerified: true, roles: { connect: { id: role.id } } } })
    const session = await db.session.create({ data: { userId: user.id, token: token(), expiresAt: new Date(Date.now() + 3600000), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: org, assuranceLevel: 1 } })
    actors.push({ user, session })
  }
  const year = await db.fiscalYear.create({ data: { organizationId: org, name: "Synthetic FY2026", startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-12-31T23:59:59.999Z") } })
  const period = await db.accountingPeriod.create({ data: { organizationId: org, fiscalYearId: year.id, name: "Synthetic October2026", periodNumber: 10, startDate: new Date("2026-10-01T00:00:00Z"), endDate: new Date("2026-10-31T23:59:59.999Z") } })
  await db.organizationAccountingSettings.create({ data: { organizationId: org, accountingEnabled: true, setupStatus: "IN_PROGRESS", baseCurrency: "XAF" } })
  return { id, org, role, period, maker: actors[0], checker: actors[1] }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
const control = (f: Fixture, checker = false) => {
  const actor = checker ? f.checker : f.maker
  return { actorId: actor.user.id, actorPermissions: permissions, session: { id: actor.session.id, token: actor.session.token }, lastAuthAt: actor.session.assuranceVerifiedAt!, freshAuth: { actorId: actor.user.id, organizationId: f.org, lastAuthAt: actor.session.assuranceVerifiedAt! } }
}
async function state(org: string) {
  const scope = { organizationId: org }
  return { runs: await db.closeRun.count({ where: scope }), findings: await db.closeAssuranceFinding.count({ where: scope }), comments: await db.accountantComment.count({ where: scope }), reviews: await db.accountantReview.count({ where: scope }), exports: await db.closePackExport.count({ where: scope }), certifiedExports: await db.closePackExport.count({ where: { ...scope, isCertified: true } }), audit: await db.ledgerAuditEvent.count({ where: scope }), events: await db.businessEvent.count({ where: scope }), outbox: await db.businessEventOutbox.count({ where: scope }), journals: await db.journalEntry.count({ where: scope }), sales: await db.salesOrder.count({ where: scope }), settlements: await db.customerSettlement.count({ where: scope }) }
}
let qualified: { f: Fixture; runId: string; findingId: string } | undefined
afterAll(async () => { try { fs.writeFileSync(process.env.CLOSE_SERVICE_EVIDENCE!, JSON.stringify({ checks: evidence, limitation: "Real current-candidate service persistence and denied certification on deliberately incomplete synthetic setup; not an earned READY/T4 certificate, statutory setup, provider or authenticated browser proof." }, null, 2) + "\n") } finally { await db.$disconnect() } })

it("persists actual assessment, assignment, comment, independent waiver/review and blocked draft export", async () => {
  const f = await fixture(), maker = control(f), checker = control(f, true)
  const dashboard = await runCloseAssurance(f.org, { periodId: f.period.id }, maker)
  expect(dashboard.run.status).toBe("BLOCKED"); expect(dashboard.run.id).toBeTruthy()
  const runId = dashboard.run.id!, finding = await db.closeAssuranceFinding.findFirstOrThrow({ where: { organizationId: f.org, closeRunId: runId, status: { in: ["OPEN", "REOPENED"] } }, orderBy: { id: "asc" } })
  const assigned = await assignCloseFinding(f.org, { findingId: finding.id, assignedToId: f.maker.user.id }, maker); expect(assigned.ownerId).toBe(f.maker.user.id)
  const comment = await commentOnCloseFinding(f.org, { findingId: finding.id, body: "Synthetic review of actual retained assessment blockers" }, maker)
  const requested = await requestCloseWaiver(f.org, { findingId: finding.id, reason: "Synthetic waiver workflow proof only; unresolved setup still blocks close certification" }, maker)
  await expect(approveCloseWaiver(f.org, { findingId: finding.id }, maker)).rejects.toThrow(/requester/i)
  const approved = await approveCloseWaiver(f.org, { findingId: finding.id }, checker); expect(approved.status).toBe("WAIVED_WITH_APPROVAL")
  const review = await updateAccountantReview(f.org, { closeRunId: runId, status: "CHANGES_REQUESTED", decisionNotes: "Actual source setup is incomplete; this is not close approval" }, checker)
  const draft = await exportClosePack(f.org, { closeRunId: runId, mode: "DRAFT_NOT_CERTIFIED" }, maker); expect(draft.isCertified).toBe(false)
  const payload = JSON.parse(draft.content), claimed = payload.export.contentHash; delete payload.export.contentHash
  expect(hash(canonical(payload))).toBe(claimed); expect(claimed).toBe(draft.contentHash)
  expect(draft.content).not.toContain(f.maker.session.token); expect(draft.content).not.toContain(f.checker.session.token)
  fs.writeFileSync(process.env.CLOSE_DRAFT_CAPTURE!, draft.content, { flag: "wx", mode: 0o600 })
  await expect(exportClosePack(f.org, { closeRunId: runId, mode: "CERTIFIED" }, checker)).rejects.toThrow()
  expect(await db.closePackExport.count({ where: { organizationId: f.org, isCertified: true } })).toBe(0)
  expect((await db.accountingPeriod.findUniqueOrThrow({ where: { id: f.period.id } })).status).toBe("OPEN")
  expect((await db.closeRun.findUniqueOrThrow({ where: { id: runId } })).status).toBe("BLOCKED")
  const final = await state(f.org); expect(final.journals + final.sales + final.settlements).toBe(0)
  qualified = { f, runId, findingId: finding.id }
  const publicFixture = { synthetic: true, organizationId: f.org, periodId: f.period.id, closeRunId: runId, findingId: finding.id, makerId: f.maker.user.id, checkerId: f.checker.user.id, commentId: comment.id, reviewId: review.id, draftExportId: draft.exportId, draftContentHash: draft.contentHash, actualAssessmentStatus: dashboard.run.status, setupStatus: "IN_PROGRESS", limitation: "No credentials/session tokens. Service fixture is not an authenticated HTTP session or earned close certificate." }
  fs.writeFileSync(process.env.CLOSE_FIXTURE_PUBLIC!, JSON.stringify(publicFixture, null, 2) + "\n", { flag: "wx" })
  evidence.push({ name: "actual-service-workflow", ...publicFixture, requestedStatus: requested.status, approvedStatus: approved.status, final })
}, 120000)

it("rolls back actual comment persistence when its tenant-scoped audit write fails", async () => {
  expect(qualified).toBeDefined(); const { f, runId } = qualified!, name = "qual_close_audit_" + crypto.randomBytes(5).toString("hex")
  expect(f.org).toMatch(/^cr-[a-f0-9]{10}-org$/); const before = await state(f.org)
  await db.$executeRawUnsafe(`CREATE FUNCTION public."${name}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${f.org}' AND NEW.action = 'CLOSE_ACCOUNTANT_COMMENT_ADDED' THEN RAISE EXCEPTION 'Owned synthetic close audit failure'; END IF; RETURN NEW; END $$`)
  try {
    await db.$executeRawUnsafe(`CREATE TRIGGER "${name}" BEFORE INSERT ON ledger_audit_events FOR EACH ROW EXECUTE FUNCTION public."${name}"()`)
    await expect(commentOnCloseFinding(f.org, { closeRunId: runId, body: "This real comment must roll back with its audit failure" }, control(f))).rejects.toThrow(/Owned synthetic close audit failure/)
    expect(await state(f.org)).toEqual(before); evidence.push({ name: "actual-service-audit-rollback", allScopedBusinessCountsUnchanged: true, snapshot: before })
  } finally { await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${name}" ON ledger_audit_events`); await db.$executeRawUnsafe(`DROP FUNCTION public."${name}"()`) }
})

it.each(["module", "role", "session"] as const)("denies all eight actual service writers after committed %s revocation", async kind => {
  const f = await fixture(), actor = control(f), id = "not-yet-created", before = await state(f.org)
  if (kind === "module") await db.tenantModuleGrant.update({ where: { id: f.id + "-close_assurance" }, data: { status: "suspended" } })
  if (kind === "role") await db.role.update({ where: { id: f.role.id }, data: { permissions: [] } })
  if (kind === "session") await db.session.delete({ where: { id: f.maker.session.id } })
  const calls = [
    ["assessment", () => runCloseAssurance(f.org, { periodId: f.period.id }, actor)],
    ["assign", () => assignCloseFinding(f.org, { findingId: id }, actor)],
    ["comment", () => commentOnCloseFinding(f.org, { closeRunId: id, body: "Must not create a comment after authority revocation" }, actor)],
    ["waiver-request", () => requestCloseWaiver(f.org, { findingId: id, reason: "Must not create a waiver after authority revocation" }, actor)],
    ["waiver-approve", () => approveCloseWaiver(f.org, { findingId: id }, actor)],
    ["review", () => updateAccountantReview(f.org, { closeRunId: id, status: "CHANGES_REQUESTED" }, actor)],
    ["draft-export", () => exportClosePack(f.org, { closeRunId: id, mode: "DRAFT_NOT_CERTIFIED" }, actor)],
    ["certified-export", () => exportClosePack(f.org, { closeRunId: id, mode: "CERTIFIED" }, actor)],
  ] as const
  for (const [operation, call] of calls) {
    const sensitive = operation === "waiver-approve" || operation === "certified-export", code = kind !== "session" ? "FORBIDDEN" : sensitive ? "FRESH_AUTH_REQUIRED" : "AUTH_REQUIRED"
    await expect(call()).rejects.toMatchObject({ code }); expect(await state(f.org)).toEqual(before)
    evidence.push({ name: "actual-service-committed-revocation", kind, operation, code, allScopedBusinessCountsUnchanged: true })
  }
})
