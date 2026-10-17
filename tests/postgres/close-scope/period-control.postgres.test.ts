import { Prisma, PrismaClient } from "@prisma/client"
import { db } from "@/prisma/db"
import { closeAccountingPeriod } from "@/services/accounting/periods.service"
import { reopenAccountingPeriod } from "@/services/accounting/period-control.service"
import { lockCloseSourceRevisionInTx } from "@/services/accounting/close-source-revision.service"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
jest.mock("@/prisma/db", () => {
  const { closeScopeTestTarget } = require("../../../scripts/close-scope-postgres-target.cjs")
  const { PrismaClient } = require("@prisma/client")
  const target = closeScopeTestTarget().url
  target.searchParams.set("connection_limit", "4")
  return { db: new PrismaClient({ datasources: { db: { url: target.toString() } } }) }
})
const client = db as PrismaClient
let sequence = 0, org: string, periodId: string, actor: string, runId: string
const hash = "sha256:" + "a".repeat(64)
const options = { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 20000, maxWait: 10000 }
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done }); return { promise, resolve } }
beforeAll(async () => {
  const [migration] = await client.$queryRaw<Array<{ checksum: string }>>`SELECT checksum FROM _prisma_migrations WHERE migration_name = '20261017090000_period_close_control' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`
  expect(migration?.checksum).toBe(createHash("sha256").update(readFileSync("prisma/migrations/20261017090000_period_close_control/migration.sql")).digest("hex"))
})
// Keep cold connection acquisition out of the row-lock observation window.
// Writer, closer and observer each need a ready, independent connection.
beforeAll(async () => {
  const ready = deferred(), release = deferred(); let acquired = 0
  const warming = Promise.all(Array.from({ length: 3 }, () => client.$transaction(async tx => {
    const [row] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`
    if (++acquired === 3) ready.resolve()
    await release.promise
    return row.pid
  }, { ...options, maxWait: 15000 })))
  try { await Promise.race([ready.promise, warming]) } finally { release.resolve() }
  expect(new Set(await warming).size).toBe(3)
})
beforeEach(async () => {
  expect((await client.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`)[0].name).toMatch(/^stoquify_local_close_scope_[0-9]{8}_[a-f0-9]{8}$/)
  org = `period-control-${++sequence}`; periodId = `${org}-period`; actor = `${org}-actor`
  await client.organization.create({ data: { id: org, name: "Synthetic period control", slug: org } })
  await client.user.create({ data: { id: actor, organizationId: org, email: `${org}@example.invalid`, mfaBackupCodes: [] } })
  await client.fiscalYear.create({ data: { id: `${org}-fy`, organizationId: org, name: "2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") } })
  await client.accountingPeriod.create({ data: { id: periodId, organizationId: org, fiscalYearId: `${org}-fy`, periodNumber: 9, name: "September", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30T23:59:59.999Z") } })
  await client.journal.create({ data: { id: `${org}-journal`, organizationId: org, code: "GEN", nameEn: "Test", nameFr: "Test", type: "GENERAL" } })
})
afterAll(async () => { await client.$disconnect() })
const close = (version = 0) => closeAccountingPeriod(org, periodId, actor, { expectedVersion: version, actorPermissions: ["accounting.period.close"], lastAuthAt: new Date() })
const reopenInput = (version = 1) => ({ periodId, expectedVersion: version, reason: "Correct an omitted invoice", idempotencyKey: `${org}-reopen-${version}` })
const reopenControl = () => ({ organizationId: org, actorId: actor, actorPermissions: ["accounting.period.reopen"], lastAuthAt: new Date() })
async function approved() {
  return client.$transaction(async tx => {
    const sourceRevision = await lockCloseSourceRevisionInTx(tx, org)
    const createdAt = new Date(Date.now() - 50), completedAt = new Date(Date.now() - 20)
    // Synthetic retained certification isolates the period transition contract;
    // the real certification service has its own regression suite.
    const run = await tx.closeRun.create({ data: { organizationId: org, periodId, status: "CERTIFIED", runById: "maker", createdAt, completedAt, metadata: { sourceRevision } } })
    runId = run.id
    const pack = await tx.closePackExport.create({ data: { organizationId: org, periodId, closeRunId: run.id, contentHash: hash, watermarkId: `${org}-${run.id}`, isCertified: true, exportedById: "reviewer", exportedAt: new Date() } })
    await tx.closeRun.update({ where: { id: run.id }, data: { metadata: { sourceRevision, certifiedExportId: pack.id, certifiedContentHash: hash, certifiedById: "reviewer" } } })
    return pack
  }, options)
}
async function draft(tx: Prisma.TransactionClient | PrismaClient = client) {
  return tx.journalEntry.create({ data: { organizationId: org, periodId, journalId: `${org}-journal`, entryNumber: `${org}-entry`, entryDate: new Date("2026-09-15"), currency: "XAF", status: "DRAFT" } })
}
async function waitForBlockedWriter(pid: number) {
  const deadline = Date.now() + 8000
  while (Date.now() < deadline) {
    const [row] = await client.$queryRaw<Array<{ blocked: boolean }>>(Prisma.sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))) AS blocked`)
    if (row?.blocked) return
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  throw new Error("Expected PostgreSQL blocking relationship was not observed")
}
it("requires an approved current assessment, not a clean ledger or READY label", async () => {
  await expect(close()).rejects.toThrow("independent certified approval")
  await approved()
  await client.closeRun.update({ where: { id: runId }, data: { status: "READY" } })
  await expect(close()).rejects.toThrow("independent certified approval")
  expect(await client.periodControlEvent.count({ where: { organizationId: org } })).toBe(0)
})
it("closes atomically with a retained approval receipt and audited lock", async () => {
  const pack = await approved()
  const period = await close()
  expect(period).toMatchObject({ status: "CLOSED", controlVersion: 1, closedById: actor })
  expect(period?.lockedAt).toEqual(period?.closedAt)
  const receipt = await client.periodControlEvent.findUniqueOrThrow({ where: { id: period!.lastControlEventId! } })
  expect(receipt.approval).toMatchObject({ certifiedExportId: pack.id, approvedById: "reviewer", preparedById: "maker", contentHash: hash })
  expect((await client.closeRun.findUniqueOrThrow({ where: { id: runId } })).status).toBe("CERTIFIED")
  expect(((await client.closePackExport.findUniqueOrThrow({ where: { id: pack.id } })).metadata as any)?.staleState).toBeUndefined()
  expect(await client.ledgerAuditEvent.count({ where: { organizationId: org, action: "ACCOUNTING_PERIOD_CLOSE" } })).toBe(1)
  await expect(client.periodControlEvent.update({ where: { id: receipt.id }, data: { reason: "Rewrite this history" } })).rejects.toThrow("immutable")
  await expect(client.periodControlEvent.delete({ where: { id: receipt.id } })).rejects.toThrow("immutable")
})
it("reopens once, retains old approval, invalidates evidence and requires recertification", async () => {
  const pack = await approved(); await close()
  const input = reopenInput(), control = reopenControl()
  const result = await reopenAccountingPeriod(input, control)
  expect(result.period).toMatchObject({ status: "OPEN", controlVersion: 2, closedAt: null, lockedAt: null, closedById: null })
  expect(result.event.reason).toBe(input.reason)
  expect((await reopenAccountingPeriod(input, control)).replayed).toBe(true)
  expect(await client.periodControlEvent.count({ where: { organizationId: org } })).toBe(2)
  expect(await client.ledgerAuditEvent.count({ where: { organizationId: org, action: "ACCOUNTING_PERIOD_REOPEN" } })).toBe(1)
  expect((await client.closePackExport.findUniqueOrThrow({ where: { id: pack.id } })).metadata).toMatchObject({ staleState: { status: "EVIDENCE_STALE" } })
  await expect(close(2)).rejects.toThrow("independent certified approval")
  await approved(); await expect(close(2)).resolves.toMatchObject({ status: "CLOSED", controlVersion: 3 })
  // A network replay must not reopen a later close cycle.
  expect((await reopenAccountingPeriod(input, control)).period.status).toBe("CLOSED")
})
it("rejects stale versions, changed replay payloads, cross-tenant access and missing authority", async () => {
  await approved(); await close()
  await expect(reopenAccountingPeriod(reopenInput(0), reopenControl())).rejects.toThrow("period changed")
  await expect(reopenAccountingPeriod(reopenInput(), { ...reopenControl(), organizationId: "foreign" })).rejects.toThrow("not found")
  await expect(reopenAccountingPeriod(reopenInput(), { ...reopenControl(), actorPermissions: [] })).rejects.toThrow("permission")
  await expect(reopenAccountingPeriod(reopenInput(), { ...reopenControl(), lastAuthAt: new Date(Date.now() - 301000) })).rejects.toThrow("fresh authentication")
  const input = reopenInput(); await reopenAccountingPeriod(input, reopenControl())
  await expect(reopenAccountingPeriod({ ...input, reason: "A different correction reason" }, reopenControl())).rejects.toThrow("different request")
})
it("rejects period-state bypass and closed-period header/line writes", async () => {
  const entry = await draft()
  await client.journalEntry.update({ where: { id: entry.id }, data: { status: "VOIDED" } })
  await client.chartOfAccount.create({ data: { id: `${org}-account`, organizationId: org, code: "411", nameEn: "Test", nameFr: "Test", type: "ASSET", normalBalance: "DEBIT" } })
  await approved()
  await expect(client.accountingPeriod.update({ where: { id: periodId }, data: { status: "CLOSED" } })).rejects.toThrow("receipt")
  await close()
  await expect(draft()).rejects.toThrow("not open")
  await expect(client.journalEntry.update({ where: { id: entry.id }, data: { memo: "Late change" } })).rejects.toThrow("not open")
  await expect(client.journalEntry.delete({ where: { id: entry.id } })).rejects.toThrow("not open")
  await expect(client.journalEntryLine.create({ data: { organizationId: org, journalEntryId: entry.id, accountId: `${org}-account`, lineNumber: 1, currency: "XAF", debit: 0, credit: 0 } })).rejects.toThrow("not open")
  await expect(client.accountingPeriod.update({ where: { id: periodId }, data: { status: "OPEN" } })).rejects.toThrow("receipt")
  await expect(client.accountingPeriod.update({ where: { id: periodId }, data: { endDate: new Date("2026-10-31") } })).rejects.toThrow("scope")
  await expect(client.accountingPeriod.delete({ where: { id: periodId } })).rejects.toThrow("retained")
})

it("keeps draft header and line deletion available in an open period", async () => {
  const entry = await draft()
  const account = await client.chartOfAccount.create({ data: { organizationId: org, code: "411", nameEn: "Test", nameFr: "Test", type: "ASSET", normalBalance: "DEBIT" } })
  await client.journalEntryLine.create({ data: { organizationId: org, journalEntryId: entry.id, accountId: account.id, lineNumber: 1, currency: "XAF", debit: 0, credit: 0 } })
  await client.journalEntry.delete({ where: { id: entry.id } })
  expect(await client.journalEntryLine.count({ where: { journalEntryId: entry.id } })).toBe(0)
})
it.each(["stale", "self", "hash", "newer", "ambiguous"])("rejects %s approval", async mode => {
  const pack = await approved()
  if (mode === "stale") await client.organization.update({ where: { id: org }, data: { currency: "EUR" } })
  if (mode === "self") await client.closePackExport.update({ where: { id: pack.id }, data: { exportedById: "maker" } })
  if (mode === "hash") await client.closePackExport.update({ where: { id: pack.id }, data: { contentHash: "b".repeat(64) } })
  if (mode === "newer" || mode === "ambiguous") {
    const prior = await client.closeRun.findUniqueOrThrow({ where: { id: runId } })
    await client.closeRun.create({ data: { organizationId: org, periodId, status: "READY", createdAt: mode === "ambiguous" ? prior.createdAt : new Date() } })
  }
  await expect(close()).rejects.toThrow()
  expect((await client.accountingPeriod.findUniqueOrThrow({ where: { id: periodId } })).status).toBe("OPEN")
})
it.each([true, false])("waits for a journal writer and observes its commit=%s", async commit => {
  await approved()
  const ready = deferred(), release = deferred(); let writerPid = 0
  const writer = client.$transaction(async tx => {
    writerPid = (await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`)[0].pid
    await draft(tx); ready.resolve(); await release.promise
    if (!commit) throw new Error("fixture rollback")
  }, options).catch(error => { if (commit || !String(error).includes("fixture rollback")) throw error })
  await ready.promise
  const closing = close().then(value => ({ value, error: null }), error => ({ value: null, error }))
  try { await waitForBlockedWriter(writerPid) } finally { release.resolve() }
  await writer
  const outcome = await closing
  if (commit) { expect(outcome.error).toBeTruthy(); expect(outcome.value).toBeNull() }
  else { expect(outcome.error).toBeNull(); expect(outcome.value?.status).toBe("CLOSED") }
})
it("rolls back state and receipt if the audit write fails", async () => {
  await approved()
  await client.$executeRawUnsafe(`CREATE FUNCTION phase7_fail_close_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${org}' AND NEW.action = 'ACCOUNTING_PERIOD_CLOSE' THEN RAISE EXCEPTION 'Injected audit failure'; END IF; RETURN NEW; END $$`)
  await client.$executeRawUnsafe('CREATE TRIGGER phase7_fail_close_audit BEFORE INSERT ON ledger_audit_events FOR EACH ROW EXECUTE FUNCTION phase7_fail_close_audit()')
  await expect(close()).rejects.toThrow("Injected audit failure")
  expect((await client.accountingPeriod.findUniqueOrThrow({ where: { id: periodId } })).status).toBe("OPEN")
  expect(await client.periodControlEvent.count({ where: { organizationId: org } })).toBe(0)
})

