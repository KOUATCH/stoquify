jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const target = process.env.AF13_POSTGRES_URL
  if (process.env.NODE_ENV === "production" || !target || !process.env.AF13_CLUSTER_DIR) throw Error("Explicit synthetic AF13 target required")
  const url = new URL(target)
  if (url.hostname !== "127.0.0.1" || url.port !== "55450" || url.pathname !== "/stoquify_local_af13_20261025_r1") throw Error("Wrong AF13 target")
  return { db: new PrismaClient({ datasources: { db: { url: target } }, transactionOptions: { maxWait: 10000, timeout: 30000 } }) }
})
import { realpathSync, writeFileSync } from "node:fs"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { advisoryFixture } from "./advisory-outcomes.fixture"
import { executeFirmPracticeCommand, exportFirmPracticeSnapshot, getFirmPracticeDesk } from "../firm-practice.service"
import { executeAdvisoryCommand, getAdvisoryDesk, getAdvisoryOutcomes } from "../advisory-outcomes.service"
import { getReviewWorkpaperBinder, recordWorkpaperDecision } from "../review-workpaper.service"
import { balanceSheetHash } from "../balance-sheet-contract"
import { executeFirmEngagementCommand } from "../firm-engagement.service"
const out = "docs/accounting-firms/roadmap-2026-10-19/execution/AF13/2026-10-25-run-03"
type Fixture = Awaited<ReturnType<typeof advisoryFixture>>
const scope = (f: Fixture) => ({ ...f.scope, engagementId: f.engagementId })
const read = (f: Fixture, mode = "manager", includeEconomics = false) => ({ cohort: [scope(f)], mode, includeEconomics })
const save = (f: Fixture, recordKey: string, payload: unknown, expectedVersion = 0) => ({ ...scope(f), command: "SAVE", recordKey, payload, expectedVersion,
  idempotencyKey: "practice-" + Math.random(), reason: "Synthetic staffing decision" })
const effort = (minutes = 120) => ({ kind: "EFFORT", minutes, workDate: "2026-09-15", advisoryRevisionId: null, reviewDecisionId: null })
const finance = (f: Fixture) => db.role.update({ where: { id: f.actors.reviewer.actorId + "-role" }, data: { permissions: { push: "finance.profitability.read" } } })
beforeAll(async () => {
  const actual = await db.$queryRawUnsafe<Array<{ data_directory: string }>>("SHOW data_directory")
  expect(realpathSync(actual[0].data_directory).toLowerCase()).toBe(realpathSync(process.env.AF13_CLUSTER_DIR!).toLowerCase())
})
afterAll(async () => db.$disconnect())

