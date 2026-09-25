import { assertPriorSuspenseResolutionsInTx, assertSuspenseResolutionRecoveryInTx } from "../payment-suspense-resolution-recovery-evidence.service"
import { suspenseEvidenceHash } from "../payment-suspense-evidence"
import { suspenseResolutionRecoveryDraftSchema } from "../payment-suspense-resolution-recovery.contracts"

it("does not require recovery proof when no historical allocation exists", async () => {
  const tx = { paymentReconciliationInboxItem: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() } }
  await assertPriorSuspenseResolutionsInTx(tx as never, "org-1", { id: "item-1", status: "POSTED_TO_SUSPENSE" })
  expect(tx.paymentReconciliationInboxItem.findFirst).not.toHaveBeenCalled()
  expect(tx.paymentReconciliationInboxItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", externalId: "item-1", source: "SUSPENSE_POST" }) }))
})
it("only exempts the current allocation of an actually final item", async () => {
  const tx = { paymentReconciliationInboxItem: { findMany: jest.fn().mockResolvedValue([{ id: "allocation-1" }]), findFirst: jest.fn().mockResolvedValue(null) } }
  await assertPriorSuspenseResolutionsInTx(tx as never, "org-1", { id: "item-1", status: "RESOLVED", metadata: { resolutionReceiptId: "allocation-1" } })
  await expect(assertPriorSuspenseResolutionsInTx(tx as never, "org-1", { id: "item-1", status: "POSTED_TO_SUSPENSE", metadata: { resolutionReceiptId: "allocation-1" } })).rejects.toMatchObject({ code: "CONFLICT" })
})
it("does not accept an allocation without independently verified recovery", async () => {
  const body = { kind: "SUSPENSE_RESOLUTION_ALLOCATION_V1", suspenseItemId: "item-1", clearingJournalId: "journal-1", decisionId: "decision-1" }
  const tx = { paymentReconciliationInboxItem: { findFirst: jest.fn().mockResolvedValueOnce({ id: "allocation-1", idempotencyKey: "suspense-resolution-clearing:journal-1", payloadSummary: body, payloadHash: suspenseEvidenceHash(body).slice(7) }).mockResolvedValue(null) } }
  await expect(assertSuspenseResolutionRecoveryInTx(tx as never, "org-1", "item-1", "allocation-1")).rejects.toThrow(/no verified source recovery/i)
})
it.each(["2026-02-30", "2026-9-09", "not-a-date"])("rejects invalid recovery accounting date %s", reversalDate => {
  expect(suspenseResolutionRecoveryDraftSchema.safeParse({ suspenseItemId: "item-1", reversalDate, reason: "Independent source review" }).success).toBe(false)
})
it("rejects client-supplied identity and financial amounts in a recovery draft", () => {
  expect(suspenseResolutionRecoveryDraftSchema.safeParse({ suspenseItemId: "item-1", reversalDate: "2026-09-09", reason: "Independent source review", actorId: "actor-1", amount: "100" }).success).toBe(false)
})
