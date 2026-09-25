import { db } from "@/prisma/db"
import { readSuspenseResolutionWorkspace, searchSuspenseClearingJournals } from "../payment-suspense-resolution-read.service"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"
import { Prisma } from "@prisma/client"
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
const control = { organizationId: "org-1", actorId: "actor-1", actorPermissions: ["payments.reconciliation.read", "accounting.journal.read"] }
function transaction() {
  const tx = { user: { findFirst: jest.fn().mockResolvedValue({ id: "actor-1" }) }, suspenseItem: { findFirst: jest.fn().mockResolvedValue({ id: "item-1", status: "POSTED_TO_SUSPENSE", amount: new Prisma.Decimal("100.25"), currencyCode: "XAF", suspenseLedgerAccountId: "account-1", metadata: null }) },
    paymentReconciliationInboxItem: { findMany: jest.fn().mockResolvedValue([]) }, journalEntry: { findMany: jest.fn().mockResolvedValue([]) } }
  jest.mocked(db.$transaction).mockImplementation((async (work: (value: typeof tx) => unknown) => work(tx)) as never)
  return tx
}
beforeEach(() => jest.clearAllMocks())
it.each([{ actorPermissions: [] }, { actorPermissions: ["payments.reconciliation.read"] }, { actorPermissions: ["accounting.journal.read"] }])("requires both read permissions for private history and journal search: %j", async override => {
  const tx = transaction()
  await expect(readSuspenseResolutionWorkspace({ suspenseItemId: "item-1" }, { ...control, ...override })).rejects.toMatchObject({ code: "FORBIDDEN" })
  await expect(searchSuspenseClearingJournals({ suspenseItemId: "item-1", search: "" }, { ...control, ...override })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.suspenseItem.findFirst).not.toHaveBeenCalled(); expect(tx.journalEntry.findMany).not.toHaveBeenCalled()
})
it("does not query private records for an inactive or foreign actor", async () => {
  const tx = transaction(); tx.user.findFirst.mockResolvedValue(null)
  await expect(readSuspenseResolutionWorkspace({ suspenseItemId: "item-1" }, control)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.user.findFirst).toHaveBeenCalledWith({ where: { id: control.actorId, organizationId: control.organizationId, isActive: true }, select: { id: true } })
  expect(tx.paymentReconciliationInboxItem.findMany).not.toHaveBeenCalled()
})
it("refuses a missing scoped source instead of returning empty successful history", async () => {
  const tx = transaction(); tx.suspenseItem.findFirst.mockResolvedValue(null)
  await expect(readSuspenseResolutionWorkspace({ suspenseItemId: "foreign-item" }, control)).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(tx.suspenseItem.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign-item", organizationId: "org-1" } }))
})
it("retains query failures as failures", async () => {
  const tx = transaction(); tx.paymentReconciliationInboxItem.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(readSuspenseResolutionWorkspace({ suspenseItemId: "item-1" }, control)).rejects.toThrow("database unavailable")
})
it("refuses tampered history and does not expose raw payloads", async () => {
  const tx = transaction(), payload = { kind: "SUSPENSE_RESOLUTION_PROPOSED_V1", draft: { suspenseItemId: "item-1", reason: "Reviewed source" }, privateCertificate: "PRIVATE" }
  const row = { id: "record-1", createdAt: new Date(), payloadHash: "wrong", payloadSummary: payload }
  tx.paymentReconciliationInboxItem.findMany.mockResolvedValue([row] as never)
  await expect(readSuspenseResolutionWorkspace({ suspenseItemId: "item-1" }, control)).rejects.toMatchObject({ code: "CONFLICT" })
  row.payloadHash = suspenseEvidenceHash(payload).slice(7)
  const result = await readSuspenseResolutionWorkspace({ suspenseItemId: "item-1" }, control)
  expect(result.history[0].reason).toBe("Reviewed source"); expect(JSON.stringify(result)).not.toContain("PRIVATE")
})
it("lists scoped journal candidates without claiming eligibility", async () => {
  const tx = transaction()
  const result = await searchSuspenseClearingJournals({ suspenseItemId: "item-1", search: "reference" }, control)
  expect(result.eligibilityVerified).toBe(false)
  expect(tx.journalEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", status: "POSTED", sourceType: "MANUAL", lines: { some: { organizationId: "org-1", accountId: "account-1" } } }), take: 26 }))
})