it("serializes competing closes and idempotent reopen retries", async () => {
  await approved()
  const results = await Promise.allSettled([close(), close()])
  expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1)
  expect(await client.periodControlEvent.count({ where: { organizationId: org } })).toBe(1)
  const input = reopenInput(), control = reopenControl()
  const retries = await Promise.all([reopenAccountingPeriod(input, control), reopenAccountingPeriod(input, control)])
  expect(retries.filter(row => row.replayed)).toHaveLength(1)
  expect(new Set(retries.map(row => row.event.id)).size).toBe(1)
  expect(await client.periodControlEvent.count({ where: { organizationId: org } })).toBe(2)
})

it("a direct journal writer waiting behind close cannot publish after the lock commits", async () => {
  await approved()
  // Test-only latch after the period update, still inside the real close transaction.
  await client.$executeRawUnsafe(`CREATE FUNCTION phase7_latch_close_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."organizationId" = '${org}' AND NEW.action = 'ACCOUNTING_PERIOD_CLOSE' THEN PERFORM pg_advisory_xact_lock(7171717); END IF; RETURN NEW; END $$`)
  await client.$executeRawUnsafe('CREATE TRIGGER phase7_latch_close_audit BEFORE INSERT ON ledger_audit_events FOR EACH ROW EXECUTE FUNCTION phase7_latch_close_audit()')
  const ready = deferred(), release = deferred(); let latchPid = 0
  const latch = client.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(7171717)::text`
    latchPid = (await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`)[0].pid
    ready.resolve(); await release.promise
  }, options)
  await ready.promise
  const closing = close().then(value => ({ value, error: null }), error => ({ value: null, error }))
  let writer: Promise<any> | undefined
  try {
    await waitForBlockedWriter(latchPid)
    const [closer] = await client.$queryRaw<Array<{ pid: number }>>(Prisma.sql`SELECT pid FROM pg_stat_activity WHERE ${latchPid} = ANY(pg_blocking_pids(pid))`)
    writer = draft().then(value => ({ value, error: null }), error => ({ value: null, error }))
    await waitForBlockedWriter(closer.pid)
  } finally { release.resolve() }
  await latch
  expect((await closing).value?.status).toBe("CLOSED")
  expect(String((await writer).error)).toContain("not open")
  expect(await client.journalEntry.count({ where: { organizationId: org } })).toBe(0)
})
