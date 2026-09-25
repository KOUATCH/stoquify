/** @jest-environment node */
import { db } from "@/prisma/db"
import { alertScanInputSchema, readLatestReconciliationAlertScan, runReconciliationAlertScan } from "../payment-reconciliation-alert-scan.service"
jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { paymentReconciliationInboxItem: { createMany: jest.fn(), findFirst: jest.fn() } } }))
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
