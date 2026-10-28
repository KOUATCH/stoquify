const mockRevalidateTag = jest.fn()

jest.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}))

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {},
  requireFreshAuth: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => {
  class MockRbacError extends Error {
    constructor(
      message: string,
      public readonly code: "UNAUTHENTICATED" | "NO_ACTIVE_ORG" | "FORBIDDEN",
      public readonly status: 401 | 403,
    ) {
      super(message)
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

import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { commitPOSSale } from "@/services/pos/pos.service"

import { commitPOSSaleAction } from "../tender.actions"

const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCommitPOSSale = commitPOSSale as jest.Mock

const saleInput = {
  clientCommitId: "pos-commit-electronic-1",
  salesOrderId: "sale-1",
  locationId: "loc-1",
  terminalId: "terminal-1",
  sessionId: "session-1",
  tenders: [{
    method: "CARD",
    amount: 100,
    paymentTransactionId: "payment-transaction-1",
  }],
  receipt: { channel: "NONE", locale: "EN" },
}

describe("POS electronic tender action contract", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      userId: "cashier-1",
      orgId: "org-1",
      permissions: ["pos.use"],
      roles: [],
      isSuperUser: false,
      fetchedAt: Date.now(),
      source: "better-auth",
    })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockCommitPOSSale.mockResolvedValue({
      clientCommitId: saleInput.clientCommitId,
      resultSchemaVersion: 1,
      replayed: false,
      saleId: "sale-1",
      orderNumber: "SO-001",
    })
  })

  it("passes provider transaction identity through the protected commit action", async () => {
    const result = await commitPOSSaleAction(saleInput)

    expect(result.success).toBe(true)
    expect(mockCommitPOSSale).toHaveBeenCalledWith({
      ...saleInput,
      organizationId: "org-1",
      userId: "cashier-1",
    })
  })

  it("rejects a manual electronic reference without authoritative transaction evidence", async () => {
    const result = await commitPOSSaleAction({
      ...saleInput,
      tenders: [{ method: "CARD", amount: 100, reference: "MANUAL-AUTH-1" }],
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 400,
      code: "VALIDATION_ERROR",
    }))
    expect(mockCommitPOSSale).not.toHaveBeenCalled()
  })
})
