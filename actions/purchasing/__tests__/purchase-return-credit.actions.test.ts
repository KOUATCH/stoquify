import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import {
  postPurchaseReturn,
  postSupplierCreditNote,
} from "@/services/purchasing/purchase-return-credit.service"
import {
  postPurchaseReturnAction,
  postSupplierCreditNoteAction,
} from "../purchase-return-credit.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
      this.name = "RbacError"
    }
  }
  return {
    RbacError: MockRbacError,
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {},
  requireFreshAuth: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))

jest.mock("@/services/purchasing/purchase-return-credit.service", () => ({
  postPurchaseReturn: jest.fn(),
  reversePurchaseReturn: jest.fn(),
  postSupplierCreditNote: jest.fn(),
  reverseSupplierCreditNote: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockPostPurchaseReturn = postPurchaseReturn as jest.Mock
const mockPostSupplierCreditNote = postSupplierCreditNote as jest.Mock

function context(permission: string) {
  return {
    userId: "actor-1",
    orgId: "org-1",
    permissions: [permission],
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    organizationName: "Org 1",
    user: { id: "actor-1", organizationId: "org-1", roles: [], permissions: [permission] },
  }
}

describe("purchase return and supplier credit actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: "2026-08-19T09:00:00.000Z" } })
  })

  it("denies a purchase return before any stock or accounting mutation", async () => {
    const { RbacError } = jest.requireMock("@/lib/security/rbac")
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await postPurchaseReturnAction({
      purchaseOrderId: "po-1",
      goodsReceiptId: "gr-1",
      idempotencyKey: "return-idem-1",
      reason: "Damaged goods",
      lines: [{ sourceGoodsReceiptLineId: "gr-line-1", quantity: "1.000" }],
    })

    expect(result).toEqual(expect.objectContaining({ success: false, code: "FORBIDDEN", status: 403 }))
    expect(mockPostPurchaseReturn).not.toHaveBeenCalled()
  })

  it("derives the return tenant and actor from authentication", async () => {
    mockRequirePermission.mockResolvedValue(context("purchasing.returns.post"))
    mockPostPurchaseReturn.mockResolvedValue({ purchaseReturn: { id: "return-1" }, replayed: false })

    const result = await postPurchaseReturnAction({
      organizationId: "attacker-org",
      postedById: "attacker-user",
      purchaseOrderId: "po-1",
      goodsReceiptId: "gr-1",
      idempotencyKey: "return-idem-1",
      reason: "Damaged goods",
      lines: [{ sourceGoodsReceiptLineId: "gr-line-1", quantity: "1.000" }],
    })

    expect(result.success).toBe(true)
    expect(mockPostPurchaseReturn).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      postedById: "actor-1",
      purchaseOrderId: "po-1",
      goodsReceiptId: "gr-1",
    }))
  })

  it("denies a supplier credit before AP or supplier balance mutation", async () => {
    const { RbacError } = jest.requireMock("@/lib/security/rbac")
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await postSupplierCreditNoteAction({
      purchaseReturnId: "return-1",
      supplierInvoiceId: "invoice-1",
      creditNoteNumber: "CN-001",
      creditDate: "2026-08-19T00:00:00.000Z",
      documentHash: "sha256:supplier-credit",
      idempotencyKey: "credit-idem-1",
      reason: "Supplier accepted return",
      lines: [{ sourcePurchaseReturnLineId: "return-line-1", sourceSupplierInvoiceLineId: "invoice-line-1" }],
    })

    expect(result).toEqual(expect.objectContaining({ success: false, code: "FORBIDDEN", status: 403 }))
    expect(mockPostSupplierCreditNote).not.toHaveBeenCalled()
  })

  it("requires the critical AP credit permission and preserves source IDs", async () => {
    mockRequirePermission.mockResolvedValue(context("purchasing.ap.credit.post"))
    mockPostSupplierCreditNote.mockResolvedValue({ supplierCreditNote: { id: "credit-1" }, replayed: false })

    const result = await postSupplierCreditNoteAction({
      organizationId: "attacker-org",
      postedById: "attacker-user",
      purchaseReturnId: "return-1",
      supplierInvoiceId: "invoice-1",
      creditNoteNumber: "CN-001",
      creditDate: "2026-08-19T00:00:00.000Z",
      documentHash: "sha256:supplier-credit",
      idempotencyKey: "credit-idem-1",
      reason: "Supplier accepted return",
      lines: [{ sourcePurchaseReturnLineId: "return-line-1", sourceSupplierInvoiceLineId: "invoice-line-1" }],
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith(
      "purchasing.ap.credit.post",
      { resource: "SupplierCreditNote" },
    )
    expect(mockPostSupplierCreditNote).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      postedById: "actor-1",
      purchaseReturnId: "return-1",
      supplierInvoiceId: "invoice-1",
    }))
  })
})
