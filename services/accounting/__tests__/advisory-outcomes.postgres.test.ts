jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const target = process.env.AF12_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF12_CLUSTER_DIR) throw Error("Explicit synthetic AF12 target required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || url.port !== "55449" || url.pathname !== "/stoquify_local_af12_20261025_r1") throw Error("Wrong AF12 target")
  return { db: new PrismaClient({ datasources: { db: { url: target } }, transactionOptions: { maxWait: 10000, timeout: 30000 } }) }
})
import { realpathSync, writeFileSync } from "node:fs"
import { db } from "@/prisma/db"
import { advisoryFixture } from "./advisory-outcomes.fixture"
import { executeAdvisoryCommand, getAdvisoryDesk, getAdvisoryPrivateNotes, listAdvisoryEngagements, exportAdvisoryPack, getAdvisoryOutcomes } from "../advisory-outcomes.service"
import { getReviewWorkpaperBinder, recordWorkpaperDecision } from "../review-workpaper.service"
import { advisoryCommandSchema, durationMetric } from "../advisory-outcomes.contract"
import { balanceSheetHash } from "../balance-sheet-contract"
import { executeFirmEngagementCommand } from "../firm-engagement.service"
import { requestMissingCloseEvidence, respondToMissingCloseEvidence, acceptMissingCloseEvidenceResponse } from "../close-assurance.service"
import { getAccountantWorkDetail } from "../accountant-work-desk.service"
import { getPaymentCloseEvidence } from "@/services/reconciliation/payment-close-evidence.service"
import { createCloseControlScope } from "../close-control-scope"
import { buildCloseEvidenceCollectionReceipt } from "../close-evidence-collection"
const out = "docs/accounting-firms/roadmap-2026-10-19/execution/AF12/2026-10-25-run-01"
beforeAll(async () => {
  const actual = await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory")
  expect(realpathSync(actual[0].data_directory).toLowerCase()).toBe(realpathSync(process.env.AF12_CLUSTER_DIR!).toLowerCase())
})
afterAll(async () => db.$disconnect())
type Fixture = Awaited<ReturnType<typeof advisoryFixture>>
const scope = (f: Fixture) => ({ ...f.scope, engagementId: f.engagementId })
async function reviewed(name: string) {
  const f = await advisoryFixture(name), binder = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  const base = { ...f.scope, expectedSourceHash: binder.sourceHash, conclusion: "Synthetic independently reviewed support", idempotencyKey: "workpaper-prepare", decision: "PREPARED" }
  const preparation = await recordWorkpaperDecision(f.actors.preparer, base)
  await recordWorkpaperDecision(f.actors.reviewer, { ...base, idempotencyKey: "workpaper-review", decision: "REVIEWED", preparationId: preparation.id })
  return f
}
async function command(f: Fixture, action: string, who = "preparer", extras: Record<string, unknown> = {}) {
  const desk = await getAdvisoryDesk(f.actors[who], scope(f))
  return { ...scope(f), command: action, expectedVersion: desk.latestVersion, expectedSourceHash: desk.sourceHash, expectedReviewHash: desk.reviewHash,
    idempotencyKey: `advisory-${action}-${desk.latestVersion}`, reason: "Synthetic decision with reviewed evidence", ...extras }
}
async function draft(f: Fixture) {
  const input = await command(f, "DRAFT", "preparer", { privateNote: "PRIVATE_FIRM_NOTE_NOT_FOR_CLIENT", narrative: {
    conclusions: [{ kind: "CASH", text: "Cash matches the independently approved support." }, { kind: "RECEIVABLES", text: "Receivable balances match reviewed supporting evidence." }],
    actions: [{ kind: "CASH", title: "Confirm next month cash evidence coverage", ownerId: f.actors.owner.actorId, dueAt: "2026-11-15T23:59:59.999Z" }],
  } })
  const result = await executeAdvisoryCommand(f.actors.preparer, input)
  return { input, result }
}
async function deliver(f: Fixture) {
  await draft(f)
  await executeAdvisoryCommand(f.actors.reviewer, await command(f, "REVIEW", "reviewer"))
  await executeAdvisoryCommand(f.actors.owner, await command(f, "AGREE", "owner"))
  return executeAdvisoryCommand(f.actors.reviewer, await command(f, "DELIVER", "reviewer"))
}
it("publishes only after independent narrative review and real client agreement; exports all formats from exact AF08 sources", async () => {
  const f = await reviewed("journey"), d = await draft(f)
  const list = await listAdvisoryEngagements(f.actors.preparer, f.scope)
  expect(list.engagements.map(row => row.id)).toEqual([f.engagementId])
  expect(await executeAdvisoryCommand(f.actors.preparer, d.input)).toMatchObject({ id: d.result.id, replayed: true })
  await expect(executeAdvisoryCommand(f.actors.preparer, { ...d.input, reason: "Changed original reason" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect((await getAdvisoryDesk(f.actors.owner, scope(f))).revisions).toEqual([])
  await expect(executeAdvisoryCommand(f.actors.preparer, await command(f, "REVIEW"))).rejects.toMatchObject({ code: "SOD_VIOLATION" })
  await expect(executeAdvisoryCommand(f.actors.reviewer, await command(f, "DELIVER", "reviewer"))).rejects.toMatchObject({ code: "CONFLICT" })
  await executeAdvisoryCommand(f.actors.reviewer, await command(f, "REVIEW", "reviewer"))
  await expect(executeAdvisoryCommand(f.actors.reviewer, await command(f, "AGREE", "reviewer"))).rejects.toMatchObject({ code: "FORBIDDEN" })
  const client = await getAdvisoryDesk(f.actors.owner, scope(f))
  expect(JSON.stringify(client)).not.toContain("PRIVATE_FIRM_NOTE")
  await expect(getAdvisoryPrivateNotes(f.actors.owner, scope(f))).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(await getAdvisoryPrivateNotes(f.actors.preparer, scope(f))).toMatchObject({ privateNote: "PRIVATE_FIRM_NOTE_NOT_FOR_CLIENT" })
  await executeAdvisoryCommand(f.actors.owner, await command(f, "AGREE", "owner"))
  const delivery = await executeAdvisoryCommand(f.actors.reviewer, await command(f, "DELIVER", "reviewer"))
  const desk = await getAdvisoryDesk(f.actors.owner, scope(f)), binder = await getReviewWorkpaperBinder(f.actors.reviewer, f.scope)
  expect(desk.revisions[0].document.observations).toEqual(binder.schedules.filter(row => ["CASH", "RECEIVABLES"].includes(row.kind)))
  expect(desk.revisions[0].document.narrative.actions[0].ownerId).toBe(f.actors.owner.actorId)
  const artifacts = []
  for (const format of ["json", "csv", "pdf"]) {
    const artifact = await exportAdvisoryPack(f.actors.reviewer, { ...scope(f), revisionId: delivery.id, format })
    const bytes = Buffer.from(artifact.contentBase64, "base64")
    writeFileSync(`${out}/sample-advisory-pack.${format}`, bytes)
    if (format !== "pdf") expect(bytes.toString()).not.toContain("PRIVATE_FIRM_NOTE")
    if (format === "json") expect(balanceSheetHash(JSON.parse(bytes.toString()))).toBe(artifact.contentHash)
    const { contentBase64, ...metadata } = artifact; artifacts.push(metadata)
  }
  expect(new Set(artifacts.map(row => row.contentHash)).size).toBe(1)
  expect(new Set(artifacts.map(row => row.exportId)).size).toBe(1)
  expect(await db.accountantReview.count({ where: { organizationId: f.client, status: "APPROVED_FOR_CLOSE" } })).toBe(0)
  writeFileSync(`${out}/reconciliation-checks.json`, JSON.stringify({ exactReviewedObservations: true, sourceHash: binder.sourceHash, reviewHash: binder.reviewHash, artifacts, noCertificationCreated: true }, null, 2))
  writeFileSync(`${out}/browser-fixture.json`, JSON.stringify({ client: f.client, firm: f.firm, periodId: f.period.id, engagementId: f.engagementId, actors: Object.fromEntries(Object.entries(f.actors).map(([key, actor]) => [key, actor.actorId])) }, null, 2))
})
it("retains attributable historical deliveries and marks changed source exports for review", async () => {
  const f = await reviewed("stale"), delivery = await deliver(f)
  const before = await db.firmAdvisoryRevision.findUniqueOrThrow({ where: { id: delivery.id } })
  await db.chartOfAccount.update({ where: { id: f.accounts[0].id }, data: { mappingKey: "synthetic-source-change" } })
  const desk = await getAdvisoryDesk(f.actors.owner, scope(f))
  expect(desk.revisions[0].freshness).toBe("REVIEW_REQUIRED")
  expect(desk.revisions[0].document.observations[0].accounts[0].balances!.ledger.closingBalance).toBe("100.20")
  const exported = await exportAdvisoryPack(f.actors.reviewer, { ...scope(f), revisionId: delivery.id, format: "json" })
  expect(JSON.parse(Buffer.from(exported.contentBase64, "base64").toString()).freshness).toBe("REVIEW_REQUIRED")
  expect(exported.deliveryHash).toBe(before.contentHash)
  expect((await db.firmAdvisoryRevision.findUniqueOrThrow({ where: { id: delivery.id } })).document).toEqual(before.document)
  await expect(draft(f)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
})
it("invalidates agreement on a changed workpaper decision and on every new draft", async () => {
  const f = await reviewed("reviews"); await deliver(f); await draft(f)
  await expect(executeAdvisoryCommand(f.actors.reviewer, await command(f, "DELIVER", "reviewer"))).rejects.toMatchObject({ code: "CONFLICT" })
  const binder = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  await recordWorkpaperDecision(f.actors.preparer, { ...f.scope, decision: "PREPARED", conclusion: "New workpaper preparation invalidates prior review", expectedSourceHash: binder.sourceHash, idempotencyKey: "new-workpaper-preparation" })
  expect((await getAdvisoryDesk(f.actors.owner, scope(f))).revisions.every(row => row.freshness === "REVIEW_REQUIRED")).toBe(true)
})
it("keeps historical deliveries readable with review-required exports while current workpaper proof is unavailable", async () => {
  const f = await reviewed("unavailable"), delivery = await deliver(f)
  await db.closeRun.create({ data: { organizationId: f.client, periodId: f.period.id, status: "RUNNING", startedAt: new Date() } })
  const desk = await getAdvisoryDesk(f.actors.owner, scope(f))
  expect(desk.workpaperState).toBe("UNAVAILABLE")
  expect(desk.revisions[0]).toMatchObject({ id: delivery.id, freshness: "REVIEW_REQUIRED", state: "DELIVERED" })
  expect(await exportAdvisoryPack(f.actors.reviewer, { ...scope(f), revisionId: delivery.id, format: "json" })).toMatchObject({ freshness: "REVIEW_REQUIRED" })
  await expect(draft(f)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
})
it("denies missing support, foreign periods, forged financial fields and invalid owners", async () => {
  const missing = await advisoryFixture("missing", true)
  await expect(draft(missing)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  const f = await reviewed("validation")
  const unavailableOwner = await db.user.create({ data: { organizationId: f.client, email: `${f.client}-no-close-role@example.invalid`, name: "No Close role", emailVerified: true } })
  expect((await getAdvisoryDesk(f.actors.preparer, scope(f))).owners.map(row => row.id)).not.toContain(unavailableOwner.id)
  await expect(getAdvisoryDesk(f.actors.preparer, { ...scope(f), periodId: missing.period.id })).rejects.toMatchObject({ code: "NOT_FOUND" })
  const input = await command(f, "DRAFT", "preparer", { narrative: { conclusions: [{ kind: "CASH", text: "Supported conclusion for the client" }], actions: [{ kind: "CASH", title: "Confirm cash coverage with the client", ownerId: missing.actors.owner.actorId, dueAt: "2026-11-15T00:00:00Z" }] } })
  expect(advisoryCommandSchema.safeParse({ ...input, closingBalance: "99999" }).success).toBe(false)
  await expect(executeAdvisoryCommand(f.actors.preparer, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(executeAdvisoryCommand(f.actors.preparer, { ...input, narrative: { ...input.narrative as object, actions: [{ kind: "CASH", title: "Confirm cash coverage with the client", ownerId: unavailableOwner.id, dueAt: "2026-11-15T00:00:00Z" }] } })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(await db.firmAdvisoryRevision.count({ where: { engagementId: f.engagementId } })).toBe(0)
})
it("serializes concurrent exact retries and competing drafts, with atomic audit rollback and immutable retention", async () => {
  const f = await reviewed("concurrency"), d = await draft(f)
  expect(new Set((await Promise.all([1, 2].map(() => executeAdvisoryCommand(f.actors.preparer, d.input)))).map(row => row.id)).size).toBe(1)
  const next = { ...d.input, expectedVersion: 1, idempotencyKey: "new-concurrent-draft" }
  const competing = await Promise.allSettled([executeAdvisoryCommand(f.actors.preparer, next), executeAdvisoryCommand(f.actors.preparer, { ...next, idempotencyKey: "other-concurrent-draft" })])
  expect(competing.filter(row => row.status === "fulfilled")).toHaveLength(1)
  await expect(db.firmAdvisoryRevision.update({ where: { id: d.result.id }, data: { privateNote: "changed" } })).rejects.toThrow()
  await expect(db.firmAdvisoryRevision.delete({ where: { id: d.result.id } })).rejects.toThrow()
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION af12_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'ADVISORY_DRAFT' AND NEW."organizationId" = '${f.client}' THEN RAISE EXCEPTION 'AF12 synthetic audit failure'; END IF; RETURN NEW; END $$`)
  await db.$executeRawUnsafe('CREATE TRIGGER af12_fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION af12_fail_audit()')
  const count = await db.firmAdvisoryRevision.count({ where: { engagementId: f.engagementId } }), retry = { ...next, expectedVersion: count, idempotencyKey: "rollback-safe-retry" }
  try { await expect(executeAdvisoryCommand(f.actors.preparer, retry)).rejects.toThrow() }
  finally { await db.$executeRawUnsafe("DROP TRIGGER af12_fail_audit ON audit_logs") }
  expect(await db.firmAdvisoryRevision.count({ where: { engagementId: f.engagementId } })).toBe(count)
  expect(await executeAdvisoryCommand(f.actors.preparer, retry)).toMatchObject({ replayed: false })
})
it("checks live permissions, exact sessions, fresh authentication and managed engagement status", async () => {
  const f = await reviewed("authority"); await draft(f)
  for (const operation of ["DRAFT", "REVIEW", "DELIVER"])
    await expect(executeAdvisoryCommand(f.actors.owner, await command(f, operation, "owner"))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.session.update({ where: { id: f.actors.reviewer.session.id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } })
  await expect(executeAdvisoryCommand(f.actors.reviewer, await command(f, "REVIEW", "reviewer"))).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  await expect(getAdvisoryDesk({ ...f.actors.preparer, session: f.actors.owner.session }, scope(f))).rejects.toMatchObject({ code: "AUTH_REQUIRED" })
  const role = await db.role.findFirstOrThrow({ where: { organizationId: f.firm, code: "preparer" } })
  await db.role.update({ where: { id: role.id }, data: { permissions: ["accounting.close.read", "accounting.close.accountant.invite"] } })
  await expect(getAdvisoryPrivateNotes(f.actors.preparer, scope(f))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.role.update({ where: { id: role.id }, data: { permissions: role.permissions } })
  await executeFirmEngagementCommand(f.actors.preparer, { command: "TRANSITION", engagementId: f.engagementId, expectedVersion: 1, status: "SUSPENDED", reason: "Synthetic suspension for denial test", idempotencyKey: "suspend-advisory" })
  await expect(getAdvisoryDesk(f.actors.preparer, scope(f))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(getAdvisoryDesk(f.actors.owner, scope(f))).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("reports explicit cohort/window/coverage with missing baselines and no fabricated work time or financial sums", async () => {
  const f = await reviewed("metrics"), now = new Date()
  const input = { cohort: [scope(f)], from: new Date(now.getTime() - 86400000).toISOString(), to: now.toISOString() }
  const metrics = await getAdvisoryOutcomes(f.actors.preparer, input)
  expect(metrics).toMatchObject({ cohortCount: 1, coverage: "COMPLETE_FOR_EXPLICIT_AUTHORIZED_COHORT", activeWorkTimeMs: null, improvement: null, baseline: "NOT_ESTABLISHED" })
  expect(metrics.cohorts[0]).toMatchObject({ requestTouches: { value: 0 }, clientWaiting: { measured: 0, elapsedMs: null }, closeDuration: { eligible: 1, missing: 1, elapsedMs: null }, reviewerRework: { changesRequested: 0, reviewedDecisions: 1, rate: 0 } })
  expect(metrics.cohorts[0].activation.measured).toBe(1)
  expect(JSON.stringify(metrics)).not.toContain("100.20")
  await expect(getAdvisoryOutcomes(f.actors.owner, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(getAdvisoryOutcomes(f.actors.preparer, { ...input, cohort: [scope(f), scope(f)] })).rejects.toThrow()
  const role = await db.role.findFirstOrThrow({ where: { organizationId: f.firm, code: "preparer" } })
  await db.role.update({ where: { id: role.id }, data: { permissions: role.permissions.filter(p => p !== "accounting.close.accountant.invite") } })
  await expect(getAdvisoryOutcomes(f.actors.preparer, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
  writeFileSync(`${out}/sample-outcomes.json`, JSON.stringify(metrics, null, 2))
})
it("does not convert missing, invalid or inverted duration pairs into zero", () => {
  expect(durationMetric([])).toEqual({ eligible: 0, measured: 0, missing: 0, elapsedMs: null })
  expect(durationMetric([[null, null], ["invalid", "2026-10-01"], ["2026-10-02", "2026-10-01"]])).toEqual({ eligible: 3, measured: 0, missing: 3, elapsedMs: null })
  expect(durationMetric([["2026-10-01T00:00:00Z", "2026-10-01T01:00:00Z"], ["2026-10-01T00:00:00Z", null]])).toEqual({ eligible: 2, measured: 1, missing: 1, elapsedMs: 3600000 })
})

it("measures real request-response-acceptance timestamps and excludes later events from an earlier window", async () => {
  const f = await reviewed("request-metrics"), start = new Date(Date.now() - 86400000).toISOString()
  const old = await db.closeRun.findFirstOrThrow({ where: { organizationId: f.client, periodId: f.period.id }, orderBy: { createdAt: "desc" } })
  const checklist = await db.closeChecklistItem.create({ data: { organizationId: f.client, periodId: f.period.id, closeRunId: old.id,
    key: "payment-reconciliation", domain: "PAYMENT_RECONCILIATION", sourceService: "services/reconciliation/payment-close-evidence.service.ts",
    status: "UNAVAILABLE", severity: "HIGH", label: "Synthetic settlement evidence", detail: "Missing synthetic support", evidenceCount: 0, blockerReason: "Missing source" } })
  const finding = await db.closeAssuranceFinding.create({ data: { organizationId: f.client, periodId: f.period.id, closeRunId: old.id, checklistItemId: checklist.id,
    domain: checklist.domain, severity: "HIGH", title: "Synthetic outcome request", detail: "Missing synthetic evidence", sourceService: checklist.sourceService } })
  const control = (who: string) => ({ actorId: f.actors[who].actorId, actorPermissions: f.actors[who].actorPermissions, session: f.actors[who].session })
  const request = await requestMissingCloseEvidence(f.firm, { clientOrganizationId: f.client, findingId: finding.id, requestedFromId: f.actors.owner.actorId,
    requestText: "Please confirm the settlement collection evidence", dueAt: new Date(Date.now() + 86400000), correlationId: finding.id + "-request" }, control("preparer"))
  const cutoff = new Date().toISOString()
  const response = await respondToMissingCloseEvidence(f.client, { requestId: request.id, responseText: "Current source collection remains unsigned and needs review", correlationId: finding.id + "-response" }, control("owner"))
  const at = new Date(), collection = await getPaymentCloseEvidence(createCloseControlScope(f.client, f.period, at))
  const run = await db.closeRun.create({ data: { organizationId: f.client, periodId: f.period.id, status: "BLOCKED", createdAt: at, completedAt: at } })
  const replacement = await db.closeChecklistItem.create({ data: { organizationId: f.client, periodId: f.period.id, closeRunId: run.id,
    key: checklist.key, domain: checklist.domain, sourceService: checklist.sourceService, status: "FAILED", severity: "HIGH", label: checklist.label,
    detail: JSON.stringify(collection.summary), evidenceCount: 0, blockerReason: "Still unsigned", createdAt: at } })
  await db.closeChecklistItem.update({ where: { id: replacement.id }, data: { metadata: { collectionReceipt: buildCloseEvidenceCollectionReceipt(replacement, [], true) } } })
  const detail = await getAccountantWorkDetail(f.actors.reviewer, f.client, request.id)
  if (detail.replacement.status !== "AVAILABLE") throw Error("Synthetic replacement unavailable")
  await acceptMissingCloseEvidenceResponse(f.firm, { clientOrganizationId: f.client, requestId: request.id, responseId: response.id,
    resolutionNotes: "Accepted the collected response; financial signoff remains separate", replacement: detail.replacement.selection, correlationId: finding.id + "-accept" },
    { ...control("reviewer"), requireWorkDeskAccess: true, freshAuth: { actorId: f.actors.reviewer.actorId, organizationId: f.firm, lastAuthAt: new Date() } })
  const result = await getAdvisoryOutcomes(f.actors.preparer, { cohort: [scope(f)], from: start, to: new Date().toISOString() })
  expect(result.cohorts[0]).toMatchObject({ requestTouches: { value: 1 }, clientWaiting: { eligible: 1, measured: 1, missing: 0 }, responseToResolution: { eligible: 1, measured: 1, missing: 0 } })
  const earlier = await getAdvisoryOutcomes(f.actors.preparer, { cohort: [scope(f)], from: start, to: cutoff })
  expect(earlier.cohorts[0].clientWaiting).toMatchObject({ measured: 0, missing: 1, elapsedMs: null })
  expect(earlier.cohorts[0].responseToResolution.elapsedMs).toBeNull()
  writeFileSync(`${out}/request-outcome-checks.json`, JSON.stringify({ result, earlier, actualWorkflow: true }, null, 2))
})
