/** @jest-environment node */
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("../payment-reconciliation-notifications", () => ({ publishPaymentReconciliationNotification: jest.fn() }))
import { Prisma } from "@prisma/client"
import { advanceReconciliationAlertScanPageInTx, hashReconciliationAlertScan, type ReconciliationAlertScan } from "../payment-reconciliation-alert-scan.service"
import { publishPaymentReconciliationNotification } from "../payment-reconciliation-notifications"
const scanId = "550e8400-e29b-41d4-a716-446655440000"
const scan = (phase: ReconciliationAlertScan["phase"]): ReconciliationAlertScan => ({ kind: "RECONCILIATION_ALERT_SCAN_V1", scanId, workerId: "worker", startedAt: "2026-10-04T09:00:00Z", updatedAt: "2026-10-04T10:00:00Z", completedAt: null, state: "FAILED", phase, cursor: null, version: 2, examined: 100, created: 10, errorCode: "ALERT_SCAN_PAGE_FAILED" })
const context = { organizationId: "org", workerId: "operator-recovery" }
function transaction() { return {
  suspenseItem: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  reconciliationRun: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  paymentException: { count: jest.fn().mockResolvedValue(0) }, paymentReconciliationInboxItem: { update: jest.fn() },
} }
beforeEach(() => { jest.clearAllMocks(); (publishPaymentReconciliationNotification as jest.Mock).mockResolvedValue({ created: true }) })
it("advances an empty source page without resetting source history or starting another page", async () => {
  const tx = transaction(), before = scan("SUSPENSE")
  const after = await advanceReconciliationAlertScanPageInTx(tx as never, context, { id: "record", payloadSummary: { worker: before } })
  expect(after).toMatchObject({ version: 3, state: "RUNNING", phase: "READY_RUNS", examined: 100, created: 10, errorCode: null })
  expect(before.state).toBe("FAILED")
  expect(tx.suspenseItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, where: expect.objectContaining({ organizationId: "org", createdAt: { lte: new Date(before.startedAt) } }) }))
  expect(tx.reconciliationRun.findMany).not.toHaveBeenCalled()
  expect(tx.paymentReconciliationInboxItem.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ attempts: { increment: 1 }, payloadHash: hashReconciliationAlertScan(after) }) }))
})
it("retains a cursor on a full page and counts only newly recorded alerts", async () => {
  const tx = transaction(), before = { ...scan("SUSPENSE"), cursor: "earlier" }
  tx.suspenseItem.findMany.mockResolvedValue(Array.from({ length: 100 }, (_, index) => ({ id: `item-${index}`, amount: new Prisma.Decimal("10.00"), currencyCode: "XAF", slaDeadline: new Date("2026-10-04T09:00:00Z"), severity: "HIGH" })))
  ;(publishPaymentReconciliationNotification as jest.Mock).mockResolvedValue({ created: false })
  const after = await advanceReconciliationAlertScanPageInTx(tx as never, context, { id: "record", payloadSummary: { worker: before } })
  expect(after).toMatchObject({ phase: "SUSPENSE", cursor: "item-99", examined: 200, created: 10 })
  expect(tx.suspenseItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { gt: "earlier" } }) }))
  expect(publishPaymentReconciliationNotification).toHaveBeenCalledTimes(100)
})
it("passes the same transaction to notification recording", async () => {
  const tx = transaction()
  tx.reconciliationRun.findMany.mockResolvedValue([{ id: "run", providerAccountId: "provider", paymentRailId: "rail", correlationId: null }])
  await advanceReconciliationAlertScanPageInTx(tx as never, context, { id: "record", payloadSummary: { worker: scan("READY_RUNS") } })
  expect(publishPaymentReconciliationNotification).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", dedupeKey: "run", correlationId: scanId }), tx)
})
it("completes review through reads and an in-app observation only", async () => {
  const tx = transaction(); tx.paymentException.count.mockResolvedValue(1)
  const after = await advanceReconciliationAlertScanPageInTx(tx as never, context, { id: "record", payloadSummary: { worker: scan("REVIEW") } })
  expect(after).toMatchObject({ state: "COMPLETE", phase: "COMPLETE", version: 3, created: 11 })
  expect(publishPaymentReconciliationNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "payment-reconciliation.period-close.blocked", organizationId: "org" }), tx)
  expect(after.completedAt).not.toBeNull()
})
it("does not save a checkpoint if a notification insert fails", async () => {
  const tx = transaction(); tx.paymentException.count.mockResolvedValue(1)
  ;(publishPaymentReconciliationNotification as jest.Mock).mockRejectedValueOnce(new Error("insert failed"))
  await expect(advanceReconciliationAlertScanPageInTx(tx as never, context, { id: "record", payloadSummary: { worker: scan("REVIEW") } })).rejects.toThrow()
  expect(tx.paymentReconciliationInboxItem.update).not.toHaveBeenCalled()
})
it("does not advance a completed scan", async () => {
  const tx = transaction(), completed = { ...scan("COMPLETE"), state: "COMPLETE" as const, completedAt: "2026-10-04T11:00:00Z", errorCode: null }
  expect(await advanceReconciliationAlertScanPageInTx(tx as never, context, { id: "record", payloadSummary: { worker: completed } })).toEqual(completed)
  expect(tx.paymentReconciliationInboxItem.update).not.toHaveBeenCalled()
})
