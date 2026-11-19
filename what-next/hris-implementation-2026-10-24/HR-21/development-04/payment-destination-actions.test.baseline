import { PaymentMethod } from "@prisma/client"
import { revalidatePath } from "next/cache"

import { FreshAuthRequiredError, requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import {
  approveHrisPaymentDestinationChange,
  getHrisPaymentDestinationStatus,
  requestOwnHrisPaymentDestinationChange,
} from "@/services/hris/payment-destination.service"

import {
  approveHrisPaymentDestinationChangeAction,
  getHrisPaymentDestinationStatusAction,
  requestOwnHrisPaymentDestinationChangeAction,
} from "../payment-destination.actions"

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {},
  assertCanUseOrganization: jest.fn(),
  isRbacError: jest.fn(() => false),
  requirePermission: jest.fn(),
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

jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("@/services/hris/payment-destination.service", () => ({
  applyApprovedHrisPaymentDestinationChange: jest.fn(),
  approveHrisPaymentDestinationChange: jest.fn(),
  getHrisPaymentDestinationStatus: jest.fn(),
  getOwnHrisPaymentDestinationStatus: jest.fn(),
  rejectHrisPaymentDestinationChange: jest.fn(),
  requestHrisPaymentDestinationChange: jest.fn(),
  requestOwnHrisPaymentDestinationChange: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockGetStatus = getHrisPaymentDestinationStatus as jest.Mock
const mockRequestOwn = requestOwnHrisPaymentDestinationChange as jest.Mock
const mockApprove = approveHrisPaymentDestinationChange as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

function rbacContext(userId: string, permissions: string[]) {
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

describe("HRIS payment destination actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({
      claims: { lastAuthAt: "2026-07-15T00:00:00.000Z" },
    })
    mockGetStatus.mockResolvedValue({ organizationId: "org-1", employee: {} })
    mockRequestOwn.mockResolvedValue({
      paymentDestinationChange: { id: "dest-change-1", maskedDestination: "***1234" },
    })
    mockApprove.mockResolvedValue({
      paymentDestinationChange: { id: "dest-change-1", status: "APPROVED" },
    })
  })

  it("derives tenant and actor context for administrative reads", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("manager-1", ["hris.people.read"]),
    )

    const result = await getHrisPaymentDestinationStatusAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
    })

    expect(result.success).toBe(true)
    expect(mockGetStatus).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    }))
  })

  it("requires fresh authentication before a self-service destination request", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await requestOwnHrisPaymentDestinationChangeAction({
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountNumber: "1234 5678 9012 1234",
      requestReason: "Bank update",
      evidenceDocumentHash: "sha256:request-evidence",
    })

    expect(result).toEqual(expect.objectContaining({
      success: false,
      status: 403,
      code: "FRESH_AUTH_REQUIRED",
    }))
    expect(mockRequirePermission).not.toHaveBeenCalled()
    expect(mockRequestOwn).not.toHaveBeenCalled()
  })

  it("binds self-service identity to the session and drops submitted authority fields", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("employee-user-1", ["hris.self_service.request"]),
    )

    const result = await requestOwnHrisPaymentDestinationChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      actorPermissions: ["payroll.payment_destination.apply"],
      employeeId: "other-employee",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountNumber: "1234 5678 9012 1234",
      requestReason: "Bank update",
      evidenceDocumentHash: "sha256:request-evidence",
    })

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.self_service.request", {
      resource: "HrisPaymentDestination",
    })
    expect(mockRequestOwn).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["hris.self_service.request"],
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    }))
    expect(mockRequestOwn.mock.calls[0][0]).not.toHaveProperty("employeeId")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/people", "page")
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/dashboard/payroll/command-center",
      "page",
    )
  })

  it("uses the HRIS manage gate and fresh authentication for approval", async () => {
    mockRequirePermission.mockResolvedValue(
      rbacContext("checker-1", ["hris.people.manage"]),
    )

    const result = await approveHrisPaymentDestinationChangeAction({
      organizationId: "client-org",
      actorId: "client-actor",
      employeeId: "emp-1",
      paymentDestinationChangeRequestId: "dest-change-1",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval-evidence",
    })

    expect(result.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalled()
    expect(mockRequirePermission).toHaveBeenCalledWith("hris.people.manage", {
      resource: "HrisPaymentDestination",
    })
    expect(mockApprove).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
    }))
  })
})
