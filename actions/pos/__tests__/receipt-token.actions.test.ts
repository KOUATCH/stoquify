import { revalidateTag } from "next/cache"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { assertCanUseOrganization, requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  listPublicReceiptAccessTokens,
  revokePublicReceiptAccessToken,
  searchPublicReceiptSales,
} from "@/services/pos/public-receipt-token-registry.service"

import {
  getPublicReceiptAccessTokensAction,
  getPublicReceiptTokenManagementCapabilityAction,
  revokePublicReceiptAccessTokenAction,
  searchPublicReceiptSalesAction,
} from "../receipt-token.actions"

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
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
    assertCanUseOrganization: jest.fn(),
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

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/pos/public-receipt-token-registry.service", () => ({
  listPublicReceiptAccessTokens: jest.fn(),
  revokePublicReceiptAccessToken: jest.fn(),
  searchPublicReceiptSales: jest.fn(),
}))

const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockListPublicReceiptAccessTokens = listPublicReceiptAccessTokens as jest.Mock
const mockRevokePublicReceiptAccessToken = revokePublicReceiptAccessToken as jest.Mock
const mockSearchPublicReceiptSales = searchPublicReceiptSales as jest.Mock
const mockRevalidateTag = revalidateTag as jest.Mock

function rbacContext(permissions: string[] = ["pos.receipts.revoke"]) {
  return {
    userId: "operator-1",
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    organizationName: "Demo Org",
    user: {
      id: "operator-1",
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

describe("receipt token actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: "2026-07-03T12:00:00.000Z" },
    })
    mockRequirePermission.mockResolvedValue(rbacContext())
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockListPublicReceiptAccessTokens.mockResolvedValue([
      {
        id: "token-row-1",
        tokenIdSuffix: "row-1",
        salesOrderId: "sale-1",
        status: "ACTIVE",
        isActive: true,
        issuedAt: "2026-07-03T12:00:00.000Z",
        expiresAt: "2026-08-02T12:00:00.000Z",
        lastAccessedAt: null,
        accessCount: 0,
        revokedAt: null,
        revocationReason: null,
      },
    ])
    mockRevokePublicReceiptAccessToken.mockResolvedValue({
      id: "token-row-1",
      salesOrderId: "sale-1",
      status: "REVOKED",
      revokedAt: new Date("2026-07-03T12:05:00.000Z"),
    })
    mockSearchPublicReceiptSales.mockResolvedValue([
      {
        salesOrderId: "sale-1",
        orderNumber: "POS-20260703-0001",
        completedAt: "2026-07-03T12:00:00.000Z",
        total: 12500,
        tokenCount: 2,
        activeTokenCount: 1,
        revokedTokenCount: 1,
        expiredTokenCount: 0,
      },
    ])
  })

  it("reports receipt token management capability through the protected POS module gate", async () => {
    const result = await getPublicReceiptTokenManagementCapabilityAction({})

    expect(result).toEqual({
      success: true,
      data: {
        canManageReceiptTokens: true,
        moduleSlug: "pos",
        permission: "pos.receipts.revoke",
      },
      error: null,
      status: 200,
    })
    expect(mockRequireFreshAuth).not.toHaveBeenCalled()
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.receipts.revoke", {
      resource: "PublicReceiptAccessToken",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "operator-1",
        actorPermissions: ["pos.receipts.revoke"],
        moduleSlug: "pos",
        surface: "actions/pos/receipt-token.actions.ts:getPublicReceiptTokenManagementCapabilityAction",
        surfaceType: "action",
        accessIntent: "read",
        mode: "enforce",
        audit: true,
      }),
    )
    expect(mockListPublicReceiptAccessTokens).not.toHaveBeenCalled()
    expect(mockSearchPublicReceiptSales).not.toHaveBeenCalled()
    expect(mockRevokePublicReceiptAccessToken).not.toHaveBeenCalled()
  })

  it("returns a safe capability denial when receipt revoke permission is missing", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getPublicReceiptTokenManagementCapabilityAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListPublicReceiptAccessTokens).not.toHaveBeenCalled()
  })

  it("lists redacted receipt token rows with trusted tenant context", async () => {
    const result = await getPublicReceiptAccessTokensAction({ salesOrderId: "sale-1" })

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: "token-row-1",
          tokenIdSuffix: "row-1",
          salesOrderId: "sale-1",
          status: "ACTIVE",
          isActive: true,
          issuedAt: "2026-07-03T12:00:00.000Z",
          expiresAt: "2026-08-02T12:00:00.000Z",
          lastAccessedAt: null,
          accessCount: 0,
          revokedAt: null,
          revocationReason: null,
        },
      ],
      error: null,
      status: 200,
    })
    expect(mockRequireFreshAuth).not.toHaveBeenCalled()
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.receipts.revoke", {
      resource: "PublicReceiptAccessToken",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "operator-1",
        actorPermissions: ["pos.receipts.revoke"],
        moduleSlug: "pos",
        surfaceType: "action",
        accessIntent: "read",
        mode: "enforce",
        audit: true,
      }),
    )
    expect(mockListPublicReceiptAccessTokens).toHaveBeenCalledWith({
      organizationId: "org-1",
      salesOrderId: "sale-1",
    })
    expect(JSON.stringify(result)).not.toContain("tokenHash")
    expect(JSON.stringify(result)).not.toContain("jtiHash")
  })

  it("denies mismatched client tenant input before listing receipt tokens", async () => {
    mockAssertCanUseOrganization.mockRejectedValue(
      new RbacError("Forbidden: cannot access another organization", "FORBIDDEN", 403),
    )

    const result = await getPublicReceiptAccessTokensAction({
      organizationId: "attacker-org",
      salesOrderId: "sale-1",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1" }),
      "attacker-org",
    )
    expect(mockListPublicReceiptAccessTokens).not.toHaveBeenCalled()
  })

  it("returns safe validation errors for receipt token listing", async () => {
    const result = await getPublicReceiptAccessTokensAction({ salesOrderId: "" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 400,
      code: "VALIDATION_ERROR",
    }))
    expect(mockListPublicReceiptAccessTokens).not.toHaveBeenCalled()
  })

  it("searches completed receipt sales with trusted tenant context", async () => {
    const result = await searchPublicReceiptSalesAction({ query: "POS-20260703", limit: 5 })

    expect(result).toEqual({
      success: true,
      data: [
        {
          salesOrderId: "sale-1",
          orderNumber: "POS-20260703-0001",
          completedAt: "2026-07-03T12:00:00.000Z",
          total: 12500,
          tokenCount: 2,
          activeTokenCount: 1,
          revokedTokenCount: 1,
          expiredTokenCount: 0,
        },
      ],
      error: null,
      status: 200,
    })
    expect(mockRequireFreshAuth).not.toHaveBeenCalled()
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.receipts.revoke", {
      resource: "PublicReceiptAccessToken",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "operator-1",
        actorPermissions: ["pos.receipts.revoke"],
        moduleSlug: "pos",
        surfaceType: "action",
        accessIntent: "read",
        mode: "enforce",
        audit: true,
      }),
    )
    expect(mockSearchPublicReceiptSales).toHaveBeenCalledWith({
      organizationId: "org-1",
      query: "POS-20260703",
      limit: 5,
      recentDays: 30,
    })
    expect(JSON.stringify(result)).not.toContain("tokenHash")
    expect(JSON.stringify(result)).not.toContain("jtiHash")
    expect(JSON.stringify(result)).not.toContain("customer")
  })

  it("denies mismatched client tenant input before receipt sale search", async () => {
    mockAssertCanUseOrganization.mockRejectedValue(
      new RbacError("Forbidden: cannot access another organization", "FORBIDDEN", 403),
    )

    const result = await searchPublicReceiptSalesAction({
      organizationId: "attacker-org",
      query: "POS-20260703",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1" }),
      "attacker-org",
    )
    expect(mockSearchPublicReceiptSales).not.toHaveBeenCalled()
  })

  it("returns safe validation errors for receipt sale search", async () => {
    const result = await searchPublicReceiptSalesAction({ query: "x".repeat(81) })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 400,
      code: "VALIDATION_ERROR",
    }))
    expect(mockSearchPublicReceiptSales).not.toHaveBeenCalled()
  })
  it("revokes a receipt token with trusted tenant and actor context", async () => {
    const result = await revokePublicReceiptAccessTokenAction({
      tokenId: "token-row-1",
      salesOrderId: "sale-1",
      reason: "customer requested revocation",
    })

    expect(result).toEqual({
      success: true,
      data: {
        tokenId: "token-row-1",
        salesOrderId: "sale-1",
        status: "REVOKED",
        revokedAt: "2026-07-03T12:05:00.000Z",
      },
      error: null,
      status: 200,
    })
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(300)
    expect(mockRequirePermission).toHaveBeenCalledWith("pos.receipts.revoke", {
      resource: "PublicReceiptAccessToken",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "operator-1",
        actorPermissions: ["pos.receipts.revoke"],
        moduleSlug: "pos",
        surfaceType: "action",
        accessIntent: "write",
        mode: "enforce",
        audit: true,
      }),
    )
    expect(mockRevokePublicReceiptAccessToken).toHaveBeenCalledWith({
      organizationId: "org-1",
      tokenId: "token-row-1",
      revokedById: "operator-1",
      reason: "customer requested revocation",
    })
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-receipts")
    expect(mockRevalidateTag).toHaveBeenCalledWith("pos-receipt-sale-1")
  })

  it("requires fresh auth before RBAC or service work", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await revokePublicReceiptAccessTokenAction({ tokenId: "token-row-1" })

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
    expect(mockRevokePublicReceiptAccessToken).not.toHaveBeenCalled()
  })

  it("returns a safe RBAC denial when receipt revoke permission is missing", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await revokePublicReceiptAccessTokenAction({ tokenId: "token-row-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockRevokePublicReceiptAccessToken).not.toHaveBeenCalled()
  })

  it("denies mismatched client tenant input before revocation", async () => {
    mockAssertCanUseOrganization.mockRejectedValue(
      new RbacError("Forbidden: cannot access another organization", "FORBIDDEN", 403),
    )

    const result = await revokePublicReceiptAccessTokenAction({
      organizationId: "attacker-org",
      tokenId: "token-row-1",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1" }),
      "attacker-org",
    )
    expect(mockRevokePublicReceiptAccessToken).not.toHaveBeenCalled()
  })

  it("denies revocation when the POS module is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue({ allowed: false })

    const result = await revokePublicReceiptAccessTokenAction({ tokenId: "token-row-1" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockRevokePublicReceiptAccessToken).not.toHaveBeenCalled()
  })

  it("returns safe validation errors without calling the registry service", async () => {
    const result = await revokePublicReceiptAccessTokenAction({
      tokenId: "",
      reason: "no",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 400,
      code: "VALIDATION_ERROR",
    }))
    expect(mockRevokePublicReceiptAccessToken).not.toHaveBeenCalled()
  })
})
