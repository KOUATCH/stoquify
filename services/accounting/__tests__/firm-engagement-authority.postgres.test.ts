jest.mock("server-only", () => ({}))
jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return { ...actual, recordBusinessEventInTx: jest.fn(actual.recordBusinessEventInTx) }
})
// Scheduling seams delegate to the real authority and retain its SQL locks.
jest.mock("../close-evidence-acceptance-authority.service", () => {
  const actual = jest.requireActual("../close-evidence-acceptance-authority.service")
  return { ...actual, lockAccountantExportAuthorityInTx: jest.fn(actual.lockAccountantExportAuthorityInTx),
    lockCloseEvidenceAcceptanceAuthorityInTx: jest.fn(actual.lockCloseEvidenceAcceptanceAuthorityInTx) }
})
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require(process.env.AF04_PRISMA_CLIENT!)
  const url = new URL(process.env.AF04_POSTGRES_URL || "")
  if (url.hostname !== "127.0.0.1" || url.port !== "55441" || !/^\/stoquify_local_af04_2026_10_(19|20)_run_\d{2}_(clean|upgrade)$/.test(url.pathname)) throw Error("Explicit AF04 disposable database required")
  return { db: new PrismaClient({ datasources: { db: { url: url.toString() } }, transactionOptions: { maxWait: 10000, timeout: 15000 } }) }
})
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { executeFirmEngagementCommand, getFirmEngagement } from "../firm-engagement.service"
import { resolveAccountantClientAccess, revokeAccountantAccess } from "../accountant-access.service"
import { lockAccountantExportAuthorityInTx, lockCloseEvidenceAcceptanceAuthorityInTx } from "../close-evidence-acceptance-authority.service"
import { recordBusinessEventInTx } from "@/services/events/business-event.service"
import { exportAccountantTrustPack, getAccountantPortalData } from "../data-trust.service"
import { acceptMissingCloseEvidenceResponse } from "../close-assurance.service"

