/** @jest-environment node */
// Real PostgreSQL reader/RBAC/module checks. Only the HTTP session-subject seam
// is stubbed: this suite does not certify Better Auth cookie/session transport.
import { createHash, randomUUID } from "node:crypto"
import { Prisma, PrismaClient } from "@prisma/client"
jest.mock("next/headers", () => ({ headers: async () => new Headers() }))
jest.mock("@/lib/auth", () => ({ auth: { api: { getSession: jest.fn() } } }))
import { auth } from "@/lib/auth"
import { db } from "@/prisma/db"
import { getRetentionOutcomeReadModel, RETENTION_SOURCE_LIMIT } from "../retention-outcomes.service"

const suite = process.env.RUN_RETENTION_OUTCOMES_POSTGRES === "1" ? describe : describe.skip
const start = new Date("2026-01-10T00:00:00Z"), endExclusive = new Date("2026-01-11T00:00:00Z")
const at = new Date("2026-01-10T12:00:00Z")
const windowInput = { start, endExclusive }
const session = auth.api.getSession as unknown as jest.Mock
type Scope = { organizationId: string; userId: string; roleId: string; customerId: string; locationId: string; terminalId: string; sessionId: string }
let a: Scope, b: Scope, site2: Scope, writer: PrismaClient

function assertTarget() {
  const target = new URL(process.env.DATABASE_URL ?? "")
  const name = process.env.POS_DISPOSABLE_DATABASE_NAME ?? ""
  if (target.hostname !== "localhost" || target.username !== "retention_fixture" || !/^stoquify_pos_audit_\d{8}_[a-f0-9]+$/.test(name)
    || target.pathname !== `/${name}` || target.searchParams.get("schema") !== "public") throw Error("Explicit owned disposable PostgreSQL target required")
}
async function scope(parent?: Scope): Promise<Scope> {
  const id = randomUUID(), organizationId = parent?.organizationId ?? `retention-org-${id}`
  const userId = parent?.userId ?? `retention-user-${id}`, roleId = parent?.roleId ?? `retention-role-${id}`
  const customerId = parent?.customerId ?? `retention-customer-${id}`
  if (!parent) {
    await db.organization.create({ data: { id: organizationId, name: "Synthetic retention reader", slug: organizationId, requestedModules: [], currency: "XAF" } })
    await db.role.create({ data: { id: roleId, organizationId, code: roleId, nameEn: "Synthetic report reader", permissions: ["reports.read", "sales.read"] } })
    await db.user.create({ data: { id: userId, organizationId, email: `${id}@retention.invalid`, emailVerified: true, isVerified: true, mfaBackupCodes: [], roles: { connect: { id: roleId } } } })
    await db.customer.create({ data: { id: customerId, organizationId, code: id, name: "Synthetic retention customer" } })
  }
  const locationId = `retention-location-${id}`, terminalId = `retention-terminal-${id}`, sessionId = `retention-shift-${id}`
  await db.location.create({ data: { id: locationId, organizationId, name: "Synthetic site", code: id, type: "STORE" } })
  await db.pOSStation.create({ data: { id: terminalId, organizationId, locationId, name: "Synthetic till", terminalNumber: id } })
  await db.pOSSession.create({ data: { id: sessionId, organizationId, locationId, terminalId, userId, sessionNumber: id, openingBalance: 0 } })
  return { organizationId, userId, roleId, customerId, locationId, terminalId, sessionId }
}
async function order(s: Scope) {
  const id = randomUUID()
  return db.salesOrder.create({ data: { id, organizationId: s.organizationId, locationId: s.locationId, terminalId: s.terminalId, sessionId: s.sessionId, createdById: s.userId, customerId: s.customerId, orderNumber: id } })
}
function commitData(s: Scope, salesOrderId: string, overrides: Partial<Prisma.POSCommitResultUncheckedCreateInput> = {}) {
  const status = overrides.status ?? "COMMITTED"
  const resultEnvelope = { secret: "PRIVATE_COMMIT_ENVELOPE" }
  // Match the migration-enforced state shape, including SQL NULL for a claim.
  // A Prisma datamodel-only bootstrap does not install these constraints.
  return { organizationId: s.organizationId, locationId: s.locationId, terminalId: s.terminalId, sessionId: s.sessionId, actorId: s.userId,
    salesOrderId, clientCommitId: randomUUID(), requestHash: "a".repeat(64), status, createdAt: at,
    committedAt: status === "CLAIMED" ? null : at,
    completedAt: status === "COMPLETED" ? (overrides.committedAt ?? at) : null,
    resultEnvelope: status === "CLAIMED" ? Prisma.DbNull : resultEnvelope,
    resultHash: status === "CLAIMED" ? null : createHash("sha256").update(JSON.stringify(resultEnvelope)).digest("hex"),
    ...overrides }
}
async function commit(s = a, overrides: Partial<Prisma.POSCommitResultUncheckedCreateInput> = {}) {
  return db.pOSCommitResult.create({ data: commitData(s, overrides.salesOrderId ?? (await order(s)).id, overrides) })
}
function correctionData(s = a, overrides: Partial<Prisma.BusinessEventUncheckedCreateInput> = {}): Prisma.BusinessEventUncheckedCreateInput {
  return { organizationId: s.organizationId, locationId: s.locationId, actorId: s.userId, eventType: "pos.refund.issued", eventSource: "POS",
    sourceType: "POS_REFUND", sourceId: randomUUID(), idempotencyKey: randomUUID(), payloadHash: "b".repeat(64),
    payload: { secret: "PRIVATE_CUSTOMER_PAYROLL_PROVIDER_PAYLOAD" }, metadata: { token: "PRIVATE_METADATA" }, occurredAt: at, recordedAt: at, ...overrides }
}
const read = (extra: { organizationId?: string; locationId?: string; start?: Date; endExclusive?: Date } = {}) => getRetentionOutcomeReadModel({ ...windowInput, ...extra })

