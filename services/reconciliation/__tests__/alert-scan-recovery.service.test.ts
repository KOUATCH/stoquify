/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
jest.mock("../payment-reconciliation-alert-scan.service", () => ({ ...jest.requireActual("../payment-reconciliation-alert-scan.service"), advanceReconciliationAlertScanPageInTx: jest.fn() }))
jest.mock("@/services/events/business-event.service", () => ({ ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn() }))
import { db } from "@/prisma/db"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { hashBusinessPayload, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { advanceReconciliationAlertScanPageInTx, hashReconciliationAlertScan, type ReconciliationAlertScan } from "../payment-reconciliation-alert-scan.service"
import { readAlertScanRecovery, recoverAlertScanPage } from "../alert-scan-recovery.service"
const scanId = "550e8400-e29b-41d4-a716-446655440000", commandId = "650e8400-e29b-41d4-a716-446655440000"
const ctx = { orgId: "org", userId: "operator", sessionId: "session", sessionToken: "test-token", permissions: ["payments.reconciliation.read", "payments.reconciliation.run"] }
const now = new Date("2026-10-04T12:00:00Z")
const initialScan = (): ReconciliationAlertScan => ({ kind: "RECONCILIATION_ALERT_SCAN_V1", scanId, workerId: "private-worker", startedAt: now.toISOString(), updatedAt: now.toISOString(), completedAt: null, state: "FAILED", phase: "SUSPENSE", cursor: "private-source-id", version: 4, examined: 100, created: 12, errorCode: "ALERT_SCAN_PAGE_FAILED" })
const initialRow = () => ({ id: "scan-row", organizationId: "org", providerAccountId: null as string | null, source: "RECONCILIATION_RUN", status: "PROCESSED", idempotencyKey: `operational-alert-scan:${scanId}`, attempts: 4, payloadHash: hashReconciliationAlertScan(initialScan()), payloadSummary: { worker: initialScan() } as Record<string, unknown>, lastError: "ALERT_SCAN_PAGE_FAILED" as string | null, nextAttemptAt: null as Date | null, leasedBy: null as string | null, leaseToken: null as string | null, processedAt: null as Date | null, createdAt: now, updatedAt: now })
let row: ReturnType<typeof initialRow>, event: Record<string, unknown> | null
let tx: { $queryRaw: jest.Mock; $executeRaw: jest.Mock; user: { findFirst: jest.Mock }; session: { findFirst: jest.Mock }; paymentReconciliationInboxItem: { findUnique: jest.Mock }; businessEvent: { findUnique: jest.Mock }; auditLog: { create: jest.Mock } }
beforeEach(() => {
  jest.clearAllMocks(); row = initialRow(); event = null; process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED = "true"
  tx = { $queryRaw: jest.fn().mockResolvedValue([]), $executeRaw: jest.fn(),
    user: { findFirst: jest.fn().mockResolvedValue({ isActive: true, isVerified: true, emailVerified: false, isLocked: false, lockedUntil: null, roles: [{ permissions: ctx.permissions }] }) },
    session: { findFirst: jest.fn().mockResolvedValue({ id: "session" }) }, paymentReconciliationInboxItem: { findUnique: jest.fn(async () => row) },
    businessEvent: { findUnique: jest.fn(async () => event) }, auditLog: { create: jest.fn() } }
  ;(db.$transaction as jest.Mock).mockImplementation(async run => run(tx))
  ;(evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: true })
  ;(advanceReconciliationAlertScanPageInTx as jest.Mock).mockImplementation(async () => {
    const scan = { ...(row.payloadSummary.worker as ReconciliationAlertScan), version: 5, phase: "READY_RUNS" as const, state: "RUNNING" as const, cursor: null, errorCode: null, workerId: "operator-recovery" }
    row = { ...row, payloadSummary: { worker: scan }, payloadHash: hashReconciliationAlertScan(scan), lastError: null, attempts: row.attempts + 1 }
    return scan
  })
  ;(recordBusinessEventInTx as jest.Mock).mockImplementation(async (_tx, input) => { event = { ...input, payloadHash: hashBusinessPayload(input.payload), sourceType: null, status: "APPLIED" }; return { event: { id: "event" }, created: true } })
})
afterEach(() => { delete process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED })
const request = async () => ({ scanId, commandId, expectedRevision: (await readAlertScanRecovery(ctx, { scanId })).revision! })

