import { Prisma, PrismaClient } from "@prisma/client"
import { db } from "@/prisma/db"
import { lockCloseAssessmentOrderInTx } from "@/services/accounting/close-assessment-order.service"
import { lockCloseSourceRevisionInTx, guardCloseAssessmentPublicationInTx, closeSourceRevisionMatches, type CloseSourceRevision } from "@/services/accounting/close-source-revision.service"
jest.mock("@/prisma/db", () => {
  const { closeScopeTestTarget } = require("../../../scripts/close-scope-postgres-target.cjs")
  const { PrismaClient } = require("@prisma/client")
  return { db: new PrismaClient({ datasources: { db: { url: closeScopeTestTarget().url.toString() } } }) }
})
const client = db as PrismaClient
let sequence = 0, org: string, periodId: string, accountId: string
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
const txOptions = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000, maxWait: 10000 }
beforeEach(async () => {
  const identity = await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  expect(identity[0].name).toMatch(/^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/)
  org = `publication-${++sequence}`; periodId = `${org}-sep`; accountId = `${org}-account`
  await client.organization.create({ data: { id: org, name: "Synthetic publication", slug: org } })
  await client.fiscalYear.create({ data: { id: `${org}-fy`, organizationId: org, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  await client.accountingPeriod.create({ data: { id: periodId, organizationId: org, fiscalYearId: `${org}-fy`, periodNumber: 9, name: "September", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30T23:59:59.999Z") } })
  await client.paymentRail.create({ data: { id: `${org}-rail`, organizationId: org, code: "TEST", name: "Test", type: "BANK_TRANSFER" } })
  await client.providerAccount.create({ data: { id: accountId, organizationId: org, paymentRailId: `${org}-rail`, providerCode: "TEST", displayName: "Original", externalAccountHash: org } })
})
afterAll(async () => { await client.$disconnect() })
async function begin(id = `${org}-run`, createdAt = new Date()) {
  return client.$transaction(async tx => {
    await lockCloseAssessmentOrderInTx(tx, org, periodId)
    const sourceRevision = await lockCloseSourceRevisionInTx(tx, org)
    const run = await tx.closeRun.create({ data: { id, organizationId: org, periodId, status: "RUNNING", createdAt, metadata: { sourceRevision, retained: "original evidence" } } })
    return { run, sourceRevision }
  }, txOptions)
}
async function publish(id: string, revision: CloseSourceRevision) {
  return client.$transaction(async tx => {
    if (!await guardCloseAssessmentPublicationInTx(tx, { organizationId: org, periodId, runId: id, sourceRevision: revision })) return false
    return (await tx.closeRun.updateMany({ where: { id, organizationId: org, status: "RUNNING" }, data: { status: "READY" } })).count === 1
  }, txOptions)
}
async function waitForLock(pid: number) {
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    const [row] = await client.$queryRaw<Array<{ wait: string | null }>>(Prisma.sql`SELECT wait_event_type AS wait FROM pg_stat_activity WHERE pid = ${pid}`)
    if (row?.wait === "Lock") return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error("Contender did not reach the expected PostgreSQL lock")
}

it("blocks publication when a direct source write commits during collection, retaining change provenance", async () => {
  const { run, sourceRevision } = await begin()
  await client.providerAccount.update({ where: { id: accountId }, data: { displayName: "Changed without an application hook" } })
  expect(await publish(run.id, sourceRevision)).toBe(false)
  const retained = await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })
  expect(retained.status).toBe("BLOCKED")
  expect(retained.metadata).toMatchObject({ retained: "original evidence", staleState: { sourceTable: "provider_accounts", sourceCode: "CLOSE_SOURCE_REVISION_CHANGED" } })
  expect(await client.closeSourceChange.count({ where: { organizationId: org, sourceTable: "provider_accounts", operation: "UPDATE" } })).toBe(1)
})

it("publishes only the latest unambiguous assessment", async () => {
  const first = await begin(`${org}-old`, new Date("2026-10-01"))
  const latest = await begin(`${org}-new`, new Date("2026-10-02"))
  expect(await publish(first.run.id, first.sourceRevision)).toBe(false)
  expect(await publish(latest.run.id, latest.sourceRevision)).toBe(true)
  await begin(`${org}-tie`, new Date("2026-10-02"))
  expect(await publish(latest.run.id, latest.sourceRevision)).toBe(false)
})

it("source rollback rolls back its revision, invalidation and retained change record", async () => {
  const { run, sourceRevision } = await begin()
  await expect(client.$transaction(async tx => {
    await tx.providerAccount.update({ where: { id: accountId }, data: { displayName: "Will roll back" } })
    throw new Error("injected rollback")
  }, txOptions)).rejects.toThrow("injected rollback")
  expect(await publish(run.id, sourceRevision)).toBe(true)
  expect(await client.closeSourceChange.count({ where: { organizationId: org, operation: "UPDATE" } })).toBe(0)
})

it("a source writer waits behind publication and then invalidates the committed result", async () => {
  const { run, sourceRevision } = await begin()
  const locked = deferred(), release = deferred(), writerStarted = deferred(); let writerPid = 0
  const publisher = client.$transaction(async tx => {
    expect(await guardCloseAssessmentPublicationInTx(tx, { organizationId: org, periodId, runId: run.id, sourceRevision })).toBe(true)
    locked.resolve(); await release.promise
    await tx.closeRun.update({ where: { id: run.id }, data: { status: "READY" } })
  }, txOptions)
  await locked.promise
  const writer = client.$transaction(async tx => {
    const [pid] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`
    writerPid = pid.pid; writerStarted.resolve()
    await tx.providerAccount.update({ where: { id: accountId }, data: { displayName: "After publication" } })
  }, txOptions)
  try { await writerStarted.promise; await waitForLock(writerPid) } finally { release.resolve() }
  await Promise.all([publisher, writer])
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
})

it("a certifier waiting behind a source commit reads the new revision, not its earlier snapshot", async () => {
  const { run, sourceRevision } = await begin(); expect(await publish(run.id, sourceRevision)).toBe(true)
  const changed = deferred(), release = deferred(), certifierStarted = deferred(); let pid = 0
  const writer = client.$transaction(async tx => {
    await tx.providerAccount.update({ where: { id: accountId }, data: { displayName: "Before certification" } })
    changed.resolve(); await release.promise
  }, txOptions)
  await changed.promise
  const certifier = client.$transaction(async tx => {
    // Establish a read before waiting, reproducing the stale-snapshot hazard.
    await tx.closeRun.findUnique({ where: { id: run.id } })
    const [backend] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`
    pid = backend.pid; certifierStarted.resolve()
    const current = await lockCloseSourceRevisionInTx(tx, org)
    const refreshed = await tx.closeRun.findUniqueOrThrow({ where: { id: run.id } })
    return { matches: closeSourceRevisionMatches(refreshed.metadata, current), status: refreshed.status }
  }, txOptions)
  try { await certifierStarted.promise; await waitForLock(pid) } finally { release.resolve() }
  const [, result] = await Promise.all([writer, certifier])
  expect(result).toEqual({ matches: false, status: "BLOCKED" })
})

it("invalidates every retained certified export without rewriting its certificate hash", async () => {
  const { run, sourceRevision } = await begin(); expect(await publish(run.id, sourceRevision)).toBe(true)
  for (const suffix of ["one", "two"]) await client.closePackExport.create({ data: { organizationId: org, periodId, closeRunId: run.id, fileType: "json", watermarkId: `${org}-${suffix}`, contentHash: suffix, rowCount: 1, isCertified: true, metadata: { original: suffix } } })
  await client.providerAccount.delete({ where: { id: accountId } })
  const exports = await client.closePackExport.findMany({ where: { closeRunId: run.id }, orderBy: { contentHash: "asc" } })
  expect(exports.map(row => row.contentHash)).toEqual(["one", "two"])
  for (const row of exports) expect(row.metadata).toMatchObject({ original: row.contentHash, staleState: { status: "EVIDENCE_STALE", operation: "DELETE" } })
})

it("invalidates pilot certification evidence but does not self-invalidate for ordinary audit records", async () => {
  const { run, sourceRevision } = await begin()
  await client.auditLog.create({ data: { organizationId: org, entityType: "CloseRun", entityId: run.id, action: "CLOSE_ASSESSMENT_COMPLETED" } })
  expect(await publish(run.id, sourceRevision)).toBe(true)
  await client.auditLog.create({ data: { organizationId: org, entityType: "PayrollPilotCycleCertification", entityId: `${org}-payroll`, action: "PAYROLL_PILOT_CYCLE_CERTIFICATION_EVALUATED", changes: { status: "BLOCKED" } } })
  const retained = await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })
  expect(retained.status).toBe("BLOCKED")
  expect(retained.metadata).toMatchObject({ staleState: { sourceTable: "audit_logs" } })
  expect(await publish(run.id, sourceRevision)).toBe(false)
})

it("does not invalidate itself for close audit events, but does for failed close events", async () => {
  const { run, sourceRevision } = await begin()
  const event = await client.businessEvent.create({ data: { organizationId: org, eventType: "close.assurance.run.completed", eventSource: "SYSTEM", idempotencyKey: org, payloadHash: org, payload: {}, occurredAt: new Date() } })
  expect(await publish(run.id, sourceRevision)).toBe(true)
  await client.businessEvent.update({ where: { id: event.id }, data: { status: "FAILED" } })
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("BLOCKED")
})

it("refuses snapshot isolation at the publication barrier", async () => {
  await expect(client.$transaction(tx => lockCloseSourceRevisionInTx(tx, org), { isolationLevel: "RepeatableRead" })).rejects.toThrow("Read Committed")
})

it("resolves tenant ownership for inventory and count-line sources without their own organization column", async () => {
  const item = await client.item.create({ data: { organizationId: org, sku: org, slug: org, nameEn: "Synthetic item", imageUrls: [] } })
  const location = await client.location.create({ data: { organizationId: org, name: "Synthetic store", code: org } })
  const count = await client.stockCountSession.create({ data: { organizationId: org, locationId: location.id, countNumber: org } })
  const first = await begin()
  await client.inventoryLevel.create({ data: { itemId: item.id, locationId: location.id, quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0, quantityInTransit: 0, quantityOnOrder: 0, averageCost: 0 } })
  expect(await publish(first.run.id, first.sourceRevision)).toBe(false)
  const second = await begin(`${org}-count-run`)
  await client.stockCountLine.create({ data: { stockCountSessionId: count.id, itemId: item.id, locationId: location.id, systemQuantity: 0 } })
  expect(await publish(second.run.id, second.sourceRevision)).toBe(false)
  expect(await client.closeSourceChange.count({ where: { organizationId: org, sourceTable: { in: ["inventory_levels", "stock_count_lines"] } } })).toBe(2)
})

it("keeps other tenants untouched and invalidates all periods of the changed tenant", async () => {
  const { run, sourceRevision } = await begin(); expect(await publish(run.id, sourceRevision)).toBe(true)
  const foreign = `${org}-foreign`
  await client.organization.create({ data: { id: foreign, name: "Other tenant", slug: foreign } })
  await client.organization.update({ where: { id: foreign }, data: { currency: "USD" } })
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe("READY")
  await client.accountingPeriod.create({ data: { id: `${org}-oct`, organizationId: org, fiscalYearId: `${org}-fy`, periodNumber: 10, name: "October", startDate: new Date("2026-10-01"), endDate: new Date("2026-10-31") } })
  await client.closeRun.create({ data: { id: `${org}-later`, organizationId: org, periodId: `${org}-oct`, status: "READY" } })
  await client.providerAccount.update({ where: { id: accountId }, data: { status: "ARCHIVED" } })
  expect((await client.closeRun.findMany({ where: { organizationId: org } })).every(row => row.status === "BLOCKED")).toBe(true)
})
