const mockRevalidateTag = jest.fn()
jest.mock("@/services/pos/checkout.service", () => ({ preparePOSCheckout: jest.fn() }))
import { preparePOSCheckout } from "@/services/pos/checkout.service"
import { logger } from "@/lib/logger"

jest.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}))

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
    assertCanUseOrganization: jest.fn(),
    isRbacError: (error: unknown) => error instanceof MockRbacError,
    requirePermission: jest.fn(),
  }
})

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/pos/pos.service", () => ({
  commitPOSSale: jest.fn(),
  refundPOSSale: jest.fn(),
  voidPOSSale: jest.fn(),
}))

import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { commitPOSSale, refundPOSSale, voidPOSSale } from "@/services/pos/pos.service"

import { commitPOSSaleAction, refundPOSSaleAction, voidPOSSaleAction } from "../tender.actions"

const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCommitPOSSale = commitPOSSale as jest.Mock
const mockRefundPOSSale = refundPOSSale as jest.Mock
const mockVoidPOSSale = voidPOSSale as jest.Mock

const saleInput = {
  checkoutLeaseId: "00000000-0000-4000-8000-000000000001",
  clientCommitId: "pos-commit-1",
  salesOrderId: "sale-1",
  locationId: "loc-1",
  terminalId: "terminal-1",
  sessionId: "session-1",
  tenders: [{ method: "CASH", amount: 100 }],
  receipt: {
    channel: "NONE",
    locale: "EN",
  },
}

const correctionInput = {
  salesOrderId: "sale-1",
  locationId: "loc-1",
  terminalId: "terminal-1",
  sessionId: "session-1",
  reason: "Customer correction request",
  notes: "Counter approved after supervisor review",
}

function rbacContext(permissions: string[] = ["pos.use"]) {
  return {
    userId: "cashier-1",
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
  }
}

function expectPosModuleGate(surface: string, permissions: string[]) {
  expect(mockObserveModuleAccess).toHaveBeenCalledWith({
    organizationId: "org-1",
    userId: "cashier-1",
    actorPermissions: permissions,
    moduleSlug: "pos",
    surfaceType: "action",
    surface,
    accessIntent: "write",
    mode: "enforce",
    audit: true,
  })
}

