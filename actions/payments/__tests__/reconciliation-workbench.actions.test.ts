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

jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {},
  requireFreshAuth: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/payments/payment-reconciliation-workbench.service", () => ({
  getPaymentReconciliationWorkbench: jest.fn(),
}))

import {
  assertCanUseOrganization,
  requirePermission,
} from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getPaymentReconciliationWorkbench } from "@/services/payments/payment-reconciliation-workbench.service"

import { getPaymentReconciliationWorkbenchAction } from "../reconciliation-workbench.actions"

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPaymentReconciliationWorkbench = getPaymentReconciliationWorkbench as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-session",
    userId: "user-session",
    moduleSlug: "payment_reconciliation",
    surfaceType: "action",
    surface: "actions/payments/reconciliation-workbench.actions.ts:getPaymentReconciliationWorkbenchAction",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: {
      moduleSlug: "payment_reconciliation",
      status: "active",
      source: "requested_modules",
      startsAt: null,
      endsAt: null,
      readOnly: false,
      trial: false,
    },
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: false,
    evaluatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("payment reconciliation workbench action module access", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue({
      orgId: "org-session",
      userId: "user-session",
      permissions: ["payments.reconciliation.read"],
    })
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockGetPaymentReconciliationWorkbench.mockResolvedValue({ kind: "workbench" })
  })

  it("enforces payment reconciliation module access before reading the workbench", async () => {
    const result = await getPaymentReconciliationWorkbenchAction({ period: "7d" })

    expect(result).toEqual({
      success: true,
      data: { kind: "workbench" },
      error: null,
      status: 200,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("payments.reconciliation.read", {
      resource: "PaymentReconciliation",
      auditAllowed: false,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith({
      organizationId: "org-session",
      userId: "user-session",
      actorPermissions: ["payments.reconciliation.read"],
      moduleSlug: "payment_reconciliation",
      surfaceType: "action",
      surface: "actions/payments/reconciliation-workbench.actions.ts:getPaymentReconciliationWorkbenchAction",
      accessIntent: "read",
      mode: "enforce",
      audit: true,
    })
    expect(mockGetPaymentReconciliationWorkbench).toHaveBeenCalledWith({
      organizationId: "org-session",
      period: "7d",
    })
  })

  it("denies direct workbench reads before service access when the module is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({
      result: "deny",
      allowed: false,
      wouldBlock: true,
      entitlement: null,
      reason: "Tenant is not entitled to this module.",
    }))

    const result = await getPaymentReconciliationWorkbenchAction({ period: "mtd" })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(mockGetPaymentReconciliationWorkbench).not.toHaveBeenCalled()
    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
  })
})
