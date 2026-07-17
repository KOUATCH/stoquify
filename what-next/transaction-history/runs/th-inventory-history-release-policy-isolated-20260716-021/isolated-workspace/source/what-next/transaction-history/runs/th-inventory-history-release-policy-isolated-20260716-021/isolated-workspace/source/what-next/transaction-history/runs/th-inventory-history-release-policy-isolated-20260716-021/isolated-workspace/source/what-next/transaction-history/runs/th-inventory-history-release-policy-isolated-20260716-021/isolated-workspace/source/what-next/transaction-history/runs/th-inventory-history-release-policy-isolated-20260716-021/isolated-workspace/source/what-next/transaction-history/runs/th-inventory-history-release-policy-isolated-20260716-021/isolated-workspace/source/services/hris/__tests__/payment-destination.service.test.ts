import {
  PaymentMethod,
  PayrollEmployeeStatus,
  PayrollPaymentDestinationChangeStatus,
} from "@prisma/client"

import { ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  approvePaymentDestinationChange,
  getPaymentEvidenceReadiness,
  requestPaymentDestinationChange,
} from "@/services/payroll/payment-evidence.service"

import {
  approveHrisPaymentDestinationChange,
  getHrisPaymentDestinationStatus,
  requestOwnHrisPaymentDestinationChange,
} from "../payment-destination.service"

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

jest.mock("@/services/payroll/payment-evidence.service", () => {
  const actual = jest.requireActual("@/services/payroll/payment-evidence.service")
  return {
    ...actual,
    applyApprovedPaymentDestinationChange: jest.fn(),
    approvePaymentDestinationChange: jest.fn(),
    getPaymentEvidenceReadiness: jest.fn(),
    rejectPaymentDestinationChange: jest.fn(),
    requestPaymentDestinationChange: jest.fn(),
  }
})

const mockScope = resolveHrisPeopleAccessScope as jest.Mock
const mockGetReadiness = getPaymentEvidenceReadiness as jest.Mock
const mockRequest = requestPaymentDestinationChange as jest.Mock
const mockApprove = approvePaymentDestinationChange as jest.Mock

function accessScope() {
  return {
    organizationId: "org-1",
    authority: {
      kind: "TENANT_HRIS_ADMIN",
      label: "Tenant HRIS administration",
      basis: "HRIS_PERMISSION",
      reportingLineAuthority: false,
      effectiveDating: "NOT_APPLICABLE",
      historicalAccessSupported: false,
      delegationSupported: false,
    },
    managedLocations: [],
    employeeIds: null,
    limitations: [],
  }
}

function paymentDestinationChange() {
  return {
    id: "dest-change-1",
    employeeId: "emp-1",
    employeeDisplayName: "Ada Payroll",
    status: PayrollPaymentDestinationChangeStatus.REQUESTED,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    maskedDestination: "***1234",
    requestedById: "requester-sensitive-id",
    approvedById: null,
    appliedById: null,
    requestedAt: "2026-07-15T00:00:00.000Z",
    approvedAt: null,
    appliedAt: null,
    requestReason: "Sensitive workflow reason",
    decisionReason: null,
    evidenceDocumentHash: "sha256:request-evidence",
    approvalEvidenceHashPresent: false,
    paymentDestinationHashPresent: true,
    redactions: ["PAYMENT_DETAILS_REDACTED", "DESTINATION_HASH_HIDDEN"],
  }
}

function readiness() {
  return {
    employees: [{
      id: "emp-1",
      employeeNumber: "EMP-001",
      displayName: "Ada Payroll",
      status: PayrollEmployeeStatus.ACTIVE,
      paymentDestination: {
        state: "PENDING_APPROVAL",
        method: PaymentMethod.BANK_TRANSFER,
        maskedDestination: "***1234",
        approvedEvidenceHashPresent: false,
        paymentDestinationHashPresent: true,
        latestChange: paymentDestinationChange(),
      },
      blockers: ["APPROVED_PAYMENT_DESTINATION_EVIDENCE_MISSING"],
      evidence: {
        paymentEvidenceHashes: ["sha256:request-evidence"],
      },
    }],
    summary: {},
  }
}

