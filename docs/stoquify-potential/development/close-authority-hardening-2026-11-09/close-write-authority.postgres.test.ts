/** @jest-environment node */
// Real helper + real PostgreSQL. Only the DB module location is adapted to the
// explicit private generated client; authority/module/permission logic is real.
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { Client } from "pg"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { lockCloseWriteAuthorityInTx, type CloseWriteOperation } from "@/services/accounting/close-evidence-acceptance-authority.service"
import { readCloseAssessmentPublicationTimeInTx } from "@/services/accounting/close-assessment-order.service"

const url = new URL(process.env.CLOSE_WRITE_POSTGRES_URL || "")
if (url.hostname !== "localhost" || url.pathname !== "/" + process.env.CLOSE_WRITE_DATABASE_NAME || !/^\/stoquify_replay_close_authority_20261109_[a-f0-9]{10}$/.test(url.pathname) || url.searchParams.get("schema") !== "public") throw Error("Explicit new owned close authority database required")
const ACTION = "CLOSE_WRITE_AUTHORITY_QUALIFICATION_PROBE", run = crypto.randomBytes(5).toString("hex")
const operations: Record<CloseWriteOperation, string> = { assessment: "accounting.close.run", assign: "accounting.close.finding.assign", comment: "accounting.close.finding.comment", "waiver-request": "accounting.close.waiver.request", "waiver-approve": "accounting.close.waiver.approve", review: "accounting.close.accountant.review", "draft-export": "accounting.close.export", "certified-export": "accounting.close.certify" }
const permissions = ["accounting.close.read", ...Object.values(operations)]
const evidence: Array<Record<string, unknown>> = []
let counter = 0
const gate = () => { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve }); return { promise, release } }
const wait = <T,>(promise: Promise<T>, message: string) => {
  let timer: ReturnType<typeof setTimeout>; return Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error(message)), 18000) })]).finally(() => clearTimeout(timer))
}
const outcome = <T,>(promise: Promise<T>) => promise.then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }))
async function connection(name: string) {
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5000, application_name: name })
  await client.connect(); return client
}
async function identity(client: { query: Function }) {
  const row = (await client.query("SELECT current_database() AS name,current_user AS actor,host(inet_server_addr()) AS host,inet_server_port() AS port,current_setting('data_directory') AS directory")).rows[0]
  expect(row.name).toBe(process.env.CLOSE_WRITE_DATABASE_NAME); expect(row.actor).toBe("sales_release_fixture"); expect(row.host).toBe("127.0.0.1"); expect(row.port).toBe(Number(url.port))
  expect(fs.realpathSync(row.directory).toLowerCase()).toBe(fs.realpathSync(path.join(process.env.CLOSE_WRITE_CLUSTER_DIRECTORY!, "data")).toLowerCase())
}
async function fixture(assuranceRemainingMs = 300000) {
  const id = `cw-${run}-${++counter}`, org = id + "-org", user = id + "-user", role = id + "-role"
  await db.organization.create({ data: { id: org, name: "Synthetic close authority proof", slug: id, requestedModules: ["accounting", "close_assurance"] } })
  await db.tenantModuleConfiguration.create({ data: { organizationId: org, manifestHash: "sha256:" + "a".repeat(64), selectedModules: ["accounting", "close_assurance"], activeModules: ["accounting", "close_assurance"] } })
  await db.tenantModuleGrant.createMany({ data: ["accounting", "close_assurance"].map(moduleSlug => ({ id: id + "-" + moduleSlug, organizationId: org, moduleSlug, status: "active", source: "manual_override" })) })
  await db.role.create({ data: { id: role, organizationId: org, code: id, nameEn: "Synthetic authority role", permissions } })
  await db.user.create({ data: { id: user, organizationId: org, email: id + "@example.invalid", emailVerified: true, roles: { connect: { id: role } } } })
  const now = (await db.$queryRaw<Array<{ now: Date }>>(Prisma.sql`SELECT clock_timestamp() AS now`))[0].now
  const session = await db.session.create({ data: { userId: user, token: "cw_session_" + crypto.randomBytes(32).toString("hex"), expiresAt: new Date(now.getTime() + 3600000), assuranceVerifiedAt: new Date(now.getTime() - 300000 + assuranceRemainingMs), assuranceMethod: "password", assuranceOrganizationId: org, assuranceLevel: 1 } })
  return { id, org, user, role, session, actor: { homeOrganizationId: org, organizationId: org, actorId: user, session: { id: session.id, token: session.token } } }
}
type Fixture = Awaited<ReturnType<typeof fixture>>
async function marker(tx: Prisma.TransactionClient, f: Fixture, label: string) {
  return tx.ledgerAuditEvent.create({ data: { organizationId: f.org, actorId: f.user, action: ACTION, resourceType: "IsolatedAuthorityProbe", resourceId: f.id, message: label, metadata: { qualificationOnly: true, label } } })
}
const markerCount = (f: Fixture) => db.ledgerAuditEvent.count({ where: { organizationId: f.org, action: ACTION } })
async function write(f: Fixture, operation: CloseWriteOperation, input = f.actor) {
  return db.$transaction(async tx => { const authority = await lockCloseWriteAuthorityInTx(tx, input, operation); await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx)); return marker(tx, f, operation) }, { isolationLevel: "ReadCommitted", timeout: 25000, maxWait: 5000 })
}
async function observedWait(control: Client, waiter: number, blocker: number, name: string) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const row = (await control.query("SELECT wait_event_type='Lock' AS waiting,$2::int=ANY(pg_blocking_pids(pid)) AS blocked_by_owner FROM pg_stat_activity WHERE pid=$1 AND datname=$3 AND usename='sales_release_fixture' AND application_name=$4", [waiter, blocker, process.env.CLOSE_WRITE_DATABASE_NAME, name])).rows[0]
    if (row?.waiting && row.blocked_by_owner) return { waiterPid: waiter, blockerPid: blocker, exactBlockingPidObserved: true }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw Error("Expected exact owned PostgreSQL lock wait was not observed")
}
beforeAll(async () => { const client = await connection("close-authority-identity"); try { await identity(client) } finally { await client.end() } })
afterAll(async () => {
  try {
    const counts = { closeRuns: await db.closeRun.count(), exports: await db.closePackExport.count(), journals: await db.journalEntry.count(), sales: await db.salesOrder.count(), settlements: await db.customerSettlement.count() }
    expect(Object.values(counts).every(count => count === 0)).toBe(true)
    fs.writeFileSync(process.env.CLOSE_WRITE_PROBE_EVIDENCE!, JSON.stringify({ database: process.env.CLOSE_WRITE_DATABASE_NAME, checks: evidence, noFinancialOrCertificationRecords: counts, limitation: "Real isolated helper/module/session/role/row-lock proof; audit markers only. No real login, close pack, certification, provider or application journey." }, null, 2) + "\n")
  } finally { await db.$disconnect() }
})

