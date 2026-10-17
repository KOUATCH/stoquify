import { revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { previewReceiptLedgerRecovery, confirmReceiptLedgerRecovery } from "@/services/purchase-order/receipt-ledger-recovery.service"
import { reviewReceiptLedgerRecovery, submitReceiptLedgerRecovery } from "../purchase-receiving.actions"
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchase-order/purchase-receiving-workbench.service", () => ({ getPurchaseReceivingWorkbench: jest.fn(), previewPurchaseReceiving: jest.fn(), confirmPurchaseReceiving: jest.fn() }))
jest.mock("@/services/purchase-order/receipt-ledger-recovery.service", () => ({ previewReceiptLedgerRecovery: jest.fn(), confirmReceiptLedgerRecovery: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "private-test-session" }, draft = { orderId: "po", receiptId: "gr" }, command = { ...draft, expectedRevision: "a".repeat(64), idempotencyKey: "recovery-request" }
beforeEach(() => {
  jest.resetAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "actor" })
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { userId: "actor", tenantId: "org", sessionId: "session", sessionToken: scope.sessionToken } })
  ;(confirmReceiptLedgerRecovery as jest.Mock).mockResolvedValue({ orderId: "po", receiptId: "gr", ledgerStatus: "POSTED", replayed: false })
})
test("derives identity and checks both finance and receiving visibility", async () => {
  await reviewReceiptLedgerRecovery(draft)
  expect(requirePermission).toHaveBeenCalledWith("purchasing.ap.invoice.post", { resource: "GoodsReceipt", auditAllowed: false })
  expect(requirePermission).toHaveBeenCalledWith("purchases.orders.read", { resource: "PurchaseOrder" })
  expect(previewReceiptLedgerRecovery).toHaveBeenCalledWith(draft, scope)
})
test("cache failure cannot erase committed accounting outcome", async () => {
  ;(revalidateTag as jest.Mock).mockImplementation(() => { throw new Error("cache failed") })
  expect(await submitReceiptLedgerRecovery(command)).toMatchObject({ success: true, data: { ledgerStatus: "POSTED" } })
  expect(confirmReceiptLedgerRecovery).toHaveBeenCalledWith(command, scope)
})
test.each(["session", "permission"])("rejects inconsistent %s tenant identity", async mode => {
  if (mode === "session") (requireSession as jest.Mock).mockResolvedValue({ claims: { userId: "actor", tenantId: "other" } })
  else (requirePermission as jest.Mock).mockResolvedValueOnce({ userId: "actor", orgId: "org" }).mockResolvedValueOnce({ userId: "actor", orgId: "other" })
  expect(await submitReceiptLedgerRecovery(command)).toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(confirmReceiptLedgerRecovery).not.toHaveBeenCalled()
})
test("denied finance permission never enters recovery", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new ForbiddenError())
  expect(await reviewReceiptLedgerRecovery(draft)).toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(previewReceiptLedgerRecovery).not.toHaveBeenCalled()
})
test.each(["FRESH_AUTH_REQUIRED", "RECEIPT_EVIDENCE_REQUIRED"])("preserves actionable %s", async code => {
  ;(confirmReceiptLedgerRecovery as jest.Mock).mockRejectedValue(new BusinessRuleError("Review required", code))
  expect(await submitReceiptLedgerRecovery(command)).toMatchObject({ success: false, code })
})
test("failed accounting queries are safe failures", async () => {
  ;(previewReceiptLedgerRecovery as jest.Mock).mockRejectedValue(new Error("private SQL"))
  const result = await reviewReceiptLedgerRecovery(draft)
  expect(result).toMatchObject({ success: false, data: null, code: "INTERNAL_ERROR" }); expect(JSON.stringify(result)).not.toContain("private SQL")
})
