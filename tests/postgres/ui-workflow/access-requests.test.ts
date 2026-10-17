import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"
import { PrismaClient } from "@prisma/client"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_UI_WORKFLOW_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient: Client } = jest.requireActual("@prisma/client")
  return { db: new Client({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } }) }
})
import { db } from "@/prisma/db"
import { submitAccessRequest, previewAccessRequest, decideAccessRequest, applyAccessRequest, withdrawAccessRequest, listAccessRequests, readAccessRequestHistory, accessRequestReturnPath } from "@/services/access-requests/access-request.service"

const suite = process.env.RUN_UI_WORKFLOW_POSTGRES === "1" ? describe : describe.skip
type Actor = Parameters<typeof submitAccessRequest>[0]
type Fixture = { requester: Actor; reviewer: Actor; roleId: string; reviewerRoleId: string; requesterSessionId: string; session: { id: string; token: string } }
let observer: PrismaClient
const flags = ["ACCESS_REQUEST_SUBMISSIONS_ENABLED", "ACCESS_REQUEST_APPLICATION_ENABLED"] as const
const oldFlags = flags.map(flag => process.env[flag])
async function fixture(): Promise<Fixture> {
  const suffix = randomUUID(), orgId = `ux-access-${suffix}`
  const requester = { orgId, userId: `ux-requester-${suffix}`, permissions: ["dashboard.read"] }
  const reviewer = { orgId, userId: `ux-reviewer-${suffix}`, permissions: ["dashboard.read", "users.read", "users.roles.assign", "inventory.items.read"] }
  await db.organization.create({ data: { id: orgId, name: "Synthetic access test", slug: orgId, currency: "XAF" } })
  const basic = await db.role.create({ data: { organizationId: orgId, code: "TEST_BASIC", nameEn: "Basic", permissions: requester.permissions } })
  const review = await db.role.create({ data: { organizationId: orgId, code: "TEST_REVIEW", nameEn: "Reviewer", permissions: reviewer.permissions } })
  const role = await db.role.create({ data: { organizationId: orgId, code: "TEST_ITEMS", nameEn: "Item reader", permissions: ["inventory.items.read"] } })
  for (const [actor, roleId] of [[requester, basic.id], [reviewer, review.id]] as const) {
    await db.user.create({ data: { id: actor.userId, organizationId: orgId, email: `${actor.userId}@ui-workflow.invalid`, firstName: "Synthetic", lastName: "Member", isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: roleId } } } })
  }
  const requesterSession = await db.session.create({ data: { userId: requester.userId, token: `synthetic-${randomUUID()}`, expiresAt: new Date(Date.now() + 3600000) } })
  // Synthetic stored assurance tests the grant boundary, not password verification.
  const session = await db.session.create({ data: { userId: reviewer.userId, token: `synthetic-${randomUUID()}`, expiresAt: new Date(Date.now() + 3600000), assuranceVerifiedAt: new Date(), assuranceMethod: "password", assuranceOrganizationId: orgId, assuranceLevel: 1 } })
  return { requester, reviewer, roleId: role.id, reviewerRoleId: review.id, requesterSessionId: requesterSession.id, session: { id: session.id, token: session.token } }
}
const submit = (f: Fixture) => submitAccessRequest(f.requester, { commandId: randomUUID(), target: "items", reason: "Synthetic task requires item access" })
async function proposed(f: Fixture) {
  const request = await submit(f)
  const preview = await previewAccessRequest(f.reviewer, key(request))
  return { id: request.id, revision: request.revision, decision: "APPROVED" as const, reason: "Reviewed synthetic assignment", roleIds: [f.roleId], memberRevision: preview.memberRevision }
}
const key = (row: { id: string; revision: number }) => ({ id: row.id, revision: row.revision })
const current = async (f: Fixture) => (await listAccessRequests(f.requester, { queue: "mine" })).entries[0]
async function effects(f: Fixture) {
  const user = await db.user.findUniqueOrThrow({ where: { id: f.requester.userId }, select: { roles: { select: { id: true } } } })
  return { granted: user.roles.some(role => role.id === f.roleId), sessions: await db.session.count({ where: { userId: f.requester.userId } }),
    grants: await db.auditLog.count({ where: { organizationId: f.requester.orgId, action: "MEMBER_ACCESS_CHANGED" } }),
    applied: await db.auditLog.count({ where: { organizationId: f.requester.orgId, action: "ACCESS_REQUEST_APPLIED" } }) }
}
async function contend<T>(f: Fixture, tasks: () => Promise<T>[]) {
  let unlock!: () => void, locked!: () => void
  const release = new Promise<void>(resolve => { unlock = resolve }), ready = new Promise<void>(resolve => { locked = resolve })
  const holder = observer.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${f.requester.orgId} FOR UPDATE`; locked(); await release }, { timeout: 10000 })
  await Promise.race([ready, holder.then(() => { throw new Error("Lock holder ended before readiness") })])
  const pending = Promise.allSettled(tasks())
  try {
    let waiting = 0
    const deadline = Date.now() + 1500
    while (Date.now() < deadline) {
      const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(DISTINCT pid) AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FROM organizations%FOR UPDATE%'`
      waiting = Number(rows[0].count)
      if (waiting >= 2) break
      await delay(20)
    }
    expect(waiting).toBeGreaterThanOrEqual(2)
  } finally { unlock(); await holder }
  return pending
}
suite("UI workflow access requests on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
    observer = new PrismaClient({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } })
    const identity = await observer.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(process.env.UI_WORKFLOW_POSTGRES_DATABASE)
  })
  beforeEach(() => { flags.forEach(flag => { process.env[flag] = "true" }) })
  afterAll(async () => {
    flags.forEach((flag, index) => { if (oldFlags[index] === undefined) delete process.env[flag]; else process.env[flag] = oldFlags[index] })
    await Promise.all([db.$disconnect(), observer?.$disconnect()])
  })
  it("deduplicates competing new submissions and rejects a changed command replay", async () => {
    const f = await fixture(), command = { commandId: randomUUID(), target: "items", reason: "Need synthetic item access" }
    const results = await contend(f, () => [submitAccessRequest(f.requester, command), submit(f)])
    expect(results.every(result => result.status === "fulfilled")).toBe(true)
    expect((await listAccessRequests(f.requester, { queue: "mine" })).entries).toHaveLength(1)
    expect(await db.auditLog.count({ where: { organizationId: f.requester.orgId, action: "ACCESS_REQUEST_SUBMITTED" } })).toBe(1)
    // Replay the winning command, whose hash exists independently of race ordering.
    const other = await fixture(); await submitAccessRequest(other.requester, command)
    await expect(submitAccessRequest(other.requester, { ...command, reason: "Changed request reason" })).rejects.toBeDefined()
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("accepts only one competing decision and leaves the member unchanged", async () => {
    const f = await fixture(), command = await proposed(f)
    const results = await contend(f, () => [decideAccessRequest(f.reviewer, command), decideAccessRequest(f.reviewer, { ...command, decision: "DECLINED", roleIds: [] })])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } })
    expect(await db.auditLog.count({ where: { organizationId: f.requester.orgId, action: "ACCESS_REQUEST_DECIDED" } })).toBe(1)
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("serializes a decision with requester withdrawal", async () => {
    const f = await fixture(), command = await proposed(f)
    const results = await contend(f, () => [decideAccessRequest(f.reviewer, command), withdrawAccessRequest(f.requester, key(command))])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } })
    expect(["APPROVED", "WITHDRAWN"]).toContain((await current(f)).decision)
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("applies competing commands once, preserves existing roles and revokes requester sessions", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    const results = await contend(f, () => [applyAccessRequest(f.reviewer, key(approved), f.session), applyAccessRequest(f.reviewer, key(approved), f.session)])
    expect(results.every(result => result.status === "fulfilled")).toBe(true)
    expect(await effects(f)).toEqual({ granted: true, sessions: 0, grants: 1, applied: 1 })
    expect(await db.user.findUniqueOrThrow({ where: { id: f.requester.userId }, select: { roles: { select: { code: true } } } })).toMatchObject({ roles: expect.arrayContaining([{ code: "TEST_BASIC" }, { code: "TEST_ITEMS" }]) })
    expect(await accessRequestReturnPath(f.requester, approved.id)).toBe("/dashboard/inventory/items")
    const history = await readAccessRequestHistory(f.requester, key(await current(f)))
    expect(history.entries.map(entry => entry.action).sort()).toEqual(["ACCESS_REQUEST_APPLIED", "ACCESS_REQUEST_DECIDED", "ACCESS_REQUEST_SUBMITTED"])
    expect(history.entries.every(entry => entry.state !== null)).toBe(true)
  })
  it("serializes application and withdrawal without an unrecorded grant", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    const results = await contend(f, () => [applyAccessRequest(f.reviewer, key(approved), f.session), withdrawAccessRequest(f.requester, key(approved))])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    const row = await current(f)
    if (row.application === "APPLIED") expect(await effects(f)).toEqual({ granted: true, sessions: 0, grants: 1, applied: 1 })
    else { expect(row.decision).toBe("WITHDRAWN"); expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 }) }
  })
  it("requires fresh stored assurance and permits retry after reauthentication", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    await observer.session.update({ where: { id: f.session.id }, data: { assuranceVerifiedAt: new Date(Date.now() - 360000) } })
    await expect(applyAccessRequest(f.reviewer, key(approved), f.session)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
    const failed = await current(f)
    expect(failed).toMatchObject({ decision: "APPROVED", application: "FAILED", applicationError: "FRESH_AUTH_REQUIRED", revision: approved.revision + 1 })
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
    await observer.session.update({ where: { id: f.session.id }, data: { assuranceVerifiedAt: new Date() } })
    expect(await applyAccessRequest(f.reviewer, key(failed), f.session)).toMatchObject({ application: "APPLIED" })
    expect(await effects(f)).toEqual({ granted: true, sessions: 0, grants: 1, applied: 1 })
  })
  it("rejects revoked reviewer authority even when the supplied actor snapshot is stale", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    await observer.role.update({ where: { id: f.reviewerRoleId }, data: { permissions: ["dashboard.read"] } })
    await expect(applyAccessRequest(f.reviewer, key(approved), f.session)).rejects.toBeDefined()
    await expect(listAccessRequests(f.reviewer, { queue: "review" })).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(await current(f)).toMatchObject({ application: "PENDING", revision: approved.revision })
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("rejects an expired reviewer session without revoking requester sessions", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    await observer.session.update({ where: { id: f.session.id }, data: { expiresAt: new Date(0) } })
    await expect(applyAccessRequest(f.reviewer, key(approved), f.session)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
    expect(await current(f)).toMatchObject({ application: "FAILED", applicationError: "FRESH_AUTH_REQUIRED" })
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("binds application to the decision reviewer even if another reviewer has the same authority", async () => {
    const f = await fixture(), userId = `ux-second-reviewer-${randomUUID()}`
    await observer.user.create({ data: { id: userId, organizationId: f.reviewer.orgId, email: `${userId}@ui-workflow.invalid`, firstName: "Synthetic", lastName: "Second", isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: f.reviewerRoleId } } } })
    const approved = await decideAccessRequest(f.reviewer, await proposed(f))
    await expect(applyAccessRequest({ ...f.reviewer, userId }, key(approved), f.session)).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(await current(f)).toMatchObject({ application: "PENDING", revision: approved.revision })
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("blocks new application when its flag is off while retaining applied status and history", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    process.env.ACCESS_REQUEST_APPLICATION_ENABLED = "false"
    await expect(applyAccessRequest(f.reviewer, key(approved), f.session)).rejects.toBeDefined()
    expect(await current(f)).toMatchObject({ application: "PENDING", revision: approved.revision })
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
    process.env.ACCESS_REQUEST_APPLICATION_ENABLED = "true"
    const applied = await applyAccessRequest(f.reviewer, key(approved), f.session)
    flags.forEach(flag => { process.env[flag] = "false" })
    expect(await current(f)).toMatchObject({ application: "APPLIED", revision: applied.revision })
    expect((await readAccessRequestHistory(f.requester, key(applied))).entries.some(entry => entry.action === "ACCESS_REQUEST_APPLIED")).toBe(true)
    expect(await accessRequestReturnPath(f.requester, applied.id)).toBe("/dashboard/inventory/items")
    await observer.user.update({ where: { id: f.requester.userId }, data: { roles: { disconnect: { id: f.roleId } } } })
    await expect(accessRequestReturnPath(f.requester, applied.id)).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(await current(f)).toMatchObject({ application: "APPLIED", revision: applied.revision })
  })
  it("rejects changed role contents after approval without granting newly added authority", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    await observer.role.update({ where: { id: f.roleId }, data: { permissions: ["inventory.items.read", "users.delete"] } })
    await expect(applyAccessRequest(f.reviewer, key(approved), f.session)).rejects.toBeDefined()
    expect(await current(f)).toMatchObject({ application: "FAILED", applicationError: "REVIEW_REQUIRED" })
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("expires pending work once and allows a fresh request", async () => {
    const f = await fixture(), request = await submit(f)
    await observer.$executeRaw`UPDATE access_requests SET "expiresAt" = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE id = ${request.id}`
    expect(await current(f)).toMatchObject({ decision: "EXPIRED", revision: request.revision + 1 })
    await current(f)
    expect(await db.auditLog.count({ where: { organizationId: f.requester.orgId, action: "ACCESS_REQUEST_EXPIRED" } })).toBe(1)
    expect((await submit(f)).id).not.toBe(request.id)
    expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
  })
  it("rejects foreign history, a cross-tenant requester FK and self-review", async () => {
    const f = await fixture(), other = await fixture(), request = await submit(f)
    await expect(readAccessRequestHistory(other.reviewer, key(request))).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(observer.$executeRaw`UPDATE access_requests SET "requesterId" = ${other.requester.userId} WHERE id = ${request.id}`).rejects.toBeDefined()
    await observer.user.update({ where: { id: f.requester.userId }, data: { roles: { connect: { id: f.reviewerRoleId } } } })
    await expect(previewAccessRequest({ ...f.requester, permissions: f.reviewer.permissions }, key(request))).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  it("rolls back role changes, member audit and session revocation when the final request audit fails", async () => {
    const f = await fixture(), approved = await decideAccessRequest(f.reviewer, await proposed(f))
    const trigger = `ux_access_${randomUUID().replaceAll("-", "")}`
    await observer.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${f.requester.orgId}' AND NEW.action = 'ACCESS_REQUEST_APPLIED' THEN RAISE EXCEPTION 'Synthetic request audit failure'; END IF; RETURN NEW; END $$`)
    await observer.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`)
    try {
      await expect(applyAccessRequest(f.reviewer, key(approved), f.session)).rejects.toBeDefined()
      expect(await effects(f)).toEqual({ granted: false, sessions: 1, grants: 0, applied: 0 })
      expect(await current(f)).toMatchObject({ application: "FAILED", applicationError: "RETRY_REQUIRED" })
    } finally {
      await observer.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON audit_logs`)
      await observer.$executeRawUnsafe(`DROP FUNCTION "${trigger}"()`)
    }
    expect(await applyAccessRequest(f.reviewer, key(await current(f)), f.session)).toMatchObject({ application: "APPLIED" })
    expect(await effects(f)).toEqual({ granted: true, sessions: 0, grants: 1, applied: 1 })
  })
})