it("supports a synthetic staffing decision, manual correction, independent review and confidential currency-separated budgets", async () => {
  const f = await advisoryFixture("af13-journey"); await finance(f)
  for (const [who, minutes] of [["preparer", 300], ["reviewer", 600], ["unassigned", 240]] as const) {
    const id = who === "unassigned" ? null : f.actors[who].actorId
    await executeFirmPracticeCommand(f.actors.reviewer, save(f, `plan:${id ?? "unassigned"}`, { kind: "PLAN", assigneeId: id, minutes }))
  }
  const command = save(f, "effort:manual-1", effort()), first = await executeFirmPracticeCommand(f.actors.preparer, command)
  expect(await executeFirmPracticeCommand(f.actors.preparer, command)).toMatchObject({ id: first.id, replayed: true })
  await expect(executeFirmPracticeCommand(f.actors.preparer, { ...command, reason: "Different retry payload" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  await executeFirmPracticeCommand(f.actors.preparer, save(f, command.recordKey, effort(180), 1))
  const review = { ...scope(f), command: "REVIEW", recordKey: command.recordKey, expectedVersion: 2, idempotencyKey: "independent-review", reason: "Reviewed manual declaration" }
  await expect(executeFirmPracticeCommand(f.actors.preparer, review)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await executeFirmPracticeCommand(f.actors.reviewer, review)
  for (const [currency, amount] of [["XAF", "90000.00"], ["EUR", "150.00"]])
    await executeFirmPracticeCommand(f.actors.reviewer, save(f, `fee:${currency}`, { kind: "FEE", currency, amount }))
  const before = await getFirmPracticeDesk(f.actors.reviewer, read(f, "manager", true))
  expect(before.cohorts[0].summary.allocation.find(row => row.assigneeId === f.actors.preparer.actorId)).toMatchObject({ plannedMinutes: 300, recordedMinutes: 180, effortVarianceMinutes: -120, reviewedDeclarations: 1 })
  expect(before.cohorts[0].summary.allocation.find(row => row.assigneeId === null)).toMatchObject({ plannedMinutes: 240, recordedMinutes: null })
  expect(before.cohorts[0].summary.economics.map(row => row.currency)).toEqual(["EUR", "XAF"])
  // Explicit manager decision: allocate 120 planned minutes to the preparer,
  // preserving the other 120 as unassigned; this makes no capacity claim.
  await executeFirmPracticeCommand(f.actors.reviewer, save(f, "plan:unassigned", { kind: "PLAN", assigneeId: null, minutes: 120 }, 1))
  await executeFirmPracticeCommand(f.actors.reviewer, save(f, `plan:${f.actors.preparer.actorId}`, { kind: "PLAN", assigneeId: f.actors.preparer.actorId, minutes: 420 }, 1))
  const after = await getFirmPracticeDesk(f.actors.reviewer, read(f, "manager", true))
  expect(after.cohorts[0].summary.plannedSubtotalMinutes).toBe(before.cohorts[0].summary.plannedSubtotalMinutes)
  const own = await getFirmPracticeDesk(f.actors.preparer, read(f, "own"))
  expect(own.cohorts[0].records.every(row => row.subjectUserId === f.actors.preparer.actorId)).toBe(true)
  expect(JSON.stringify(own)).not.toContain("90000.00")
  expect(own.cohorts[0].summary.economics).toEqual([])
  await expect(getFirmPracticeDesk(f.actors.preparer, read(f, "manager", true))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(getFirmPracticeDesk(f.actors.owner, read(f))).rejects.toMatchObject({ code: "FORBIDDEN" })
  const metrics = await getAdvisoryOutcomes(f.actors.reviewer, { cohort: [scope(f)], from: "2026-09-01T00:00:00Z", to: "2026-10-01T00:00:00Z" })
  expect(metrics.activeWorkTimeMs).toBeNull(); expect(metrics.baseline).toBe("NOT_ESTABLISHED")
  const audit = await db.auditLog.findMany({ where: { organizationId: f.firm, entityType: "FirmPracticeRevision" } })
  expect(JSON.stringify(audit)).not.toContain("90000.00")
  writeFileSync(`${out}/synthetic-staffing-decision.json`, JSON.stringify({ synthetic: true, before, after, decision: "Reallocate 120 planned minutes to preparer; retain 120 unassigned. Capacity and live pilot benefit remain unknown.", af12Context: metrics }, null, 2))
  writeFileSync(`${out}/browser-fixture.json`, JSON.stringify({ client: f.client, firm: f.firm, periodId: f.period.id, engagementId: f.engagementId, actors: Object.fromEntries(Object.entries(f.actors).map(([who, actor]) => [who, actor.actorId])) }, null, 2))
})

it("references real AF12 and workpaper revisions without copying their narratives or client evidence", async () => {
  const f = await advisoryFixture("af13-reference"), binder = await getReviewWorkpaperBinder(f.actors.preparer, f.scope)
  const preparation = await recordWorkpaperDecision(f.actors.preparer, { ...f.scope, expectedSourceHash: binder.sourceHash, conclusion: "Synthetic workpaper preparation", idempotencyKey: "af13-prepare", decision: "PREPARED" })
  await recordWorkpaperDecision(f.actors.reviewer, { ...f.scope, expectedSourceHash: binder.sourceHash, conclusion: "Synthetic independent review", preparationId: preparation.id, idempotencyKey: "af13-review", decision: "REVIEWED" })
  const desk = await getAdvisoryDesk(f.actors.preparer, scope(f))
  const advisory = await executeAdvisoryCommand(f.actors.preparer, { ...scope(f), command: "DRAFT", expectedVersion: 0, expectedSourceHash: desk.sourceHash, expectedReviewHash: desk.reviewHash,
    idempotencyKey: "af13-advisory-reference", reason: "Synthetic advisory preparation", privateNote: "PRIVATE_NOTE_NEVER_IN_PRACTICE", narrative: {
      conclusions: [{ kind: "CASH", text: "Reviewed cash evidence supports the observation." }], actions: [{ title: "Collect next period supporting evidence", kind: "CASH", ownerId: f.actors.owner.actorId, dueAt: "2026-11-01T00:00:00Z" }] } })
  await executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:reference", { ...effort(), advisoryRevisionId: advisory.id, reviewDecisionId: preparation.id }))
  const result = await getFirmPracticeDesk(f.actors.preparer, read(f, "own"))
  expect(JSON.stringify(result)).not.toContain("PRIVATE_NOTE_NEVER_IN_PRACTICE")
  expect(result.cohorts[0].advisoryReferences).toContainEqual({ id: advisory.id, version: 1, state: "DRAFT" })
  const other = await advisoryFixture("af13-other-reference")
  await expect(executeFirmPracticeCommand(other.actors.preparer, save(other, "effort:foreign", { ...effort(), advisoryRevisionId: advisory.id }))).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("denies foreign scopes, other people's effort corrections, invalid dates and duplicate client-period allocation", async () => {
  const f = await advisoryFixture("af13-boundary"), other = await advisoryFixture("af13-foreign")
  await executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:owned", effort()))
  await expect(executeFirmPracticeCommand(f.actors.reviewer, save(f, "effort:owned", effort(20), 1))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(getFirmPracticeDesk(other.actors.preparer, read(f))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:bad-date", { ...effort(), workDate: "2026-02-30" }))).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  await expect(executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:future", { ...effort(), workDate: "2099-01-01" }))).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  await expect(executeFirmPracticeCommand(f.actors.reviewer, save(f, `plan:${other.actors.preparer.actorId}`, { kind: "PLAN", assigneeId: other.actors.preparer.actorId, minutes: 30 }))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(getFirmPracticeDesk(f.actors.preparer, { ...read(f), cohort: [scope(f), scope(f)] })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(await db.firmPracticeRevision.count({ where: { engagementId: f.engagementId } })).toBe(1)
})

it("serializes competing revisions and retains immutable database history with tenant foreign keys", async () => {
  const f = await advisoryFixture("af13-concurrent")
  const results = await Promise.allSettled([100, 200].map(minutes => executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:race", effort(minutes)))))
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
  expect(results.filter(result => result.status === "rejected")).toHaveLength(1)
  const row = await db.firmPracticeRevision.findFirstOrThrow({ where: { engagementId: f.engagementId } })
  await expect(db.firmPracticeRevision.update({ where: { id: row.id }, data: { reason: "Attempted destructive correction" } })).rejects.toThrow()
  await expect(db.firmPracticeRevision.delete({ where: { id: row.id } })).rejects.toThrow()
  await expect(db.firmPracticeRevision.create({ data: { ...row, id: row.id + "-foreign", recordKey: "effort:foreign", idempotencyKey: "invalid-fk", clientOrganizationId: f.firm } })).rejects.toThrow()
  await expect(db.firmPracticeRevision.create({ data: { ...row, id: row.id + "-null-subject", recordKey: "effort:null", idempotencyKey: "invalid-subject", subjectUserId: null } })).rejects.toThrow()
  await expect(db.firmPracticeRevision.create({ data: { ...row, id: row.id + "-null-reviewer", recordKey: "effort:review-null", idempotencyKey: "invalid-reviewer", operation: "REVIEW", reviewedById: null } })).rejects.toThrow()
  expect(await db.firmPracticeRevision.count({ where: { engagementId: f.engagementId } })).toBe(1)
})

it("rechecks current permissions, session and mandate even on exact retries", async () => {
  const f = await advisoryFixture("af13-revoke"); await finance(f)
  const command = save(f, "fee:XAF", { kind: "FEE", currency: "XAF", amount: "50.00" })
  await executeFirmPracticeCommand(f.actors.reviewer, command)
  const role = await db.role.findUniqueOrThrow({ where: { id: f.actors.reviewer.actorId + "-role" } })
  await db.role.update({ where: { id: role.id }, data: { permissions: role.permissions.filter(p => p !== "finance.profitability.read") } })
  await expect(executeFirmPracticeCommand(f.actors.reviewer, command)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(getFirmPracticeDesk(f.actors.reviewer, read(f, "manager", true))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.accountantAccessGrant.update({ where: { id: f.actors.preparer.actorId + "-grant" }, data: { revokedAt: new Date(), revokedById: f.actors.owner.actorId, status: "REVOKED" } })
  await expect(getFirmPracticeDesk(f.actors.preparer, read(f, "own"))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.session.update({ where: { id: f.actors.reviewer.session!.id }, data: { expiresAt: new Date(0) } })
  await expect(getFirmPracticeDesk(f.actors.reviewer, read(f))).rejects.toThrow()
})

it("exports a scoped auditable snapshot without placing firm fees in client deliverables", async () => {
  const f = await advisoryFixture("af13-export"); await finance(f)
  await executeFirmPracticeCommand(f.actors.reviewer, save(f, "fee:XAF", { kind: "FEE", currency: "XAF", amount: "500.00" }))
  await executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:export", effort(30)))
  const before = await db.closePackExport.count({ where: { organizationId: f.client } })
  const artifact = await exportFirmPracticeSnapshot(f.actors.reviewer, read(f, "manager", true))
  const snapshot = JSON.parse(Buffer.from(artifact.contentBase64, "base64").toString("utf8"))
  expect(snapshot.contentHash).toBe(balanceSheetHash(snapshot.report))
  expect(snapshot.report.cohorts[0].summary.economics[0].feeBudget).toBe("500.00")
  expect(snapshot.watermarkId).toBeTruthy()
  const own = await exportFirmPracticeSnapshot(f.actors.preparer, read(f, "own"))
  expect(Buffer.from(own.contentBase64, "base64").toString("utf8")).not.toContain("500.00")
  expect(await db.closePackExport.count({ where: { organizationId: f.client } })).toBe(before)
  const role = await db.role.findUniqueOrThrow({ where: { id: f.actors.reviewer.actorId + "-role" } })
  await db.role.update({ where: { id: role.id }, data: { permissions: role.permissions.filter(p => p !== "accounting.exports.create") } })
  await expect(exportFirmPracticeSnapshot(f.actors.reviewer, read(f, "manager", true))).rejects.toThrow()
  writeFileSync(out + "/practice-export.json", JSON.stringify(snapshot, null, 2))
})

it("allows a non-manager preparer only their own work and honors current module access", async () => {
  const f = await advisoryFixture("af13-staff-scope")
  const role = await db.role.findUniqueOrThrow({ where: { id: f.actors.preparer.actorId + "-role" } })
  await db.role.update({ where: { id: role.id }, data: { permissions: role.permissions.filter(p => p !== "accounting.close.accountant.invite") } })
  await executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:staff", effort(45)))
  expect((await getFirmPracticeDesk(f.actors.preparer, read(f, "own"))).cohorts[0].canManage).toBe(false)
  await expect(getFirmPracticeDesk(f.actors.preparer, read(f, "manager"))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(executeFirmPracticeCommand(f.actors.preparer, save(f, "plan:unassigned", { kind: "PLAN", assigneeId: null, minutes: 20 }))).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.organization.update({ where: { id: f.client }, data: { requestedModules: ["accounting"] } })
  await expect(getFirmPracticeDesk(f.actors.preparer, read(f, "own"))).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("rolls back an effort record when its session expires while waiting on the period writer", async () => {
  const f = await advisoryFixture("af13-expiry")
  let release!: () => void, locked!: () => void
  const ready = new Promise<void>(resolve => { locked = resolve }), hold = new Promise<void>(resolve => { release = resolve })
  const blocker = db.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`firm-practice:${f.firm}:${f.engagementId}:${f.period.id}`},0))::text`)
    locked(); await hold
  }, { timeout: 10000 })
  await ready
  try {
    await db.session.update({ where: { id: f.actors.preparer.session!.id }, data: { expiresAt: new Date(Date.now() + 1500) } })
    const pending = executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:expires", effort())).then(value => ({ value }), error => ({ error }))
    await new Promise(resolve => setTimeout(resolve, 1800)); release(); await blocker
    const result = await pending
    expect("error" in result).toBe(true)
    expect(await db.firmPracticeRevision.count({ where: { engagementId: f.engagementId } })).toBe(0)
    expect(await db.auditLog.count({ where: { organizationId: f.firm, entityType: "FirmPracticeRevision" } })).toBe(0)
  } finally { release(); await blocker }
})

it("bounds retained history instead of reporting an incomplete subtotal as complete", async () => {
  const f = await advisoryFixture("af13-limit"), payload = effort()
  await db.firmPracticeRevision.createMany({ data: Array.from({ length: 501 }, (_, index) => ({
    engagementId: f.engagementId, firmOrganizationId: f.firm, clientOrganizationId: f.client, periodId: f.period.id,
    recordKey: `effort:${index}`, version: 1, kind: "EFFORT", operation: "SAVE", subjectUserId: f.actors.preparer.actorId,
    actorId: f.actors.preparer.actorId, recordedById: f.actors.preparer.actorId, payload, reason: "Synthetic source bound",
    contentHash: balanceSheetHash({ payload, subjectUserId: f.actors.preparer.actorId, recordedById: f.actors.preparer.actorId }),
    idempotencyKey: `bounded-source-${index}`, commandHash: "synthetic-source-bound",
  })) })
  await expect(getFirmPracticeDesk(f.actors.preparer, read(f, "own"))).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
})

it("keeps a bounded multi-client cohort attributable and fails closed if any selected client is unauthorized", async () => {
  const f = await advisoryFixture("af13-cohort"), client = f.client + "-second", owner = client + "-owner"
  await db.organization.create({ data: { id: client, slug: client, name: "Synthetic second client", currency: "XAF", countryCode: "CM", requestedModules: ["accounting", "close_assurance"] } })
  await db.user.create({ data: { id: owner, email: owner + "@example.invalid", organizationId: client, emailVerified: true } })
  const grant = await db.accountantAccessGrant.create({ data: { organizationId: client, accountantUserId: f.actors.preparer.actorId,
    accountantFirmName: "Synthetic", role: "REVIEWER", activeScopeKey: `${client}:${f.actors.preparer.actorId}`, consentGrantedById: owner,
    consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") } })
  const command = (input: Record<string, unknown>) => executeFirmEngagementCommand(f.actors.preparer, { ...input, idempotencyKey: "cohort-" + Math.random() })
  const engagement = await command({ command: "CREATE", clientOrganizationId: client, ownerUserId: f.actors.preparer.actorId,
    scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
  await command({ command: "ASSIGN", engagementId: engagement.engagementId, expectedVersion: 0, expectedAssignmentVersion: 0,
    accountantUserId: f.actors.preparer.actorId, scope: "REVIEWER", effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") })
  await command({ command: "ENROLL", engagementId: engagement.engagementId, expectedVersion: 0, grantId: grant.id })
  await command({ command: "TRANSITION", engagementId: engagement.engagementId, expectedVersion: 0, status: "ACTIVE", reason: "Synthetic second cohort activation" })
  const year = await db.fiscalYear.create({ data: { organizationId: client, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  const period = await db.accountingPeriod.create({ data: { organizationId: client, fiscalYearId: year.id, periodNumber: 9, name: "September second client", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30") } })
  const second = { clientOrganizationId: client, periodId: period.id, engagementId: engagement.engagementId }
  await executeFirmPracticeCommand(f.actors.preparer, save(f, "effort:first-client", effort(60)))
  await executeFirmPracticeCommand(f.actors.preparer, { ...save(f, "effort:second-client", effort(90)), ...second })
  const result = await getFirmPracticeDesk(f.actors.preparer, { cohort: [scope(f), second], mode: "manager" })
  expect(result.cohortCount).toBe(2)
  expect(result.cohorts.find(row => row.engagementId === f.engagementId)?.summary.allocation.find(row => row.assigneeId === f.actors.preparer.actorId)?.recordedMinutes).toBe(60)
  expect(result.cohorts.find(row => row.engagementId === second.engagementId)?.summary.allocation[0].recordedMinutes).toBe(90)
  await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { expiresAt: new Date(0) } })
  await expect(getFirmPracticeDesk(f.actors.preparer, { cohort: [scope(f), second], mode: "manager" })).rejects.toMatchObject({ code: "FORBIDDEN" })
})