const permissions = ["accounting.audit.read", "accounting.close.accountant.invite", "accounting.close.accountant.review", "accounting.exports.create", "accounting.close.evidence.request", "accounting.close.read"]
const start = new Date("2020-01-01"), end = new Date("2099-01-01")
let sequence = 0
const gate = () => { let release!: () => void; const promise = new Promise<void>(r => { release = r }); return { promise, release } }
async function fixture(activate = true) {
  const prefix = `af04-${++sequence}`
  const firm = prefix + "-firm", client = prefix + "-client", staff = prefix + "-staff", other = prefix + "-other"
  await db.organization.createMany({ data: [firm, client, other].map(id => ({ id, name: id, slug: id, requestedModules: ["accounting", "close_assurance"] })) })
  await db.role.create({ data: { id: prefix + "-role", organizationId: firm, code: prefix, nameEn: "Synthetic firm operator", permissions } })
  await db.user.create({ data: { id: staff, email: staff + "@example.invalid", organizationId: firm, emailVerified: true, roles: { connect: { id: prefix + "-role" } } } })
  const session = await db.session.create({ data: { userId: staff, token: prefix + "-synthetic-session", expiresAt: end, assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: firm, assuranceLevel: 1 } })
  const actor = { homeOrganizationId: firm, actorId: staff, session: { id: session.id, token: session.token } }
  const grant = await db.accountantAccessGrant.create({ data: { organizationId: client, accountantUserId: staff,
    accountantFirmName: "Synthetic", role: "REVIEWER", activeScopeKey: `${client}:${staff}`, consentGrantedById: "synthetic-owner",
    consentEvidenceHash: "sha256:" + "a".repeat(64), effectiveFrom: start, expiresAt: end } })
  const create = { command: "CREATE", clientOrganizationId: client, ownerUserId: staff, scope: "REVIEWER", effectiveFrom: start, expiresAt: end, idempotencyKey: prefix + "-create" }
  let engagement = await executeFirmEngagementCommand(actor, create)
  const assign = { command: "ASSIGN", engagementId: engagement.engagementId, expectedVersion: 0, accountantUserId: staff,
    expectedAssignmentVersion: 0, scope: "REVIEWER", effectiveFrom: start, expiresAt: end, idempotencyKey: prefix + "-assign" }
  const assignment = await executeFirmEngagementCommand(actor, assign)
  await executeFirmEngagementCommand(actor, { command: "ENROLL", engagementId: engagement.engagementId, expectedVersion: 0, grantId: grant.id, idempotencyKey: prefix + "-enroll" })
  const transition = { command: "TRANSITION", engagementId: engagement.engagementId, expectedVersion: 0, status: "ACTIVE", reason: "Synthetic explicit activation", idempotencyKey: prefix + "-activate" }
  if (activate) engagement = await executeFirmEngagementCommand(actor, transition)
  const access = { homeOrganizationId: firm, clientOrganizationId: client, accountantUserId: staff, capability: "READ" as const }
  return { prefix, firm, client, staff, other, actor, grant, create, assign, assignment, engagement, transition, access }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
const suspend = (f: Fixture) => executeFirmEngagementCommand(f.actor, { command: "TRANSITION", engagementId: f.engagement.engagementId,
  expectedVersion: 1, status: "SUSPENDED", reason: "Synthetic suspension of access", idempotencyKey: f.prefix + "-suspend" })
const revoke = (f: Fixture) => revokeAccountantAccess(f.client, "synthetic-owner", { grantId: f.grant.id, reason: "Synthetic client withdrawal" })
afterAll(async () => db.$disconnect())

it("preserves an unlinked legacy mandate and its role ceiling", async () => {
  const input = { homeOrganizationId: "af04-legacy-firm", clientOrganizationId: "af04-legacy-client", accountantUserId: "af04-legacy-user", capability: "READ" as const }
  await expect(resolveAccountantClientAccess(input)).resolves.toMatchObject({ mode: "DELEGATED_ACCOUNTANT" })
  await expect(resolveAccountantClientAccess({ ...input, capability: "EXPORT" })).rejects.toThrow("read-only")
})
it("requires explicit enrollment AND activation; preserves sticky rollback restrictions", async () => {
  const f = await fixture(false)
  await expect(resolveAccountantClientAccess(f.access)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await executeFirmEngagementCommand(f.actor, f.transition)
  await expect(resolveAccountantClientAccess(f.access)).resolves.toMatchObject({ mode: "DELEGATED_ACCOUNTANT" })
  expect(await db.accountantAccessGrant.findFirst({ where: { activeScopeKey: `${f.client}:${f.staff}`, status: "ACTIVE" } })).toBeNull()
  await expect(db.accountantAccessGrant.create({ data: { organizationId: f.client, accountantUserId: f.staff,
    accountantFirmName: "Legacy invitation attempt", role: "REVIEWER", activeScopeKey: `${f.client}:${f.staff}`,
    consentGrantedById: "synthetic-owner", consentEvidenceHash: "sha256:" + "c".repeat(64), effectiveFrom: start, expiresAt: end } })).rejects.toThrow()
  await expect(db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { activeScopeKey: `${f.client}:${f.staff}` } })).rejects.toThrow()
  await expect(db.firmEngagementGrantLink.delete({ where: { grantId: f.grant.id } })).rejects.toThrow()
})
it("replays exactly, rejects changed payload/stale version and retains one event/outbox per command", async () => {
  const f = await fixture()
  expect(await executeFirmEngagementCommand(f.actor, f.create)).toEqual({ engagementId: f.engagement.engagementId, version: 0, status: "DRAFT" })
  expect(await executeFirmEngagementCommand(f.actor, f.transition)).toEqual(f.engagement)
  await expect(executeFirmEngagementCommand(f.actor, { ...f.transition, reason: "A changed command payload" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  await expect(executeFirmEngagementCommand(f.actor, { ...f.transition, status: "ENDED", idempotencyKey: "stale-command" })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(await db.firmEngagementTransition.count({ where: { engagementId: f.engagement.engagementId } })).toBe(1)
  const events = await db.businessEvent.findMany({ where: { organizationId: f.firm }, include: { outboxMessages: true, audits: true } })
  expect(events).toHaveLength(4)
  events.forEach(e => { expect(e.outboxMessages).toHaveLength(1); expect(e.audits.length).toBeGreaterThan(0) })
})
it("serializes concurrent identical lifecycle commands", async () => {
  const f = await fixture()
  expect(await Promise.all([suspend(f), suspend(f)])).toEqual([expect.objectContaining({ status: "SUSPENDED", version: 2 }), expect.objectContaining({ status: "SUSPENDED", version: 2 })])
  expect(await db.firmEngagementTransition.count({ where: { engagementId: f.engagement.engagementId } })).toBe(2)
})
it("rolls back lifecycle state, transition, event and outbox together after publication failure", async () => {
  const f = await fixture()
  const actual = jest.requireActual("@/services/events/business-event.service").recordBusinessEventInTx
  ;(recordBusinessEventInTx as jest.Mock).mockImplementationOnce(async (...args: unknown[]) => {
    await actual(...args)
    throw Error("Synthetic failure after outbox insertion")
  })
  await expect(suspend(f)).rejects.toThrow("Synthetic failure")
  expect((await db.firmEngagement.findUniqueOrThrow({ where: { id: f.engagement.engagementId } })).status).toBe("ACTIVE")
  expect(await db.firmEngagementTransition.count({ where: { engagementId: f.engagement.engagementId } })).toBe(1)
  expect(await db.businessEvent.count({ where: { organizationId: f.firm } })).toBe(4)
  await expect(suspend(f)).resolves.toMatchObject({ status: "SUSPENDED" })
})
it.each(["staff-inactive", "role-removed", "home-inactive", "client-inactive", "grant-expired", "grant-revoked", "suspended", "assignment-ended", "module-removed"] as const)("denies managed access after %s", async kind => {
  const f = await fixture()
  if (kind === "staff-inactive") await db.user.update({ where: { id: f.staff }, data: { isActive: false } })
  if (kind === "role-removed") await db.role.update({ where: { id: f.prefix + "-role" }, data: { permissions: [] } })
  if (kind === "home-inactive") await db.organization.update({ where: { id: f.firm }, data: { isActive: false } })
  if (kind === "client-inactive") await db.organization.update({ where: { id: f.client }, data: { isActive: false } })
  if (kind === "grant-expired") await db.accountantAccessGrant.update({ where: { id: f.grant.id }, data: { expiresAt: new Date("2021-01-01") } })
  if (kind === "grant-revoked") await revoke(f)
  if (kind === "suspended") await suspend(f)
  if (kind === "assignment-ended") await executeFirmEngagementCommand(f.actor, { command: "REMOVE_ASSIGNMENT", engagementId: f.engagement.engagementId, expectedVersion: 1, assignmentId: f.assignment.assignmentId, expectedAssignmentVersion: 1, reason: "Synthetic removal of staff", idempotencyKey: f.prefix + "-remove" })
  if (kind === "module-removed") await db.organization.update({ where: { id: f.client }, data: { requestedModules: ["accounting"] } })
  await expect(resolveAccountantClientAccess(f.access)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("denies guessed clients, foreign staff, forged tenant and stale session without writes", async () => {
  const f = await fixture(false)
  await db.user.create({ data: { id: f.prefix + "-outsider", email: f.prefix + "-outsider@example.invalid", organizationId: f.other, emailVerified: true } })
  await expect(executeFirmEngagementCommand(f.actor, { ...f.create, clientOrganizationId: f.other, idempotencyKey: "guessed-client" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(executeFirmEngagementCommand(f.actor, { ...f.assign, accountantUserId: f.prefix + "-outsider", idempotencyKey: "foreign-staff" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(getFirmEngagement({ ...f.actor, homeOrganizationId: f.other }, { engagementId: f.engagement.engagementId })).rejects.toMatchObject({ code: "FORBIDDEN" })
  await db.session.update({ where: { id: f.actor.session.id }, data: { assuranceVerifiedAt: start } })
  await expect(executeFirmEngagementCommand(f.actor, f.transition)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  expect(await db.businessEvent.count({ where: { organizationId: f.firm } })).toBe(3)
})
it("retains metadata after ending but denies financial visibility and mutation", async () => {
  const f = await fixture()
  await executeFirmEngagementCommand(f.actor, { command: "TRANSITION", engagementId: f.engagement.engagementId, expectedVersion: 1,
    status: "ENDED", reason: "Synthetic completed engagement", idempotencyKey: f.prefix + "-end" })
  expect((await getFirmEngagement(f.actor, { engagementId: f.engagement.engagementId })).transitions).toHaveLength(2)
  await expect(resolveAccountantClientAccess(f.access)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("hands over atomically to existing firm staff without creating or transferring consent", async () => {
  const f = await fixture(), next = f.prefix + "-next"
  await db.user.create({ data: { id: next, email: next + "@example.invalid", organizationId: f.firm, emailVerified: true, roles: { connect: { id: f.prefix + "-role" } } } })
  const grant = await db.accountantAccessGrant.create({ data: { organizationId: f.client, accountantUserId: next, accountantFirmName: "Synthetic", role: "READ_ONLY",
    activeScopeKey: `${f.client}:${next}`, consentGrantedById: "synthetic-owner", consentEvidenceHash: "sha256:" + "b".repeat(64), effectiveFrom: start, expiresAt: end } })
  const result = await executeFirmEngagementCommand(f.actor, { command: "HANDOVER", engagementId: f.engagement.engagementId, expectedVersion: 1,
    assignmentId: f.assignment.assignmentId, expectedAssignmentVersion: 1, accountantUserId: next, expectedNewAssignmentVersion: 0,
    scope: "READ_ONLY", effectiveFrom: new Date(), expiresAt: end, reason: "Synthetic named staff handover", idempotencyKey: f.prefix + "-handover" })
  await expect(resolveAccountantClientAccess(f.access)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(result.assignmentId).not.toBe(f.assignment.assignmentId)
  await executeFirmEngagementCommand(f.actor, { command: "ENROLL", engagementId: f.engagement.engagementId, expectedVersion: 1, grantId: grant.id, idempotencyKey: f.prefix + "-next-enroll" })
  await expect(resolveAccountantClientAccess({ ...f.access, accountantUserId: next })).resolves.toBeDefined()
  await expect(resolveAccountantClientAccess({ ...f.access, accountantUserId: next, capability: "EXPORT" })).rejects.toMatchObject({ code: "FORBIDDEN" })
})

// Actual authority + PostgreSQL locks + retained event/outbox, with controlled
// barriers. Separate tests below exercise the actual export and replay entrypoints.
it.each(["accept", "export"] as const)("%s boundary commits before competing suspension/revocation and retains evidence", async operation => {
  for (const restriction of [suspend, revoke]) {
    const f = await fixture(), held = gate(), finish = gate()
    const write = db.$transaction(async tx => {
      const lock = operation === "accept" ? lockCloseEvidenceAcceptanceAuthorityInTx : lockAccountantExportAuthorityInTx
      const authority = await lock(tx, { ...f.actor, organizationId: f.client })
      held.release(); await finish.promise; await authority.revalidate()
      await recordBusinessEventInTx(tx, { organizationId: f.client, actorId: f.staff, eventType: "AF04_AUTHORITY_RACE_PROOF",
        eventSource: "INTERNAL", idempotencyKey: f.prefix + "-race", payload: { operation },
        outboxMessages: [{ channel: "NOTIFICATION", eventName: "af04.synthetic-proof", payload: { operation } }] })
    }, { isolationLevel: "ReadCommitted", timeout: 15000 })
    await held.promise
    let completed = false
    const restrict = restriction(f).then(r => { completed = true; return r })
    // Observe actual PostgreSQL lock waiting, rather than assuming a timer wins.
    let waiting = false
    for (let i = 0; i < 100; i++) {
      const rows = await db.$queryRaw<Array<{ waiting: boolean }>>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock') AS waiting`)
      if (rows[0].waiting) { waiting = true; break }
      await new Promise(r => setTimeout(r, 10))
    }
    finish.release()
    await Promise.all([write, restrict])
    expect(waiting).toBe(true)
    expect(completed).toBe(true)
    expect(await db.businessEvent.count({ where: { organizationId: f.client, eventType: "AF04_AUTHORITY_RACE_PROOF" } })).toBe(1)
    await expect(resolveAccountantClientAccess(f.access)).rejects.toMatchObject({ code: "FORBIDDEN" })
  }
})
it.each(["accept", "export"] as const)("%s boundary denies when suspension wins and after expiry during a wait", async operation => {
  const f = await fixture()
  const lock = operation === "accept" ? lockCloseEvidenceAcceptanceAuthorityInTx : lockAccountantExportAuthorityInTx
  await suspend(f)
  await expect(db.$transaction(tx => lock(tx, { ...f.actor, organizationId: f.client }))).rejects.toMatchObject({ code: "FORBIDDEN" })
  const live = await fixture()
  await expect(db.$transaction(async tx => {
    const authority = await lock(tx, { ...live.actor, organizationId: live.client })
    await authority.revalidate(new Date(Date.now() + 301000))
  })).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
})
it("actual export service denies suspended managed access and direct calls lacking session proof", async () => {
  const f = await fixture()
  const input = { organizationId: f.client, exportedById: f.staff, actorPermissions: permissions, lastAuthAt: new Date(),
    authority: { homeOrganizationId: f.firm, session: f.actor.session } }
  await suspend(f)
  await expect(exportAccountantTrustPack(input)).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(exportAccountantTrustPack({ ...input, authority: undefined })).rejects.toThrow("authenticated authority")
  expect(await db.ledgerAuditEvent.count({ where: { organizationId: f.client } })).toBe(0)
})
it("actual acceptance retry cannot expose a retained receipt after suspension", async () => {
  const f = await fixture()
  await suspend(f)
  await expect(acceptMissingCloseEvidenceResponse(f.firm, { clientOrganizationId: f.client, requestId: "retained-request", responseId: "retained-response",
    resolutionNotes: "Synthetic acceptance retry", correlationId: "retained-correlation" }, { actorId: f.staff, actorPermissions: permissions, session: f.actor.session,
    freshAuth: { actorId: f.staff, organizationId: f.firm, lastAuthAt: new Date() } })).rejects.toMatchObject({ code: "FORBIDDEN" })
})

async function financialFixture(f: Fixture) {
  const organizationId = f.client, now = new Date()
  const year = await db.fiscalYear.create({ data: { organizationId, name: "Synthetic AF04", startDate: start, endDate: end } })
  const period = await db.accountingPeriod.create({ data: { organizationId, fiscalYearId: year.id, periodNumber: 1, name: "Synthetic AF04", startDate: start, endDate: end } })
  await db.organizationAccountingSettings.create({ data: { organizationId, accountingEnabled: true, setupStatus: "READY" } })
  const journal = await db.journal.create({ data: { organizationId, code: "SYN", nameEn: "Synthetic", type: "GENERAL" } })
  const accounts = await Promise.all([
    db.chartOfAccount.create({ data: { organizationId, code: "600000", nameEn: "Synthetic expense", type: "EXPENSE", normalBalance: "DEBIT" } }),
    db.chartOfAccount.create({ data: { organizationId, code: "700000", nameEn: "Synthetic income", type: "REVENUE", normalBalance: "CREDIT" } }),
  ])
  const batch = await db.ledgerPostingBatch.create({ data: { organizationId, periodId: period.id, sourceType: "MANUAL", sourceId: f.prefix,
    postingPurpose: "MANUAL_JOURNAL", idempotencyKey: f.prefix, status: "POSTED", postedAt: now } })
  const entry = await db.journalEntry.create({ data: { organizationId, journalId: journal.id, periodId: period.id,
    postingBatchId: batch.id, entryNumber: "SYN-1", entryDate: now, status: "POSTED", postedAt: now, sourceType: "MANUAL", sourceId: f.prefix,
    lines: { create: accounts.map((a, i) => ({ organizationId, accountId: a.id, lineNumber: i + 1, debit: i === 0 ? 10 : 0, credit: i === 1 ? 10 : 0 })) } } })
  await db.accountingSourceLink.create({ data: { organizationId, postingBatchId: batch.id, journalEntryId: entry.id, sourceType: "MANUAL", sourceId: f.prefix, sourceDate: now } })
  const input = { organizationId, periodId: period.id, exportedById: f.staff, actorPermissions: permissions, lastAuthAt: now,
    authority: { homeOrganizationId: f.firm, session: f.actor.session } }
  const portal = await getAccountantPortalData(input)
  expect(portal.blockers).toEqual([])
  return { period, input }
}
async function retainedAcceptance(f: Fixture, periodId: string) {
  const now = new Date()
  const run = await db.closeRun.create({ data: { organizationId: f.client, periodId, status: "READY", readinessScore: 100, asOf: now } })
  const finding = await db.closeAssuranceFinding.create({ data: { organizationId: f.client, periodId, closeRunId: run.id,
    domain: "LEDGER", severity: "MEDIUM", status: "RESOLVED", title: "Synthetic retained acceptance", detail: "Synthetic", sourceService: "AF04" } })
  const input = { clientOrganizationId: f.client, requestId: f.prefix + "-request", responseId: f.prefix + "-response",
    resolutionNotes: "Synthetic retained acceptance", correlationId: f.prefix + "-acceptance" }
  await db.accountantComment.create({ data: { organizationId: f.client, periodId, closeRunId: run.id, findingId: finding.id,
    authorId: f.staff, body: input.resolutionNotes, visibility: "ACCOUNTANT_RESPONSE_ACCEPTED", correlationId: input.correlationId,
    metadata: { acceptanceType: "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE", requestId: input.requestId, responseId: input.responseId,
      requestCorrelationId: f.prefix + "-request-corr", responseCorrelationId: f.prefix + "-response-corr", findingId: finding.id,
      periodId, closeRunId: run.id, respondedById: "synthetic-respondent", acceptedById: f.staff, decision: "ACCEPTED",
      findingStatus: "RESOLVED", resolvedAt: now.toISOString(), correlationId: input.correlationId } } })
  return { input, control: { actorId: f.staff, actorPermissions: permissions, session: f.actor.session,
    freshAuth: { actorId: f.staff, organizationId: f.firm, lastAuthAt: now } } }
}
it.each(["suspend", "revoke"] as const)("actual certified export wins before concurrent %s and retains exactly one export event", async restriction => {
  const f = await fixture(), { input } = await financialFixture(f), held = gate(), finish = gate()
  const actual = jest.requireActual("../close-evidence-acceptance-authority.service")
  ;(lockAccountantExportAuthorityInTx as jest.Mock).mockImplementationOnce(async (tx, authorityInput) => {
    const authority = await actual.lockAccountantExportAuthorityInTx(tx, authorityInput)
    held.release(); await finish.promise; return authority
  })
  const exported = exportAccountantTrustPack(input)
  await held.promise
  const restricted = restriction === "suspend" ? suspend(f) : revoke(f)
  await new Promise(r => setTimeout(r, 80))
  finish.release()
  const [result] = await Promise.all([exported, restricted])
  expect(result.content).toContain("AQSTOQFLOW_ACCOUNTANT_TRUST_PACK")
  expect(await db.businessEvent.count({ where: { organizationId: f.client, eventType: "REPORT_EXPORT_CREATED" } })).toBe(1)
  expect(await db.ledgerAuditEvent.count({ where: { organizationId: f.client, action: "ACCOUNTANT_TRUST_PACK_EXPORT" } })).toBe(1)
  await expect(exportAccountantTrustPack(input)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it.each(["suspend", "revoke"] as const)("actual retained acceptance replay serializes with %s and is denied afterwards", async restriction => {
  const f = await fixture(), { period } = await financialFixture(f), saved = await retainedAcceptance(f, period.id), held = gate(), finish = gate()
  const actual = jest.requireActual("../close-evidence-acceptance-authority.service")
  ;(lockCloseEvidenceAcceptanceAuthorityInTx as jest.Mock).mockImplementationOnce(async (tx, authorityInput) => {
    const authority = await actual.lockCloseEvidenceAcceptanceAuthorityInTx(tx, authorityInput)
    held.release(); await finish.promise; return authority
  })
  const accepted = acceptMissingCloseEvidenceResponse(f.firm, saved.input, saved.control)
  await held.promise
  const restricted = restriction === "suspend" ? suspend(f) : revoke(f)
  await new Promise(r => setTimeout(r, 80))
  finish.release()
  const [result] = await Promise.all([accepted, restricted])
  expect(result.decision).toBe("ACCEPTED")
  expect(await db.accountantComment.count({ where: { organizationId: f.client, visibility: "ACCOUNTANT_RESPONSE_ACCEPTED" } })).toBe(1)
  await expect(acceptMissingCloseEvidenceResponse(f.firm, saved.input, saved.control)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