describe("POS tender actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: Date.now() } })
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockCommitPOSSale.mockResolvedValue({
      clientCommitId: "pos-commit-1",
      resultSchemaVersion: 1,
      replayed: false,
      saleId: "sale-1",
      orderNumber: "SO-001",
      receipt: { digitalReceiptUrl: "" },
      delivery: null,
    })
    mockRefundPOSSale.mockResolvedValue({
      saleId: "sale-1",
      refundIds: ["refund-1"],
      refundJournalEntryIds: ["journal-1"],
      refundPostingBatchIds: ["batch-1"],
    })
    mockVoidPOSSale.mockResolvedValue({
      saleId: "sale-1",
      voidJournalEntryId: "journal-void-1",
      voidPostingBatchId: "batch-void-1",
    })
  })

  it("passes the client commit identity through the protected cash-sale workflow", async () => {
    const result = await commitPOSSaleAction(saleInput)

    expect(result).toEqual({
      success: true,
      data: {
        clientCommitId: "pos-commit-1",
        resultSchemaVersion: 1,
        replayed: false,
        saleId: "sale-1",
        orderNumber: "SO-001",
        receipt: { digitalReceiptUrl: "" },
        delivery: null,
      },
      error: null,
      status: 200,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.use", {
      resource: "POSSale",
      auditAllowed: true,
    })
    expectPosModuleGate("actions/pos/tender.actions.ts:commitPOSSaleAction", ["pos.use"])
    expect(mockCommitPOSSale).toHaveBeenCalledWith({
      ...saleInput,
      organizationId: "org-1",
      userId: "cashier-1",
    })
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-cart")
    expect(preparePOSCheckout).toHaveBeenCalledWith({ ...saleInput, organizationId: "org-1", userId: "cashier-1" })
    expect((preparePOSCheckout as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(mockCommitPOSSale.mock.invocationCallOrder[0])
  })

  it("preserves a saved sale when both cache and logging fail", async () => {
    mockRevalidateTag.mockImplementationOnce(() => { throw new Error("cache unavailable") })
    const warn = jest.spyOn(logger, "warn").mockImplementation(() => { throw new Error("logger unavailable") })
    try {
      const result = await commitPOSSaleAction(saleInput)
      expect(result).toMatchObject({ success: true, data: { saleId: "sale-1" } })
      expect(mockCommitPOSSale).toHaveBeenCalledTimes(1)
      expect(mockRevalidateTag).toHaveBeenCalledWith("customer-ar")
    } finally { warn.mockRestore() }
  })

  it("does not submit if durable request retention fails", async () => {
    ;(preparePOSCheckout as jest.Mock).mockRejectedValueOnce(new Error("checkout journal unavailable"))
    expect((await commitPOSSaleAction(saleInput)).success).toBe(false)
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
  })

  it("rejects a browser submission without checkout ownership", async () => {
    expect((await commitPOSSaleAction({ ...saleInput, checkoutLeaseId: undefined })).success).toBe(false)
    expect(preparePOSCheckout).not.toHaveBeenCalled()
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
  })

  it("denies POS sale commit when the POS module is not entitled", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const result = await commitPOSSaleAction(saleInput)

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
    }))
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it("does not report an atomic sale as failed when cache revalidation is unavailable", async () => {
    mockRevalidateTag.mockImplementationOnce(() => {
      throw new Error("cache unavailable")
    })

    const result = await commitPOSSaleAction(saleInput)

    expect(result.success).toBe(true)
    expect(mockCommitPOSSale).toHaveBeenCalledTimes(1)
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-cart")
  })

  it("enforces the POS module before refunding a completed sale", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["pos.transactions.refund"]))

    const result = await refundPOSSaleAction(correctionInput)

    expect(result).toEqual({
      success: true,
      data: {
        saleId: "sale-1",
        refundIds: ["refund-1"],
        refundJournalEntryIds: ["journal-1"],
        refundPostingBatchIds: ["batch-1"],
      },
      error: null,
      status: 200,
    })
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(300)
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.transactions.refund", {
      resource: "POSSaleRefund",
    })
    expectPosModuleGate("actions/pos/tender.actions.ts:refundPOSSaleAction", ["pos.transactions.refund"])
    expect(mockRefundPOSSale).toHaveBeenCalledWith({
      ...correctionInput,
      organizationId: "org-1",
      userId: "cashier-1",
    })
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-cart")
  })

  it("denies POS refunds when the POS module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["pos.transactions.refund"]))
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const result = await refundPOSSaleAction(correctionInput)

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
    }))
    expect(mockRefundPOSSale).not.toHaveBeenCalled()
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })

  it("enforces the POS module before voiding a completed sale", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["pos.transactions.void"]))

    const result = await voidPOSSaleAction(correctionInput)

    expect(result).toEqual({
      success: true,
      data: {
        saleId: "sale-1",
        voidJournalEntryId: "journal-void-1",
        voidPostingBatchId: "batch-void-1",
      },
      error: null,
      status: 200,
    })
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(300)
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.transactions.void", {
      resource: "POSSaleVoid",
    })
    expectPosModuleGate("actions/pos/tender.actions.ts:voidPOSSaleAction", ["pos.transactions.void"])
    expect(mockVoidPOSSale).toHaveBeenCalledWith({
      ...correctionInput,
      organizationId: "org-1",
      userId: "cashier-1",
    })
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-cart")
  })

  it("denies POS voids when the POS module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext(["pos.transactions.void"]))
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const result = await voidPOSSaleAction(correctionInput)

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
    }))
    expect(mockVoidPOSSale).not.toHaveBeenCalled()
    expect(mockRevalidateTag).not.toHaveBeenCalled()
  })
})