it.each(Object.keys(operations) as CloseWriteOperation[])("permits current persisted authority for %s and commits one probe marker", async operation => {
  const f = await fixture(); await write(f, operation); expect(await markerCount(f)).toBe(1); evidence.push({ name: "allow", operation, markers: 1 })
})
it.each(Object.keys(operations) as CloseWriteOperation[])("denies missing exact %s permission before a probe marker", async operation => {
  const f = await fixture(); await db.role.update({ where: { id: f.role }, data: { permissions: permissions.filter(permission => permission !== operations[operation]) } })
  await expect(write(f, operation)).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(await markerCount(f)).toBe(0); evidence.push({ name: "missing-permission", operation, markers: 0 })
})
const denials = ["missing-session", "missing-session-assessment", "wrong-token", "foreign-session", "revoked-session", "expired-session", "foreign-actor", "inactive-actor", "locked-actor", "inactive-organization", "foreign-organization", "suspended-close", "read-only-close", "suspended-accounting", "expired-assurance", "wrong-assurance-method", "wrong-assurance-organization", "locked-assurance", "insufficient-assurance"] as const
it.each(denials)("denies persisted %s without financial or probe effects", async kind => {
  const f = await fixture(); let actor = f.actor, code = "FORBIDDEN"
  if (kind === "missing-session") { actor = { ...actor, session: null as never }; code = "FRESH_AUTH_REQUIRED" }
  if (kind === "missing-session-assessment") { actor = { ...actor, session: null as never }; code = "AUTH_REQUIRED" }
  if (kind === "wrong-token") { actor = { ...actor, session: { ...actor.session, token: "cw_session_" + "0".repeat(64) } }; code = "FRESH_AUTH_REQUIRED" }
  if (kind === "foreign-session") { const other = await fixture(); actor = { ...actor, session: other.actor.session }; code = "FRESH_AUTH_REQUIRED" }
  if (kind === "revoked-session") { await db.session.delete({ where: { id: f.session.id } }); code = "FRESH_AUTH_REQUIRED" }
  if (kind === "expired-session") { await db.session.update({ where: { id: f.session.id }, data: { expiresAt: new Date(Date.now() - 60000) } }); code = "FRESH_AUTH_REQUIRED" }
  if (kind === "foreign-actor") { const other = await fixture(); actor = { ...actor, actorId: other.user }; code = "FORBIDDEN" }
  if (kind === "inactive-actor") await db.user.update({ where: { id: f.user }, data: { isActive: false } })
  if (kind === "locked-actor") await db.user.update({ where: { id: f.user }, data: { isLocked: true } })
  if (kind === "inactive-organization") await db.organization.update({ where: { id: f.org }, data: { isActive: false } })
  if (kind === "foreign-organization") { const other = await fixture(); actor = { ...actor, organizationId: other.org } }
  if (kind === "suspended-close") await db.tenantModuleGrant.update({ where: { id: f.id + "-close_assurance" }, data: { status: "suspended" } })
  if (kind === "read-only-close") await db.tenantModuleGrant.update({ where: { id: f.id + "-close_assurance" }, data: { readOnly: true, status: "read_only" } })
  if (kind === "suspended-accounting") await db.tenantModuleGrant.update({ where: { id: f.id + "-accounting" }, data: { status: "suspended" } })
  if (kind === "expired-assurance") { await db.session.update({ where: { id: f.session.id }, data: { assuranceVerifiedAt: new Date(Date.now() - 301000) } }); code = "FRESH_AUTH_REQUIRED" }
  if (kind === "wrong-assurance-method") { await db.session.update({ where: { id: f.session.id }, data: { assuranceMethod: "different" } }); code = "FRESH_AUTH_REQUIRED" }
  if (kind === "wrong-assurance-organization") { await db.session.update({ where: { id: f.session.id }, data: { assuranceOrganizationId: f.org + "-foreign" } }); code = "FRESH_AUTH_REQUIRED" }
  if (kind === "locked-assurance") { await db.session.update({ where: { id: f.session.id }, data: { assuranceLockedUntil: new Date(Date.now() + 60000) } }); code = "FRESH_AUTH_REQUIRED" }
  if (kind === "insufficient-assurance") { await db.session.update({ where: { id: f.session.id }, data: { assuranceLevel: 0 } }); code = "FRESH_AUTH_REQUIRED" }
  await expect(write(f, kind === "missing-session-assessment" ? "assessment" : "certified-export", actor)).rejects.toMatchObject({ code }); expect(await markerCount(f)).toBe(0); evidence.push({ name: kind, errorCode: code, markers: 0, committedRestrictionBeforeAcquisition: true })
})

