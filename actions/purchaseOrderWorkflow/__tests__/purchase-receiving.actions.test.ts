import { revalidateTag } from "next/cache"
import { requirePermission } from "@/lib/security/rbac"
import { requireSession } from "@/lib/security/auth-session"
import { ForbiddenError, BusinessRuleError } from "@/services/_shared/action-errors"
import { getPurchaseReceivingWorkbench, previewPurchaseReceiving, confirmPurchaseReceiving } from "@/services/purchase-order/purchase-receiving-workbench.service"
import { loadPurchaseReceiving, reviewPurchaseReceiving, submitPurchaseReceiving } from "../purchase-receiving.actions"

jest.mock("next/cache", () => ({ revalidateTag: jest.fn(), revalidatePath: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireSession: jest.fn() }))
jest.mock("@/services/purchase-order/purchase-receiving-workbench.service", () => ({ getPurchaseReceivingWorkbench: jest.fn(), previewPurchaseReceiving: jest.fn(), confirmPurchaseReceiving: jest.fn() }))
jest.mock("@/services/purchase-order/receipt-ledger-recovery.service", () => ({ previewReceiptLedgerRecovery: jest.fn(), confirmReceiptLedgerRecovery: jest.fn() }))
const scope = { organizationId: "server-org", actorId: "server-actor", sessionId: "server-session", sessionToken: "private-test-session" }
const draft = { kind: "receive" as const, orderId: "po-1", inspectionOutcome: "PASSED" as const, items: [{ lineId: "line-1", receivedQuantity: 0.125 }] }
const command = { draft, expectedRevision: "a".repeat(64), idempotencyKey: "receiving-request-1" }
const result = { kind: "receive", orderId: "po-1", goodsReceiptId: "gr-1", receiptNumber: "GR-1", requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, actorId: scope.actorId, disposition: "HELD", quantity: "0.125", value: "312.50", currency: "XAF", recordedAt: "2026-09-07T12:00:00.000Z", stockStatus: "unavailable", accountingStatus: "not_started", replayed: false }
describe("reviewed receiving actions", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: scope.organizationId, userId: scope.actorId })
    ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: scope.organizationId, userId: scope.actorId, sessionId: scope.sessionId, sessionToken: scope.sessionToken } })
    ;(confirmPurchaseReceiving as jest.Mock).mockResolvedValue(result)
  })
  it("derives identity from the current authenticated scope for reads and review", async () => {
    await loadPurchaseReceiving("po-1")
    expect(requirePermission).toHaveBeenCalledWith("purchases.orders.read", { resource: "PurchaseOrder", auditAllowed: false })
    expect(getPurchaseReceivingWorkbench).toHaveBeenCalledWith("po-1", scope)
    await reviewPurchaseReceiving(draft)
    expect(requirePermission).toHaveBeenLastCalledWith("purchases.orders.receive", { resource: "PurchaseOrder", auditAllowed: true })
    expect(previewPurchaseReceiving).toHaveBeenCalledWith(draft, scope)
  })
  it("retains the committed decision even when cache invalidation fails", async () => {
    ;(revalidateTag as jest.Mock).mockImplementationOnce(() => { throw new Error("Cache unavailable") })
    expect(await submitPurchaseReceiving(command)).toEqual({ success: true, data: result })
    expect(confirmPurchaseReceiving).toHaveBeenCalledWith(command, scope)
  })
  it("preserves exact replay evidence returned by the service", async () => {
    ;(confirmPurchaseReceiving as jest.Mock).mockResolvedValue({ ...result, replayed: true })
    expect(await submitPurchaseReceiving(command)).toMatchObject({ success: true, data: { requestReference: command.idempotencyKey, replayed: true, disposition: "HELD" } })
  })
  it.each(["tenant", "actor"])("rejects a mismatched %s identity before entering the service", async mode => {
    ;(requireSession as jest.Mock).mockResolvedValue({ claims: { tenantId: mode === "tenant" ? "other-org" : scope.organizationId, userId: mode === "actor" ? "other-actor" : scope.actorId } })
    expect(await submitPurchaseReceiving(command)).toMatchObject({ success: false, code: "FORBIDDEN" })
    expect(confirmPurchaseReceiving).not.toHaveBeenCalled()
  })
  it("never executes when current receiving permission is denied", async () => {
    ;(requirePermission as jest.Mock).mockRejectedValue(new ForbiddenError())
    expect(await reviewPurchaseReceiving(draft)).toMatchObject({ success: false, code: "FORBIDDEN" })
    expect(previewPurchaseReceiving).not.toHaveBeenCalled()
  })
  it("keeps actionable fresh-authentication and separation codes", async () => {
    for (const code of ["FRESH_AUTH_REQUIRED", "SOD_VIOLATION"]) {
      ;(confirmPurchaseReceiving as jest.Mock).mockRejectedValueOnce(new BusinessRuleError("Current verification required", code))
      expect(await submitPurchaseReceiving(command)).toMatchObject({ success: false, code })
    }
  })
  it("does not expose unexpected infrastructure details", async () => {
    ;(getPurchaseReceivingWorkbench as jest.Mock).mockRejectedValue(new Error("private SQL connection string"))
    const failure = await loadPurchaseReceiving("po-1")
    expect(failure).toMatchObject({ success: false, data: null, code: "INTERNAL_ERROR" })
    expect(JSON.stringify(failure)).not.toContain("private SQL")
  })
})
