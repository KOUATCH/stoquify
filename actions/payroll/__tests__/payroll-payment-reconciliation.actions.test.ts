import { revalidatePath } from "next/cache"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  getPayrollPaymentReconciliation,
  recordPayrollPaymentSettlementEvidence,
} from "@/services/payroll/payment-reconciliation.service"

import {
  getPayrollPaymentReconciliationAction,
  recordPayrollPaymentSettlementEvidenceAction,
} from "../payroll-payment-reconciliation.actions"

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
    assertCanUseOrganization: jest.fn(),
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

jest.mock("@/services/payroll/payment-reconciliation.service", () => {
  const actual = jest.requireActual("@/services/payroll/payment-reconciliation.service")
  return {
    ...actual,
    getPayrollPaymentReconciliation: jest.fn(),
    recordPayrollPaymentSettlementEvidence: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPayrollPaymentReconciliation = getPayrollPaymentReconciliation as jest.Mock
const mockRecordPayrollPaymentSettlementEvidence = recordPayrollPaymentSettlementEvidence as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "controller-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.payments.reconciliation.read",
    accessIntent: "read",
    mode: "enforce",
    result: "allow",
    allowed: true,
    wouldBlock: false,
    reason: "Tenant module entitlement is available.",
    entitlement: { moduleSlug: "payroll", status: "active", source: "requested_modules", startsAt: null, endsAt: null, readOnly: false, trial: false },
    missingDependencies: [],
    rbacWildcardPresent: false,
    rbacWildcardBypassedEntitlement: false,
    hardEnforcementEnabled: true,
    evaluatedAt: "2026-06-26T00:00:00.000Z",
    ...overrides,
  }
}

function rbacContext(userId = "controller-1", permissions: string[] = ["payments.reconciliation.read"]) {
  return {
    userId,
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: {
      id: userId,
      roles: [],
      permissions,
      organizationId: "org-1",
    },
  }
}

describe("payroll payment reconciliation actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: new Date("2026-06-30T11:59:00.000Z").getTime() } })
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
    mockGetPayrollPaymentReconciliation.mockResolvedValue({
      organizationId: "org-1",
      summary: { batchCount: 1 },
      batches: [{ id: "batch-1" }],
    })
    mockRecordPayrollPaymentSettlementEvidence.mockResolvedValue({
      payrollPaymentBatchId: "batch-1",
      status: "SETTLED",
      reconciliationStatus: "SETTLED",
      businessEventId: "event-1",
      settlementEvidenceHash: "sha256:settlement",
    })
  })

  it("derives tenant and actor context for reconciliation reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("controller-1", ["payments.reconciliation.read"]))

    const result = await getPayrollPaymentReconciliationAction({
      organizationId: "client-org",
      actorId: "client-actor",
      payrollPaymentBatchId: "batch-1",
      limit: 10,
    })

    expect(result.success).toBe(true)
    expect(mockGetPayrollPaymentReconciliation).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["payments.reconciliation.read"],
      payrollPaymentBatchId: "batch-1",
      limit: 10,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      userId: "controller-1",
      moduleSlug: "payroll",
      surface: "payroll.payments.reconciliation.read",
      accessIntent: "read",
      mode: "enforce",
    }))
  })

  it("requires fresh authentication before recording settlement evidence", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await recordPayrollPaymentSettlementEvidenceAction({
      payrollPaymentBatchId: "batch-1",
      evidenceHash: "sha256:settlement",
      idempotencyKey: "settlement-key-1",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Fresh authentication required",
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockRecordPayrollPaymentSettlementEvidence).not.toHaveBeenCalled()
  })

  it("derives tenant, actor, and fresh-auth context for settlement evidence", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("controller-1", ["payroll.payments.reconcile"]))

    const result = await recordPayrollPaymentSettlementEvidenceAction({
      organizationId: "client-org",
      actorId: "client-actor",
      payrollPaymentBatchId: "batch-1",
      settlementStatus: "settled",
      evidenceHash: "sha256:settlement",
      sourceRegisterHash: "sha256:register",
      matchRecordId: "match-1",
      idempotencyKey: "settlement-key-1",
    })

    expect(result.success).toBe(true)
    expect(mockRecordPayrollPaymentSettlementEvidence).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "controller-1",
      actorPermissions: ["payroll.payments.reconcile"],
      payrollPaymentBatchId: "batch-1",
      settlementStatus: "settled",
      evidenceHash: "sha256:settlement",
      sourceRegisterHash: "sha256:register",
      matchRecordId: "match-1",
      lastAuthAt: new Date("2026-06-30T11:59:00.000Z"),
      now: expect.any(Date),
    }))
    expect(mockRecordPayrollPaymentSettlementEvidence.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      actorId: "client-actor",
    })
    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/dashboard/payroll", "page"],
      ["/[locale]/dashboard/payroll", "page"],
      ["/dashboard/payroll/payments", "page"],
      ["/[locale]/dashboard/payroll/payments", "page"],
    ])
  })

  it("returns a client-safe RBAC denial for reconciliation reads", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getPayrollPaymentReconciliationAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockGetPayrollPaymentReconciliation).not.toHaveBeenCalled()
  })
})