async function heldRevocation(kind: "session" | "role" | "module", rollback = false) {
  const f = await fixture(), held = gate(), finish = gate(), name = `close-authority-${run}-${counter}-${kind}`
  const revoker = await connection(name), control = await connection(name + "-control")
  let ownerPid = 0, waiting: Record<string, unknown> | undefined
  const owner = outcome(db.$transaction(async tx => {
    ownerPid = (await tx.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pg_backend_pid() AS pid`))[0].pid
    const authority = await lockCloseWriteAuthorityInTx(tx, f.actor, "certified-export"); held.release(); await finish.promise
    await authority.revalidate(await readCloseAssessmentPublicationTimeInTx(tx)); await marker(tx, f, rollback ? "rollback-probe" : "held-owner-commit")
    if (rollback) throw Error("Injected owned probe rollback")
  }, { isolationLevel: "ReadCommitted", timeout: 25000, maxWait: 5000 }))
  let restrict: ReturnType<typeof outcome> | undefined
  try {
    await wait(held.promise, "Authority owner did not acquire"); await revoker.query("BEGIN"); await revoker.query("SET LOCAL lock_timeout='18s'")
    const revokerPid = (await revoker.query("SELECT pg_backend_pid() AS pid")).rows[0].pid
    restrict = outcome((async () => {
      if (kind === "session") await revoker.query('DELETE FROM sessions WHERE id=$1 AND "userId"=$2 AND token=$3', [f.session.id, f.user, f.session.token])
      if (kind === "role") await revoker.query('UPDATE roles SET permissions=ARRAY[]::text[] WHERE id=$1 AND "organizationId"=$2', [f.role, f.org])
      if (kind === "module") await revoker.query('UPDATE tenant_module_grants SET status=$1 WHERE id=$2 AND "organizationId"=$3', ["suspended", f.id + "-close_assurance", f.org])
      await revoker.query("COMMIT")
    })())
    waiting = await observedWait(control, revokerPid, ownerPid, name); expect(await markerCount(f)).toBe(0); finish.release()
    const [written, restricted] = await Promise.all([wait(owner, "Owner did not finish"), wait(restrict, "Revoker did not finish")]); expect(restricted.ok).toBe(true)
    expect(written.ok).toBe(!rollback); if (!written.ok) expect(written.error.message).toBe("Injected owned probe rollback")
    expect(await markerCount(f)).toBe(rollback ? 0 : 1)
    await expect(write(f, "certified-export")).rejects.toMatchObject({ code: kind === "session" ? "FRESH_AUTH_REQUIRED" : "FORBIDDEN" })
    evidence.push({ name: "held-authority-revocation-order", kind, ...waiting, ownerCommitted: !rollback, ownerRolledBack: rollback, markerCount: rollback ? 0 : 1, subsequentAuthorityDenied: true })
  } finally {
    finish.release(); await wait(owner, "Owned authority cleanup timed out").catch(() => {}); if (restrict) await wait(restrict, "Revoker cleanup timed out").catch(() => {})
    await revoker.query("ROLLBACK").catch(() => {}); await Promise.all([revoker.end(), control.end()])
  }
}
it.each(["session", "role", "module"] as const)("retains authority locks until marker commit before competing %s revocation", kind => heldRevocation(kind))
it("releases authority locks after rollback without retaining an audit probe effect", () => heldRevocation("session", true))
it("denies assurance that actually expires during an observed later business-lock wait", async () => {
  const f = await fixture(6000), name = `close-authority-${run}-${counter}-expiry`, blocker = await connection(name + "-blocker"), control = await connection(name + "-control"), acquired = gate()
  const key = f.id + "-synthetic-business-lock"; let pid = 0, afterWaitAgeMs = 0
  await blocker.query("BEGIN"); await blocker.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [key])
  const blockerPid = (await blocker.query("SELECT pg_backend_pid() AS pid")).rows[0].pid
  const pending = outcome(db.$transaction(async tx => {
    await tx.$executeRaw(Prisma.sql`SELECT set_config('application_name', ${name}, true)`)
    pid = (await tx.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pg_backend_pid() AS pid`))[0].pid
    const authority = await lockCloseWriteAuthorityInTx(tx, f.actor, "certified-export"); acquired.release()
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))::text`)
    const now = await readCloseAssessmentPublicationTimeInTx(tx); afterWaitAgeMs = now.getTime() - f.session.assuranceVerifiedAt!.getTime()
    await authority.revalidate(now); await marker(tx, f, "must-not-commit-expired-assurance")
  }, { isolationLevel: "ReadCommitted", timeout: 25000, maxWait: 5000 }))
  try {
    await wait(acquired.promise, "Expiry authority did not acquire"); const waiting = await observedWait(control, pid, blockerPid, name)
    await control.query("SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM ($1::timestamptz+interval '300 seconds'-clock_timestamp()))+0.05))", [f.session.assuranceVerifiedAt])
    await blocker.query("COMMIT"); const completed = await wait(pending, "Expiry proof did not finish"); expect(completed.ok).toBe(false)
    if (!completed.ok) expect(completed.error).toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
    expect(afterWaitAgeMs).toBeGreaterThan(300000); expect(await markerCount(f)).toBe(0)
    evidence.push({ name: "real-expiry-after-business-lock-wait", ...waiting, assuranceAgeMsAfterWait: afterWaitAgeMs, usedRealDatabaseClock: true, markers: 0 })
  } finally { await blocker.query("ROLLBACK").catch(() => {}); await wait(pending, "Expiry cleanup timed out").catch(() => {}); await Promise.all([blocker.end(), control.end()]) }
})
