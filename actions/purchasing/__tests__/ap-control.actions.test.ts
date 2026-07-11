import { revalidatePath } from "next/cache"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import {
  approveSupplierBankChangeWithControls,
  approveSupplierPaymentWithControls,
  getAPWorkbenchData,
  postSupplierInvoice,
  releaseSupplierPaymentWithControls,
  requestSupplierBankChange,
} from "@/services/purchasing/ap-control.service"

import {
  approveSupplierBankChangeAction,
  approveSupplierPaymentAction,
  getAPWorkbenchAction,
  postSupplierInvoiceAction,
  releaseSupplierPaymentAction,
  requestSupplierBankChangeAction,
} from "../ap-control.actions"

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

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

jest.mock("@/lib/security/auth-session", () => {
  class MockFreshAuthRequiredError extends Error {
    constructor(message = "Fresh authentication required") {
      super(message)
      this.name = "FreshAuthRequiredError"
    }
  }

  return {
    FreshAuthRequiredError: MockFreshAuthRequiredError,
    requireFreshAuth: jest.fn(),
  }
})

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}))

jest.mock("@/services/purchasing/ap-control.service", () => ({
  approveSupplierBankChangeWithControls: jest.fn(),
  approveSupplierPaymentWithControls: jest.fn(),
  getAPWorkbenchData: jest.fn(),
  postSupplierInvoice: jest.fn(),
  releaseSupplierPaymentWithControls: jest.fn(),
  requestSupplierBankChange: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockPostSupplierInvoice = postSupplierInvoice as jest.Mock
const mockRequestSupplierBankChange = requestSupplierBankChange as jest.Mock
const mockApproveSupplierBankChangeWithControls = approveSupplierBankChangeWithControls as jest.Mock
const mockApproveSupplierPaymentWithControls = approveSupplierPaymentWithControls as jest.Mock
const mockReleaseSupplierPaymentWithControls = releaseSupplierPaymentWithControls as jest.Mock
const mockGetAPWorkbenchData = getAPWorkbenchData as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function rbacContext(userId = "actor-1", permissions: string[] = []) {
  return {
    userId,
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    organizationName: "Demo Org",
    user: {
      id: userId,
      firstName: "Ada",
      lastName: "Ngono",
      phone: "",
      roles: [],
      permissions,
      organizationId: "org-1",
      organizationName: "Demo Org",
    },
  }
}

function invoiceInput() {
  return {
    organizationId: "client-org",
    supplierId: "supplier-1",
    invoiceNumber: "INV-001",
    currency: "XAF",
    approvedById: "client-approver",
    lines: [
      {
        goodsReceiptLineId: "gr-line-1",
        description: "Farine",
        quantity: "2.000",
        unitCost: "1000.00",
      },
    ],
  }
}

describe("AP control actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: "2026-07-02T12:00:00.000Z" } })
  })

  it("derives supplier invoice tenant and actor fields from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("poster-1", ["purchasing.ap.invoice.post"]))
    mockPostSupplierInvoice.mockResolvedValue({
      supplierInvoice: { id: "invoice-1" },
      ledgerStatus: "BLOCKED_PENDING_RULES",
    })

    const result = await postSupplierInvoiceAction(invoiceInput())

    expect(result.success).toBe(true)
    expect(mockPostSupplierInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        supplierId: "supplier-1",
        createdById: "poster-1",
        approvedById: "poster-1",
      }),
    )
    expect(mockPostSupplierInvoice.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/purchases/payables", "page")
  })

  it("returns a client-safe RBAC denial for the AP workbench", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getAPWorkbenchAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockGetAPWorkbenchData).not.toHaveBeenCalled()
  })

  it("requires fresh auth before approving supplier bank changes", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await approveSupplierBankChangeAction({ changeRequestId: "change-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockApproveSupplierBankChangeWithControls).not.toHaveBeenCalled()
  })

  it("delegates supplier bank approval to the AP service with trusted actor controls", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("approver-1", ["purchasing.supplier.bank.approve"]))
    mockApproveSupplierBankChangeWithControls.mockResolvedValue({
      bankChangeRequest: { id: "change-1" },
    })

    const result = await approveSupplierBankChangeAction({
      organizationId: "client-org",
      changeRequestId: "change-1",
      approvedById: "client-approver",
      documentHash: "bank-change-proof-hash",
    })

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalledTimes(1)
    expect(mockApproveSupplierBankChangeWithControls).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        changeRequestId: "change-1",
        approvedById: "approver-1",
        documentHash: "bank-change-proof-hash",
      }),
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "approver-1",
        actorPermissions: ["purchasing.supplier.bank.approve"],
        lastAuthAt: expect.any(Number),
      }),
    )
    expect(mockApproveSupplierBankChangeWithControls.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
    })
  })

  it("injects the approver ID for supplier payment approval", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("approver-1", ["purchasing.ap.payment.approve"]))
    mockApproveSupplierPaymentWithControls.mockResolvedValue({
      supplierPayment: { id: "payment-approval-1" },
      approvalStatus: "APPROVED",
    })

    const result = await approveSupplierPaymentAction({
      organizationId: "client-org",
      supplierId: "supplier-1",
      bankAccountId: "bank-1",
      method: "BANK_TRANSFER",
      requestedById: "requester-1",
      approvedById: "client-approver",
      paymentDate: "2026-07-02T12:30:00.000Z",
      documentHash: "payment-document-hash",
      evidenceHash: "payment-evidence-hash",
      allocations: [{ supplierInvoiceId: "invoice-1", amount: "1500.00" }],
      idempotencyKey: "supplier-payment-approval-1",
    })

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalledTimes(1)
    expect(mockApproveSupplierPaymentWithControls).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        supplierId: "supplier-1",
        bankAccountId: "bank-1",
        requestedById: "requester-1",
        approvedById: "approver-1",
        paymentDate: "2026-07-02T12:30:00.000Z",
      }),
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "approver-1",
        actorPermissions: ["purchasing.ap.payment.approve"],
        lastAuthAt: expect.any(Number),
      }),
    )
    expect(mockApproveSupplierPaymentWithControls.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
    })
  })

  it("injects only the releaser ID for supplier payment release", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("treasury-1", ["purchasing.ap.payment.release"]))
    mockReleaseSupplierPaymentWithControls.mockResolvedValue({
      supplierPayment: { id: "payment-1" },
      ledgerStatus: "BLOCKED_PENDING_RULES",
    })

    const result = await releaseSupplierPaymentAction({
      organizationId: "client-org",
      supplierPaymentId: "payment-approval-1",
      supplierId: "client-supplier",
      requestedById: "client-requester",
      approvedById: "client-approver",
      releasedById: "client-release",
      paymentDate: "2026-07-02T12:30:00.000Z",
      documentHash: "payment-document-hash",
      evidenceHash: "payment-evidence-hash",
      allocations: [{ supplierInvoiceId: "invoice-1", amount: "1500.00" }],
      idempotencyKey: "supplier-payment-release-1",
    })

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalledTimes(1)
    expect(mockReleaseSupplierPaymentWithControls).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        supplierPaymentId: "payment-approval-1",
        releasedById: "treasury-1",
        paymentDate: "2026-07-02T12:30:00.000Z",
        documentHash: "payment-document-hash",
        evidenceHash: "payment-evidence-hash",
      }),
      expect.objectContaining({
        organizationId: "org-1",
        actorId: "treasury-1",
        actorPermissions: ["purchasing.ap.payment.release"],
        lastAuthAt: expect.any(Number),
      }),
    )
    expect(mockReleaseSupplierPaymentWithControls.mock.calls[0][0]).not.toMatchObject({
      supplierId: "client-supplier",
      requestedById: "client-requester",
      approvedById: "client-approver",
      releasedById: "client-release",
    })
  })
  it("injects the requester ID for supplier bank change requests", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("requester-1", ["purchasing.supplier.bank.request"]))
    mockRequestSupplierBankChange.mockResolvedValue({
      bankChangeRequest: { id: "change-1" },
    })

    const result = await requestSupplierBankChangeAction({
      organizationId: "client-org",
      supplierId: "supplier-1",
      requestedById: "client-user",
      mobileMoneyProvider: "MTN",
      mobileMoneyPhone: "+237699000000",
    })

    expect(result.success).toBe(true)
    expect(mockRequestSupplierBankChange).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        requestedById: "requester-1",
        supplierId: "supplier-1",
      }),
    )
  })
})
