import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"
import { PrismaClient } from "@prisma/client"

jest.mock("server-only", () => ({}))
// Only client selection is replaced: services, authority and transactions are real.
jest.mock("@/prisma/db", () => {
  if (process.env.RUN_UI_WORKFLOW_POSTGRES !== "1") return { db: {} }
  const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
  const { PrismaClient: Client } = jest.requireActual("@prisma/client")
  return { db: new Client({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } }) }
})
import { db } from "@/prisma/db"
import { readAlertScanRecovery, recoverAlertScanPage, type AlertRecoveryActor } from "@/services/reconciliation/alert-scan-recovery.service"
import { hashReconciliationAlertScan, reconciliationAlertScanSchema, runReconciliationAlertScan, type ReconciliationAlertScan } from "@/services/reconciliation/payment-reconciliation-alert-scan.service"
import type { AlertRecoveryCommand } from "@/services/reconciliation/alert-scan-recovery.contracts"

const suite = process.env.RUN_UI_WORKFLOW_POSTGRES === "1" ? describe : describe.skip
const authority = ["payments.reconciliation.read", "payments.reconciliation.run"]
type Fixture = { actor: AlertRecoveryActor; roleId: string; scanId: string; rowId: string }
let observer: PrismaClient
const oldFlag = process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED

async function fixture(phase: ReconciliationAlertScan["phase"] = "SUSPENSE"): Promise<Fixture> {
  const suffix = randomUUID(), orgId = `ux-alert-${suffix}`, userId = `ux-operator-${suffix}`, roleId = `ux-role-${suffix}`, scanId = randomUUID()
  await db.organization.create({ data: { id: orgId, name: "Synthetic UI recovery test", slug: orgId, currency: "XAF" } })
  await db.role.create({ data: { id: roleId, organizationId: orgId, code: "TEST_RECOVERY", nameEn: "Test recovery", permissions: authority } })
  await db.user.create({ data: { id: userId, organizationId: orgId, email: `${suffix}@ui-workflow.invalid`, firstName: "Synthetic", lastName: "Operator", isActive: true, isVerified: true, emailVerified: true, mfaBackupCodes: [], roles: { connect: { id: roleId } } } })
  const session = await db.session.create({ data: { userId, token: `synthetic-${randomUUID()}`, expiresAt: new Date(Date.now() + 3600000) } })
  const now = new Date().toISOString()
  // Preserve the worker schema's serialization order for its historical hash.
  const scan = reconciliationAlertScanSchema.parse({ kind: "RECONCILIATION_ALERT_SCAN_V1", scanId, workerId: "test-host", state: "FAILED", phase, cursor: null, version: 4, examined: 0, created: 0, startedAt: now, updatedAt: now, completedAt: null, errorCode: "ALERT_SCAN_PAGE_FAILED" })
  const row = await db.paymentReconciliationInboxItem.create({ data: { organizationId: orgId, source: "RECONCILIATION_RUN", status: "PROCESSED", idempotencyKey: `operational-alert-scan:${scanId}`, payloadSummary: { worker: scan }, payloadHash: hashReconciliationAlertScan(scan), attempts: 4, lastError: scan.errorCode } })
  return { actor: { orgId, userId, permissions: authority, sessionId: session.id, sessionToken: session.token }, roleId, scanId, rowId: row.id }
}
async function command(f: Fixture): Promise<AlertRecoveryCommand> {
  const review = await readAlertScanRecovery(f.actor, { scanId: f.scanId })
  expect(review.reason).toBe("READY")
  return { scanId: f.scanId, commandId: randomUUID(), expectedRevision: review.revision! }
}
async function state(f: Fixture) { return db.paymentReconciliationInboxItem.findUniqueOrThrow({ where: { id: f.rowId } }) }
async function effects(f: Fixture) {
  const organizationId = f.actor.orgId
  return {
    notifications: await db.paymentReconciliationInboxItem.count({ where: { organizationId, id: { not: f.rowId } } }),
    events: await db.businessEvent.count({ where: { organizationId, eventType: "reconciliation.alert_scan.recovered" } }),
    audits: await db.auditLog.count({ where: { organizationId, action: "ALERT_SCAN_RECOVERY_PAGE" } }),
  }
}
// PostgreSQL must report both competitors waiting on distinct backend connections
// before the lock holder releases them. Two promises alone do not prove a race.
async function contend<T>(f: Fixture, tasks: () => Promise<T>[]) {
  let unlock!: () => void, locked!: () => void
  const release = new Promise<void>(resolve => { unlock = resolve })
  const ready = new Promise<void>(resolve => { locked = resolve })
  const holder = observer.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${f.actor.orgId} FOR UPDATE`
    locked(); await release
  }, { timeout: 12000 })
  await Promise.race([ready, holder.then(() => { throw new Error("Lock holder ended before readiness") })])
  const pending = Promise.allSettled(tasks())
  try {
    const deadline = Date.now() + 2500
    let waiting = 0
    while (Date.now() < deadline) {
      const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(DISTINCT pid) AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FROM organizations%FOR %'`
      waiting = Number(rows[0].count)
      if (waiting >= 2) break
      await delay(20)
    }
    expect(waiting).toBeGreaterThanOrEqual(2)
  } finally { unlock(); await holder }
  return pending
}

