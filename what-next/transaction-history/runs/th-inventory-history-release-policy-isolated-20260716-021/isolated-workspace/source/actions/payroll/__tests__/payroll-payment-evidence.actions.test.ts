import { revalidatePath } from "next/cache"
import { PaymentMethod } from "@prisma/client"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  applyApprovedPaymentDestinationChange,
  approvePaymentDestinationChange,
  getPaymentEvidenceReadiness,
  requestPaymentDestinationChange,
} from "@/services/payroll/payment-evidence.service"

import {
  applyApprovedPaymentDestinationChangeAction,
  approvePaymentDestinationChangeAction,
  getPaymentEvidenceReadinessAction,
  requestPaymentDestinationChangeAction,
} from "../payroll-payment-evidence.actions"

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
  logger: { error: jest.fn() },
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/payroll/payment-evidence.service", () => {
  const actual = jest.requireActual("@/services/payroll/payment-evidence.service")
  return {
    ...actual,
    getPaymentEvidenceReadiness: jest.fn(),
    requestPaymentDestinationChange: jest.fn(),
    approvePaymentDestinationChange: jest.fn(),
    rejectPaymentDestinationChange: jest.fn(),
    applyApprovedPaymentDestinationChange: jest.fn(),
  }
})

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockGetPaymentEvidenceReadiness = getPaymentEvidenceReadiness as jest.Mock
const mockRequestPaymentDestinationChange = requestPaymentDestinationChange as jest.Mock
const mockApprovePaymentDestinationChange = approvePaymentDestinationChange as jest.Mock
const mockApplyApprovedPaymentDestinationChange = applyApprovedPaymentDestinationChange as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function moduleDecision(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    userId: "actor-1",
    moduleSlug: "payroll",
    surfaceType: "action",
    surface: "payroll.payment_destination.read",
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

function rbacContext(userId = "actor-1", permissions: string[] = []) {
  return {
    userId,
    orgId: "org-1",
    permissions,
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
    user: { id: userId, roles: [], permissions, organizationId: "org-1" },
  }
}

describe("payroll payment evidence actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: "2026-06-27T00:00:00.000Z" } })
    mockObserveModuleAccess.mockResolvedValue(moduleDecision())
  })

  it("passes authenticated tenant and actor context into payment evidence readiness reads", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1", ["payroll.payment_destination.read"]))
    mockGetPaymentEvidenceReadiness.mockResolvedValue({ organizationId: "org-1", employees: [], summary: {} })

    const result = await getPaymentEvidenceReadinessAction({
      organizationId: "client-org",
      employeeId: "employee-1",
      expectedAttendanceSourceHashes: { "employee-1": "sha256:attendance" },
    })

    expect(result.success).toBe(true)
    expect(mockGetPaymentEvidenceReadiness).toHaveBeenCalledWith({
      organizationId: "org-1",
      employeeId: "employee-1",
      expectedAttendanceSourceHashes: { "employee-1": "sha256:attendance" },
      actorId: "reader-1",
      actorPermissions: ["payroll.payment_destination.read"],
    })
  })

  it("blocks payment evidence reads when the payroll module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("reader-1", ["payroll.payment_destination.read"]))
    mockObserveModuleAccess.mockResolvedValue(moduleDecision({ result: "deny", allowed: false, wouldBlock: true, entitlement: null }))

    const result = await getPaymentEvidenceReadinessAction({})

    expect(result).toEqual(expect.objectContaining({ success: false, data: null, status: 403, code: "FORBIDDEN" }))
    expect(mockGetPaymentEvidenceReadiness).not.toHaveBeenCalled()
  })

  it("requires fresh auth before requesting payment destination changes", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await requestPaymentDestinationChangeAction({
      employeeId: "employee-1",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountNumber: "1234567890121234",
      requestReason: "Bank account update",
      evidenceDocumentHash: "sha256:request-evidence",
    })

    expect(result).toEqual(expect.objectContaining({ success: false, data: null, status: 403, code: "FRESH_AUTH_REQUIRED" }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockRequestPaymentDestinationChange).not.toHaveBeenCalled()
  })

  it("derives tenant and actor context for destination request, approval, and application actions", async () => {
    mockRequirePermission
      .mockResolvedValueOnce(rbacContext("hr-1", ["payroll.payment_destination.request"]))
      .mockResolvedValueOnce(rbacContext("finance-1", ["payroll.payment_destination.approve"]))
      .mockResolvedValueOnce(rbacContext("ops-1", ["payroll.payment_destination.apply"]))
    mockRequestPaymentDestinationChange.mockResolvedValue({ businessEventId: "event-request", paymentDestinationChange: { id: "dest-change-1" } })
    mockApprovePaymentDestinationChange.mockResolvedValue({ businessEventId: "event-approve", paymentDestinationChange: { id: "dest-change-1" } })
    mockApplyApprovedPaymentDestinationChange.mockResolvedValue({ businessEventId: "event-apply", paymentDestinationChange: { id: "dest-change-1" } })

    await requestPaymentDestinationChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "employee-1",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountNumber: "1234567890121234",
      requestReason: "Bank account update",
      evidenceDocumentHash: "sha256:request-evidence",
    })
    await approvePaymentDestinationChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      paymentDestinationChangeRequestId: "dest-change-1",
      decisionReason: "Approved",
      approvalEvidenceHash: "sha256:approval-evidence",
    })
    await applyApprovedPaymentDestinationChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      paymentDestinationChangeRequestId: "dest-change-1",
    })

    expect(mockRequestPaymentDestinationChange).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", actorId: "hr-1" }))
    expect(mockApprovePaymentDestinationChange).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", actorId: "finance-1" }))
    expect(mockApplyApprovedPaymentDestinationChange).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", actorId: "ops-1" }))
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/payroll", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll/attendance", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]/dashboard/payroll/attendance", "page")
  })

  it("returns client-safe RBAC denials before payment destination service calls", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await requestPaymentDestinationChangeAction({
      employeeId: "employee-1",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountNumber: "1234567890121234",
      requestReason: "Bank account update",
      evidenceDocumentHash: "sha256:request-evidence",
    })

    expect(result).toEqual(expect.objectContaining({ success: false, data: null, error: "Forbidden", status: 403, code: "FORBIDDEN" }))
    expect(mockRequestPaymentDestinationChange).not.toHaveBeenCalled()
  })
})