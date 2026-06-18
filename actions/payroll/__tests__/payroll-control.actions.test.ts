import { revalidatePath } from "next/cache"
import { PaymentMethod } from "@prisma/client"

import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { requirePermission, RbacError } from "@/lib/security/rbac"
import {
  getPayrollWorkbenchData,
  preparePayrollDeclarations,
  releasePayrollPaymentBatch,
} from "@/services/payroll/payroll-control.service"

import {
  getPayrollWorkbenchAction,
  preparePayrollDeclarationsAction,
  releasePayrollPaymentBatchAction,
} from "../payroll-control.actions"

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

jest.mock("@/services/payroll/payroll-control.service", () => ({
  getPayrollWorkbenchData: jest.fn(),
  releasePayrollPaymentBatch: jest.fn(),
  preparePayrollDeclarations: jest.fn(),
  calculatePayrollRun: jest.fn(),
  approveAndPostPayrollRun: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockGetPayrollWorkbenchData = getPayrollWorkbenchData as jest.Mock
const mockReleasePayrollPaymentBatch = releasePayrollPaymentBatch as jest.Mock
const mockPreparePayrollDeclarations = preparePayrollDeclarations as jest.Mock
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
    user: {
      id: userId,
      roles: [],
      permissions,
      organizationId: "org-1",
    },
  }
}

describe("payroll control actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({})
  })

  it("returns a client-safe RBAC denial for the payroll workbench", async () => {
    mockRequirePermission.mockRejectedValue(new RbacError("Forbidden", "FORBIDDEN", 403))

    const result = await getPayrollWorkbenchAction({})

    expect(result).toEqual(expect.objectContaining({
      success: false,
      data: null,
      error: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
      retryable: false,
    }))
    expect(result).toHaveProperty("correlationId")
    expect(mockGetPayrollWorkbenchData).not.toHaveBeenCalled()
  })

  it("requires fresh auth before releasing payroll payments", async () => {
    mockRequireFreshAuth.mockRejectedValue(new FreshAuthRequiredError())

    const result = await releasePayrollPaymentBatchAction({
      payrollRunId: "run-1",
      requestedById: "requester-1",
      method: PaymentMethod.BANK_TRANSFER,
      paymentDate: "2026-06-30",
      idempotencyKey: "payroll-payment-key-1",
      allocations: [{ payslipId: "payslip-1", employeeId: "employee-1", amount: "95800.00" }],
    })

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
    expect(mockReleasePayrollPaymentBatch).not.toHaveBeenCalled()
  })

  it("derives payroll payment tenant and release actor fields from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("treasury-1", ["payroll.payments.release"]))
    mockReleasePayrollPaymentBatch.mockResolvedValue({
      payrollPaymentBatch: { id: "batch-1" },
      ledgerStatus: "POSTED",
    })

    const result = await releasePayrollPaymentBatchAction({
      organizationId: "client-org",
      payrollRunId: "run-1",
      requestedById: "requester-1",
      approvedById: "client-approver",
      releasedById: "client-releaser",
      method: PaymentMethod.BANK_TRANSFER,
      paymentDate: "2026-06-30",
      idempotencyKey: "payroll-payment-key-1",
      allocations: [{ payslipId: "payslip-1", employeeId: "employee-1", amount: "95800.00" }],
    })

    expect(result.success).toBe(true)
    expect(mockReleasePayrollPaymentBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        approvedById: "treasury-1",
        releasedById: "treasury-1",
        actorPermissions: ["payroll.payments.release"],
      }),
    )
    expect(mockReleasePayrollPaymentBatch.mock.calls[0][0]).not.toMatchObject({
      organizationId: "client-org",
      approvedById: "client-approver",
      releasedById: "client-releaser",
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/payroll", "page")
  })

  it("derives declaration preparer from the authenticated context", async () => {
    mockRequirePermission.mockResolvedValue(rbacContext("payroll-1", ["payroll.declarations.prepare"]))
    mockPreparePayrollDeclarations.mockResolvedValue({
      payrollRunId: "run-1",
      declarations: [{ id: "declaration-1" }],
    })

    const result = await preparePayrollDeclarationsAction({
      organizationId: "client-org",
      payrollRunId: "run-1",
      preparedById: "client-user",
    })

    expect(result.success).toBe(true)
    expect(mockPreparePayrollDeclarations).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        payrollRunId: "run-1",
        preparedById: "payroll-1",
      }),
    )
  })
})