describe("HRIS payment destination boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockScope.mockResolvedValue(accessScope())
    mockGetReadiness.mockResolvedValue(readiness())
    mockRequest.mockResolvedValue({
      paymentDestinationChange: paymentDestinationChange(),
      businessEventId: "event-request",
    })
  })

  it("binds self-service requests to the authenticated employee and returns masked workflow data", async () => {
    const client = {
      payrollEmployee: {
        findFirst: jest.fn().mockResolvedValue({ id: "emp-1" }),
      },
    }

    const result = await requestOwnHrisPaymentDestinationChange({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: ["hris.self_service.request"],
      employeeId: "client-selected-employee",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountNumber: "1234 5678 9012 1234",
      requestReason: "Bank destination update",
      evidenceDocumentHash: "sha256:request-evidence",
    } as any, client as any)

    expect(client.payrollEmployee.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        userId: "user-1",
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "user-1",
      employeeId: "emp-1",
      actorPermissions: expect.arrayContaining([
        "hris.self_service.request",
        "payroll.payment_destination.request",
      ]),
    }), client)
    expect(result.paymentDestinationChange).toMatchObject({
      employeeId: "emp-1",
      maskedDestination: "***1234",
      privacy: {
        rawValueStored: false,
        revealAllowed: false,
        exportMode: "MASKED_STATUS_ONLY",
      },
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("1234567890121234")
    expect(serialized).not.toContain("requester-sensitive-id")
    expect(serialized).not.toContain("Sensitive workflow reason")
    expect(serialized).not.toContain("sha256:request-evidence")
  })

  it("returns only scoped, masked readiness through the administrative read boundary", async () => {
    const client = {}

    const result = await getHrisPaymentDestinationStatus({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    }, client as any)

    expect(mockScope).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "manager-1",
      employeeId: "emp-1",
    }), client)
    expect(mockGetReadiness).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: "emp-1",
      actorPermissions: expect.arrayContaining([
        "hris.people.read",
        "payroll.payment_destination.read",
      ]),
    }), client)
    expect(result.employee).toMatchObject({
      paymentDestination: {
        maskedDestination: "***1234",
        destinationFingerprintPresent: true,
      },
      payrollReleaseReadiness: {
        status: "BLOCKED",
        blockers: ["APPROVED_PAYMENT_DESTINATION_EVIDENCE_MISSING"],
      },
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("requester-sensitive-id")
    expect(serialized).not.toContain("Sensitive workflow reason")
    expect(serialized).not.toContain("sha256:request-evidence")
  })

  it("binds approval decisions to the scoped employee before payroll delegation", async () => {
    const client = {
      payrollPaymentDestinationChangeRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    }

    await expect(approveHrisPaymentDestinationChange({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      paymentDestinationChangeRequestId: "other-employee-request",
      decisionReason: "Evidence verified",
      approvalEvidenceHash: "sha256:approval-evidence",
    }, client as any)).rejects.toBeInstanceOf(NotFoundError)

    expect(client.payrollPaymentDestinationChangeRequest.findFirst)
      .toHaveBeenCalledWith({
        where: {
          id: "other-employee-request",
          organizationId: "org-1",
          employeeId: "emp-1",
          deletedAt: null,
        },
        select: { id: true },
      })
    expect(mockApprove).not.toHaveBeenCalled()
  })

  it("rejects self-service requests without the dedicated request permission", async () => {
    await expect(requestOwnHrisPaymentDestinationChange({
      organizationId: "org-1",
      actorId: "user-1",
      actorPermissions: [],
      paymentMethod: PaymentMethod.CASH,
      requestReason: "Cash destination update",
      evidenceDocumentHash: "sha256:request-evidence",
    }, {} as any)).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockRequest).not.toHaveBeenCalled()
  })
})
