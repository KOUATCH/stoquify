/** @jest-environment node */
import { db } from "@/prisma/db"
import { logger } from "@/lib/logger"
import { publishPaymentReconciliationNotification, type PaymentReconciliationNotificationEvent } from "../payment-reconciliation-notifications"

jest.mock("@/prisma/db", () => ({ db: { paymentReconciliationInboxItem: { createMany: jest.fn() } } }))
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn() } }))
const createMany = db.paymentReconciliationInboxItem.createMany as jest.Mock
const event: PaymentReconciliationNotificationEvent = {
  type: "payment-reconciliation.exception.created", organizationId: "org-1", correlationId: "run-correlation",
  amount: "100.25", currency: "XAF", evidenceRef: { reconciliationRunId: "run-1", suspenseItemId: "suspense-1", exceptionId: "exception-1" },
}
beforeEach(() => { jest.clearAllMocks(); createMany.mockResolvedValue({ count: 1 }) })
it.each(["exception", "suspense"] as const)("keeps sibling %s observations distinct within one run", async kind => {
  for (const id of [1, 2]) await publishPaymentReconciliationNotification({ ...event, type: `payment-reconciliation.${kind}.created`, evidenceRef: { reconciliationRunId: "run-1", suspenseItemId: `suspense-${id}`, exceptionId: `exception-${id}` } })
  expect(createMany.mock.calls.map(([arg]) => arg.data.idempotencyKey)).toEqual([1, 2].map(id => `payment-reconciliation.${kind}.created:${kind}-${id}`))
})
it("inserts once through the caller transaction and logs no amount or owner details", async () => {
  const transactional = { paymentReconciliationInboxItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) } }
  await publishPaymentReconciliationNotification(event, transactional as unknown as Parameters<typeof publishPaymentReconciliationNotification>[1])
  expect(createMany).not.toHaveBeenCalled()
  expect(transactional.paymentReconciliationInboxItem.createMany).toHaveBeenCalledWith({ skipDuplicates: true, data: expect.objectContaining({ organizationId: "org-1", payloadSummary: expect.objectContaining({ amount: "100.25", currency: "XAF" }) }) })
  expect(logger.info).toHaveBeenCalledWith("payment-reconciliation.notification.recorded", expect.not.objectContaining({ amount: expect.anything() }))
})
it("reports a retry without an update or a new recorded log", async () => {
  createMany.mockResolvedValue({ count: 0 })
  expect(await publishPaymentReconciliationNotification(event)).toEqual({ created: false })
  expect(logger.info).not.toHaveBeenCalled()
})
it("honors distinct explicit revision keys and scopes them to the tenant", async () => {
  for (const organizationId of ["org-1", "org-2"]) for (const dedupeKey of ["revision-1", "revision-2"]) await publishPaymentReconciliationNotification({ ...event, organizationId, dedupeKey })
  expect(createMany.mock.calls.map(([arg]) => [arg.data.organizationId, arg.data.idempotencyKey])).toEqual([
    ["org-1", "payment-reconciliation.exception.created:revision-1"], ["org-1", "payment-reconciliation.exception.created:revision-2"],
    ["org-2", "payment-reconciliation.exception.created:revision-1"], ["org-2", "payment-reconciliation.exception.created:revision-2"],
  ])
})
it("rejects a missing tenant before writing and propagates a failed insert", async () => {
  await expect(publishPaymentReconciliationNotification({ ...event, organizationId: " " })).rejects.toMatchObject({ code: "TENANT_SCOPE_VIOLATION" })
  expect(createMany).not.toHaveBeenCalled()
  createMany.mockRejectedValue(new Error("storage unavailable"))
  await expect(publishPaymentReconciliationNotification(event)).rejects.toThrow("storage unavailable")
})