suite("UI workflow alert recovery on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const { resolveWorkflowTestTarget } = require("../../../scripts/ui-workflow-postgres-target.cjs")
    observer = new PrismaClient({ datasources: { db: { url: resolveWorkflowTestTarget(process.env.UI_WORKFLOW_POSTGRES_DATABASE).toString() } } })
    const identity = await observer.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    expect(identity[0].name).toBe(process.env.UI_WORKFLOW_POSTGRES_DATABASE)
  })
  beforeEach(() => { process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED = "true" })
  afterAll(async () => {
    if (oldFlag === undefined) delete process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED
    else process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED = oldFlag
    await Promise.all([db.$disconnect(), observer?.$disconnect()])
  })
  it("serializes identical operator commands into one committed page and receipt", async () => {
    const f = await fixture(), c = await command(f)
    const results = await contend(f, () => [recoverAlertScanPage(f.actor, c), recoverAlertScanPage(f.actor, c)])
    expect(results.every(result => result.status === "fulfilled")).toBe(true)
    const receipts = results.map(result => result.status === "fulfilled" ? result.value.receipt : null)
    expect(receipts[0]).toEqual(receipts[1])
    expect((await state(f)).attempts).toBe(5)
    expect(await effects(f)).toEqual({ notifications: 0, events: 1, audits: 1 })
  })
  it("rejects the competing new command at the old checkpoint revision", async () => {
    const f = await fixture(), c = await command(f)
    const results = await contend(f, () => [recoverAlertScanPage(f.actor, c), recoverAlertScanPage(f.actor, { ...c, commandId: randomUUID() })])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } })
    expect((await state(f)).attempts).toBe(5)
    expect(await effects(f)).toEqual({ notifications: 0, events: 1, audits: 1 })
  })
  it("serializes host worker and operator without a lost checkpoint or deadlock", async () => {
    const f = await fixture(), c = await command(f)
    const results = await contend<unknown>(f, () => [
      runReconciliationAlertScan({ organizationId: f.actor.orgId, scanId: f.scanId, workerId: "test-worker", maxPages: 1 }),
      recoverAlertScanPage(f.actor, c),
    ])
    expect(results[0].status).toBe("fulfilled")
    if (results[1].status === "rejected") expect(results[1].reason).toMatchObject({ code: "CONFLICT" })
    const row = await state(f), scan = (row.payloadSummary as { worker: ReconciliationAlertScan }).worker
    const operatorCommitted = results[1].status === "fulfilled"
    expect(scan.version).toBe(operatorCommitted ? 6 : 5)
    expect(row.attempts).toBe(scan.version)
    expect(scan.phase).toBe(operatorCommitted ? "REVIEW" : "READY_RUNS")
    expect((await effects(f)).events).toBe(Number(operatorCommitted))
  })
  it("records one observation, preserves source evidence and resolves a lost response after flag-off", async () => {
    const f = await fixture("REVIEW")
    const evidence = await db.paymentException.create({ data: { organizationId: f.actor.orgId, type: "AMOUNT_MISMATCH", severity: "HIGH", status: "OPEN" } })
    const c = await command(f), result = await recoverAlertScanPage(f.actor, c)
    expect(result.receipt).toMatchObject({ state: "COMPLETE", fromVersion: 4, toVersion: 5 })
    delete process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED
    expect((await readAlertScanRecovery(f.actor, { scanId: f.scanId, command: c })).receipt).toEqual(result.receipt)
    expect((await recoverAlertScanPage(f.actor, c)).receipt).toEqual(result.receipt)
    expect(await effects(f)).toEqual({ notifications: 1, events: 1, audits: 1 })
    expect(await db.paymentException.findUnique({ where: { id: evidence.id } })).toEqual(evidence)
    expect(await db.paymentTransaction.count({ where: { organizationId: f.actor.orgId } })).toBe(0)
    expect(await db.journalEntry.count({ where: { organizationId: f.actor.orgId } })).toBe(0)
    expect(await db.businessEventOutbox.count({ where: { organizationId: f.actor.orgId } })).toBe(0)
  })
  it("rolls back observation, checkpoint and receipt when the final audit insert fails", async () => {
    const f = await fixture("REVIEW")
    await db.paymentException.create({ data: { organizationId: f.actor.orgId, type: "AMOUNT_MISMATCH" } })
    const c = await command(f), before = await state(f)
    const trigger = `ux_recovery_${randomUUID().replaceAll("-", "")}`
    // Only generated names/IDs enter DDL, and only on the guarded test database.
    await observer.$executeRawUnsafe(`CREATE FUNCTION "${trigger}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${f.actor.orgId}' AND NEW.action = 'ALERT_SCAN_RECOVERY_PAGE' THEN RAISE EXCEPTION 'Synthetic final-audit failure'; END IF; RETURN NEW; END $$`)
    await observer.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION "${trigger}"()`)
    try {
      await expect(recoverAlertScanPage(f.actor, c)).rejects.toBeDefined()
      expect(await state(f)).toEqual(before)
      expect(await effects(f)).toEqual({ notifications: 0, events: 0, audits: 0 })
    } finally {
      await observer.$executeRawUnsafe(`DROP TRIGGER "${trigger}" ON audit_logs`)
      await observer.$executeRawUnsafe(`DROP FUNCTION "${trigger}"()`)
    }
    expect((await recoverAlertScanPage(f.actor, c)).receipt?.toVersion).toBe(5)
    expect(await effects(f)).toEqual({ notifications: 1, events: 1, audits: 1 })
  })
  it.each(["role", "session", "module"])("checks stored %s authority before advancement", async kind => {
    const f = await fixture(), c = await command(f), before = await state(f)
    if (kind === "role") await observer.role.update({ where: { id: f.roleId }, data: { permissions: [] } })
    if (kind === "session") await observer.session.update({ where: { id: f.actor.sessionId }, data: { expiresAt: new Date(0) } })
    if (kind === "module") await observer.tenantModuleConfiguration.create({ data: { organizationId: f.actor.orgId, manifestHash: "synthetic-empty-grants" } })
    await expect(recoverAlertScanPage(f.actor, c)).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(await state(f)).toEqual(before)
    expect((await effects(f)).events).toBe(0)
  })
  it.each(["lease", "hash"])("escalates unexpected %s evidence without mutating it", async kind => {
    const f = await fixture(), c = await command(f)
    await db.paymentReconciliationInboxItem.update({ where: { id: f.rowId }, data: kind === "lease" ? { leaseToken: "synthetic-unexpected-lease", leasedBy: "test-worker" } : { payloadHash: "corrupt" } })
    const before = await state(f)
    expect(await readAlertScanRecovery(f.actor, { scanId: f.scanId })).toMatchObject({ reason: "ESCALATE", progress: null, eligible: false })
    await expect(recoverAlertScanPage(f.actor, c)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
    expect(await state(f)).toEqual(before)
  })
  it("scopes scan lookup and command receipts to current tenant and authority", async () => {
    const f = await fixture(), other = await fixture(), c = await command(f)
    await recoverAlertScanPage(f.actor, c)
    await expect(readAlertScanRecovery(other.actor, { scanId: f.scanId, command: c })).rejects.toMatchObject({ code: "NOT_FOUND" })
    await observer.role.update({ where: { id: f.roleId }, data: { permissions: [] } })
    await expect(readAlertScanRecovery(f.actor, { scanId: f.scanId, command: c })).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
})
