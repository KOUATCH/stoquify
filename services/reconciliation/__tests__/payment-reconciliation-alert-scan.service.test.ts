/** @jest-environment node */
import { db } from "@/prisma/db"
import { alertScanInputSchema, readLatestReconciliationAlertScan, runReconciliationAlertScan } from "../payment-reconciliation-alert-scan.service"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), paymentReconciliationInboxItem: { createMany: jest.fn(), findFirst: jest.fn() } } }))
beforeEach(() => jest.clearAllMocks())
it.each([{}, { organizationId: " ", workerId: "worker", scanId: "c781b497-8491-46b9-bc94-e626b2c28816" }, { organizationId: "org", workerId: "worker", scanId: "bad" }, { organizationId: "org", workerId: "worker", scanId: "c781b497-8491-46b9-bc94-e626b2c28816", maxPages: 101 }])("rejects invalid scope or scan identity before writing: %j", async input => {
  await expect(runReconciliationAlertScan(input as Parameters<typeof runReconciliationAlertScan>[0])).rejects.toThrow()
  expect(db.paymentReconciliationInboxItem.createMany).not.toHaveBeenCalled()
})
it("rejects client-supplied progress, timestamps and completion claims", () => {
  expect(() => alertScanInputSchema.parse({ organizationId: "org", workerId: "worker", scanId: "c781b497-8491-46b9-bc94-e626b2c28816", state: "COMPLETE", cursor: "skip-records", startedAt: "2000-01-01T00:00:00Z" })).toThrow()
})
it("keeps scan absence distinct from a failed query and scopes latest-state reads", async () => {
  ;(db.paymentReconciliationInboxItem.findFirst as jest.Mock).mockResolvedValue(null)
  expect(await readLatestReconciliationAlertScan("org-1")).toBeNull()
  expect(db.paymentReconciliationInboxItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1" }) }))
  ;(db.paymentReconciliationInboxItem.findFirst as jest.Mock).mockRejectedValue(new Error("read failed"))
  await expect(readLatestReconciliationAlertScan("org-1")).rejects.toThrow("read failed")
})
it("does not interpret corrupt progress as a successful scan", async () => {
  ;(db.paymentReconciliationInboxItem.findFirst as jest.Mock).mockResolvedValue({ payloadSummary: { worker: { state: "COMPLETE" } } })
  await expect(readLatestReconciliationAlertScan("org-1")).rejects.toThrow()
})

it.each([false, true])("uses organization-before-scan locks for a worker page and failure marker (failure=%s)", async failure => {
  const scanId = "c781b497-8491-46b9-bc94-e626b2c28816", now = new Date().toISOString()
  const record = { id: "row", payloadSummary: { worker: { kind: "RECONCILIATION_ALERT_SCAN_V1", scanId, workerId: "worker", startedAt: now, updatedAt: now, completedAt: null, state: "REQUESTED", phase: "SUSPENSE", cursor: null, version: 0, examined: 0, created: 0, errorCode: null } } }
  const locks: string[] = []
  const tx = { $queryRaw: jest.fn(async (query: TemplateStringsArray) => { locks.push(query.join("?")); return [] }),
    paymentReconciliationInboxItem: { findUniqueOrThrow: jest.fn().mockResolvedValue(record), update: jest.fn() },
    suspenseItem: { findMany: failure ? jest.fn().mockRejectedValue(new Error("page failed")) : jest.fn().mockResolvedValue([]) } }
  ;(db.$transaction as jest.Mock).mockImplementation(async run => run(tx))
  if (failure) await expect(runReconciliationAlertScan({ organizationId: "org", workerId: "worker", scanId, maxPages: 1 })).rejects.toThrow("page failed")
  else expect(await runReconciliationAlertScan({ organizationId: "org", workerId: "worker", scanId, maxPages: 1 })).toMatchObject({ version: 1, phase: "READY_RUNS" })
  expect(locks[0]).toContain("FROM organizations")
  expect(locks[1]).toContain("FROM payment_reconciliation_inbox_items")
  if (failure) { expect(locks[2]).toContain("FROM organizations"); expect(locks[3]).toContain("FROM payment_reconciliation_inbox_items") }
})