it("projects a reviewed checkpoint without worker, cursor, lease or payload details", async () => {
  const result = await readAlertScanRecovery(ctx, { scanId })
  expect(result).toMatchObject({ eligible: true, reason: "READY", progress: { state: "FAILED", version: 4 } })
  expect(JSON.stringify(result)).not.toMatch(/private-worker|private-source-id|leaseToken|payloadSummary/)
  expect(tx.paymentReconciliationInboxItem.findUnique).toHaveBeenCalledWith({ where: { organizationId_source_idempotencyKey: { organizationId: "org", source: "RECONCILIATION_RUN", idempotencyKey: `operational-alert-scan:${scanId}` } } })
})
it.each(["context", "stored", "session", "account", "module"])("rejects missing current %s authority", async kind => {
  if (kind === "stored") tx.user.findFirst.mockResolvedValue({ isActive: true, isVerified: true, isLocked: false, roles: [{ permissions: ["payments.reconciliation.read"] }] })
  if (kind === "session") tx.session.findFirst.mockResolvedValue(null)
  if (kind === "account") tx.user.findFirst.mockResolvedValue(null)
  if (kind === "module") (evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: false })
  await expect(readAlertScanRecovery(kind === "context" ? { ...ctx, permissions: ["payments.reconciliation.read"] } : ctx, { scanId })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.paymentReconciliationInboxItem.findUnique).not.toHaveBeenCalled()
})
it("does not resolve a foreign tenant scan through an unscoped fallback", async () => {
  tx.paymentReconciliationInboxItem.findUnique.mockResolvedValue(null)
  await expect(readAlertScanRecovery(ctx, { scanId })).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(advanceReconciliationAlertScanPageInTx).not.toHaveBeenCalled()
})
it.each(["leaseToken", "leasedBy", "nextAttemptAt", "providerAccountId", "payloadHash", "status", "lastError"])("escalates unexpected %s without advancing or clearing it", async field => {
  Object.assign(row, { [field]: field === "nextAttemptAt" ? now : "unexpected" })
  const before = JSON.stringify(row)
  const result = await readAlertScanRecovery(ctx, { scanId })
  expect(result).toMatchObject({ reason: "ESCALATE", eligible: false, revision: null, progress: null })
  await expect(recoverAlertScanPage(ctx, { scanId, commandId, expectedRevision: "a".repeat(64) })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(JSON.stringify(row)).toBe(before); expect(advanceReconciliationAlertScanPageInTx).not.toHaveBeenCalled()
})
it.each(["root", "worker", "shape", "completion"])("escalates poison or inconsistent %s evidence", async kind => {
  if (kind === "root") row.payloadSummary.secret = "do not expose"
  if (kind === "worker") (row.payloadSummary.worker as Record<string, unknown>).token = "do not expose"
  if (kind === "shape") row.payloadSummary = { notification: { status: "UNREAD" } }
  if (kind === "completion") { const scan = { ...initialScan(), phase: "COMPLETE" as const }; row.payloadSummary = { worker: scan }; row.payloadHash = hashReconciliationAlertScan(scan) }
  expect(await readAlertScanRecovery(ctx, { scanId })).toMatchObject({ reason: "ESCALATE", progress: null })
})
it("keeps write-disabled status readable and does not advance", async () => {
  delete process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED
  const command = await request()
  expect(await readAlertScanRecovery(ctx, { scanId })).toMatchObject({ reason: "DISABLED", eligible: false })
  await expect(recoverAlertScanPage(ctx, command)).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
})
it("advances one page and commits checkpoint, event receipt and audit in one transaction", async () => {
  const result = await recoverAlertScanPage(ctx, await request())
  expect(result).toMatchObject({ receipt: { commandId, scanId, fromVersion: 4, toVersion: 5, state: "RUNNING" }, progress: { version: 5 } })
  expect(advanceReconciliationAlertScanPageInTx).toHaveBeenCalledTimes(1)
  expect(advanceReconciliationAlertScanPageInTx).toHaveBeenCalledWith(tx, { organizationId: "org", workerId: "operator-recovery" }, expect.objectContaining({ id: "scan-row" }))
  expect(recordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ outboxMessages: [], actorId: "operator", sourceId: "scan-row" }))
  expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "ALERT_SCAN_RECOVERY_PAGE" }) }))
})
it("replays a lost command response after a later checkpoint and write kill switch", async () => {
  const command = await request(), first = await recoverAlertScanPage(ctx, command)
  delete process.env.RECONCILIATION_ALERT_RECOVERY_ENABLED
  expect((await recoverAlertScanPage(ctx, command)).receipt).toEqual(first.receipt)
  expect((await readAlertScanRecovery(ctx, { scanId, command })).receipt).toEqual(first.receipt)
  expect(advanceReconciliationAlertScanPageInTx).toHaveBeenCalledTimes(1)
})
it("rejects changed input under the same command key", async () => {
  const command = await request(); await recoverAlertScanPage(ctx, command)
  await expect(recoverAlertScanPage(ctx, { ...command, expectedRevision: "b".repeat(64) })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
})
it("rejects worker or operator progress after the reviewed revision", async () => {
  const command = await request(); row.attempts++
  await expect(recoverAlertScanPage(ctx, command)).rejects.toMatchObject({ code: "CONFLICT" })
  expect(advanceReconciliationAlertScanPageInTx).not.toHaveBeenCalled()
})
it("rejects a second operator command for an already advanced revision", async () => {
  const command = await request(); await recoverAlertScanPage(ctx, command)
  event = null // No receipt belongs to the second, distinct command.
  await expect(recoverAlertScanPage(ctx, { ...command, commandId: "750e8400-e29b-41d4-a716-446655440000" })).rejects.toMatchObject({ code: "CONFLICT" })
  expect(advanceReconciliationAlertScanPageInTx).toHaveBeenCalledTimes(1)
})
it.each(["PROCESSING", "DEAD_LETTER", "FAILED", "RECEIVED"])("never converts generic transport %s into scan recovery", async status => {
  row.status = status; row.leaseToken = status === "PROCESSING" ? "private-active-lease" : null
  expect(await readAlertScanRecovery(ctx, { scanId })).toMatchObject({ eligible: false, reason: "ESCALATE" })
  expect(advanceReconciliationAlertScanPageInTx).not.toHaveBeenCalled()
})
it.each(["actorId", "sourceId", "status", "payloadHash"])("rejects corrupted or foreign receipt %s", async field => {
  const command = await request(); await recoverAlertScanPage(ctx, command); event![field] = "changed"
  await expect(readAlertScanRecovery(ctx, { scanId, command })).rejects.toThrow()
  expect(advanceReconciliationAlertScanPageInTx).toHaveBeenCalledTimes(1)
})
it("does not record a successful command after page failure", async () => {
  const command = await request(); (advanceReconciliationAlertScanPageInTx as jest.Mock).mockRejectedValueOnce(new Error("page failed"))
  await expect(recoverAlertScanPage(ctx, command)).rejects.toThrow()
  expect(recordBusinessEventInTx).not.toHaveBeenCalled(); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it.each([{ organizationId: "other" }, { workerId: "caller" }, { cursor: "skip" }, { leaseToken: "take" }, { maxPages: 100 }])("rejects client control fields %o", async extra => {
  await expect(recoverAlertScanPage(ctx, { scanId, commandId, expectedRevision: "a".repeat(64), ...extra })).rejects.toThrow()
  expect(db.$transaction).not.toHaveBeenCalled()
})