suite("P02 outcome reader on explicit disposable PostgreSQL", () => {
  jest.setTimeout(120000)
  beforeAll(async () => { assertTarget(); writer = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL! } } }); await writer.$connect() })
  beforeEach(async () => {
    a = await scope(); site2 = await scope(a); b = await scope()
    session.mockResolvedValue({ user: { id: a.userId, organizationId: a.organizationId } })
  })
  afterEach(() => { jest.restoreAllMocks(); session.mockReset() })
  afterAll(async () => { await writer?.$disconnect(); await db.$disconnect() })

  it("reads persisted finalized/uncertain/corrected rows with independent counts and scalar-only output", async () => {
    const first = await commit()
    await commit(a, { salesOrderId: first.salesOrderId, status: "COMPLETED" })
    await commit(a, { status: "CLAIMED", committedAt: null })
    await commit(site2)
    await commit(b)
    await db.businessEvent.create({ data: correctionData() })
    await db.businessEvent.create({ data: correctionData(a, { eventType: "pos.sale.voided", sourceType: "POS_VOID", status: "APPLIED" }) })
    await db.businessEvent.create({ data: correctionData(a, { status: "FAILED" }) })
    await db.businessEvent.create({ data: correctionData(b) })
    const result = await read()
    expect(result).toMatchObject({ completedOperations: 2, correctionEvents: 2, diagnostics: { duplicates: 1, unfinalized: 1, invalid: 1 }, humanAdoption: { state: "UNKNOWN", eligibleCompletedOperations: null } })
    expect(result.outcomes.filter(o => o.outcome === "REVERSED").map(o => o.correction).sort()).toEqual(["REFUND", "VOID"])
    expect(new Set(result.outcomes.map(o => o.organizationId))).toEqual(new Set([a.organizationId]))
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_|requestHash|actorId|userId|payload|metadata/)
    expect(await read({ locationId: a.locationId })).toMatchObject({ completedOperations: 1, correctionEvents: 2 })
  })

  it("preserves persisted uniqueness under concurrent retries and rejects changed-payload reuse", async () => {
    const sale = await order(a), data = commitData(a, sale.id, { clientCommitId: randomUUID() })
    const attempts = await Promise.allSettled([db.pOSCommitResult.create({ data }), writer.pOSCommitResult.create({ data })])
    expect(attempts.filter(r => r.status === "fulfilled")).toHaveLength(1)
    expect((attempts.find(r => r.status === "rejected") as PromiseRejectedResult).reason.code).toBe("P2002")
    await expect(writer.pOSCommitResult.create({ data: { ...data, requestHash: "c".repeat(64) } })).rejects.toMatchObject({ code: "P2002" })
    expect(await read()).toMatchObject({ completedOperations: 1, diagnostics: { duplicates: 0 } })
    expect(await db.pOSCommitResult.findFirst({ where: { organizationId: a.organizationId } })).toMatchObject({ requestHash: "a".repeat(64) })
  })

  it("updates COMMITTED to COMPLETED without counting a second operation and rejects conflicting durable observations", async () => {
    const row = await commit()
    expect((await read()).completedOperations).toBe(1)
    await db.pOSCommitResult.update({ where: { id: row.id }, data: { status: "COMPLETED", completedAt: at } })
    expect((await read()).completedOperations).toBe(1)
    await commit(a, { salesOrderId: row.salesOrderId, committedAt: new Date(at.getTime() + 1) })
    expect(await read()).toMatchObject({ completedOperations: 0, diagnostics: { conflictingOperations: 1 } })
  })

  it("uses inclusive start/exclusive end, recording cutoff and rejects invalid durable observations", async () => {
    await commit(a, { committedAt: start })
    await commit(a, { committedAt: new Date(endExclusive.getTime() - 1) })
    await commit(a, { committedAt: endExclusive })
    await commit(a, { committedAt: new Date(start.getTime() - 1) })
    await commit(a, { createdAt: new Date("2099-01-01") })
    await expect(commit(a, { committedAt: null })).rejects.toThrow("pos_commit_results_state_shape_check")
    await db.businessEvent.create({ data: correctionData(a, { occurredAt: start }) })
    await db.businessEvent.create({ data: correctionData(a, { occurredAt: endExclusive }) })
    await db.businessEvent.create({ data: correctionData(a, { recordedAt: new Date("2099-01-01") }) })
    expect(await read()).toMatchObject({ completedOperations: 2, correctionEvents: 1, diagnostics: { invalid: 0 } })
  })

  it("denies foreign tenant and foreign/missing site with real RBAC and persisted location reads", async () => {
    await commit(b)
    await expect(read({ organizationId: b.organizationId })).rejects.toMatchObject({ code: "FORBIDDEN" })
    await expect(read({ locationId: b.locationId })).rejects.toThrow("not found")
    await expect(read({ locationId: "absent-synthetic-site" })).rejects.toThrow("not found")
    expect((await read()).completedOperations).toBe(0)
    expect(await db.auditLog.count({ where: { organizationId: a.organizationId, action: "PERMISSION_DENIED" } })).toBeGreaterThan(0)
  })

  it.each(["reports.read", "sales.read"])("observes persisted removal of %s on the next read", async permission => {
    await commit()
    expect((await read()).completedOperations).toBe(1)
    await db.role.update({ where: { id: a.roleId }, data: { permissions: ["reports.read", "sales.read"].filter(p => p !== permission) } })
    await expect(read()).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it("denies a managed module with no grants through the real entitlement service", async () => {
    await db.tenantModuleConfiguration.create({ data: { organizationId: a.organizationId, manifestHash: "synthetic-empty-grants" } })
    await expect(read()).rejects.toThrow("module is not available")
  })

  it.each(["inactive", "locked", "organization"])("observes persisted %s authority changes", async kind => {
    if (kind === "organization") await db.organization.update({ where: { id: a.organizationId }, data: { isActive: false } })
    else await db.user.update({ where: { id: a.userId }, data: kind === "inactive" ? { isActive: false } : { isLocked: true, lockedUntil: null } })
    await expect(read()).rejects.toMatchObject({ code: kind === "organization" ? "NO_ACTIVE_ORG" : kind === "locked" ? "ACCOUNT_LOCKED" : "UNAUTHENTICATED" })
  })

  it("rejects absent/stale session subjects without treating the harness as cookie validation", async () => {
    session.mockResolvedValueOnce(null)
    await expect(read()).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
    session.mockResolvedValueOnce({ user: { id: a.userId, organizationId: b.organizationId } })
    await expect(read()).rejects.toMatchObject({ code: "FORBIDDEN" })
  })

  it.each(["commit", "correction"])("fails closed above the actual %s source cap rather than returning partial zeros", async kind => {
    if (kind === "commit") {
      const sale = await order(a)
      await db.pOSCommitResult.createMany({ data: Array.from({ length: RETENTION_SOURCE_LIMIT }, () => commitData(a, sale.id)) })
      expect((await read()).completedOperations).toBe(1)
      await commit(a, { salesOrderId: sale.id })
    } else {
      await db.businessEvent.createMany({ data: Array.from({ length: RETENTION_SOURCE_LIMIT }, () => correctionData()) })
      expect((await read()).correctionEvents).toBe(1000)
      await db.businessEvent.create({ data: correctionData() })
    }
    await expect(read()).rejects.toThrow("source limit")
  })

  it("rejects invalid/future/oversize windows and ignores caller as-of/provenance overrides", async () => {
    await expect(read({ start: new Date("invalid") })).rejects.toThrow("31 days")
    await expect(read({ endExclusive: new Date("2099-01-01") })).rejects.toThrow("31 days")
    await expect(read({ start: new Date("2025-01-01") })).rejects.toThrow("31 days")
    await commit()
    const result = await getRetentionOutcomeReadModel({ ...windowInput, asOf: new Date("2099-01-01"), traffic: "HUMAN" } as Parameters<typeof getRetentionOutcomeReadModel>[0])
    expect(result.asOf).not.toMatch(/^2099/)
    expect(result.humanAdoption).toMatchObject({ state: "UNKNOWN", eligibleCompletedOperations: null })
  })

  it("keeps one RepeatableRead snapshot across a real concurrent correction committed between source queries", async () => {
    await commit()
    const realTransaction = db.$transaction.bind(db)
    let isolation = "", inserted = false
    const spy = jest.spyOn(db, "$transaction").mockImplementation((async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => realTransaction(async tx => {
      const info = await tx.$queryRaw<Array<{ transaction_isolation: string }>>`SHOW transaction_isolation`
      isolation = info[0].transaction_isolation
      const proxy = new Proxy(tx, { get(target, key) {
        if (key !== "pOSCommitResult") return Reflect.get(target, key)
        return new Proxy(tx.pOSCommitResult, { get(delegate, method) {
          if (method !== "findMany") return Reflect.get(delegate, method)
          return async (args: Prisma.POSCommitResultFindManyArgs) => {
            const rows = await tx.pOSCommitResult.findMany(args)
            await writer.businessEvent.create({ data: correctionData() }); inserted = true
            return rows
          }
        } })
      } })
      return callback(proxy)
    }, options)) as typeof db.$transaction)
    const result = await read()
    spy.mockRestore()
    expect(inserted).toBe(true); expect(isolation).toBe("repeatable read")
    expect(result).toMatchObject({ completedOperations: 1, correctionEvents: 0 })
    expect((await read()).correctionEvents).toBe(1)
  })

  it("does not count a rolled-back persisted intent", async () => {
    const sale = await order(a)
    await expect(db.$transaction(async tx => { await tx.pOSCommitResult.create({ data: commitData(a, sale.id) }); throw Error("Synthetic rollback") })).rejects.toThrow("Synthetic rollback")
    expect((await read()).completedOperations).toBe(0)
  })

  it("propagates real PostgreSQL backend termination rather than producing a successful zero report", async () => {
    await commit()
    const realTransaction = db.$transaction.bind(db)
    let terminated = false
    const spy = jest.spyOn(db, "$transaction").mockImplementation((async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: object) => realTransaction(async tx => {
      const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`
      const [{ stopped }] = await writer.$queryRaw<Array<{ stopped: boolean }>>`SELECT pg_terminate_backend(${pid}::integer) AS stopped`
      terminated = stopped
      return callback(tx)
    }, options)) as typeof db.$transaction)
    await expect(read()).rejects.toBeDefined()
    spy.mockRestore(); expect(terminated).toBe(true)
    expect((await read()).completedOperations).toBe(1)
  })
})
