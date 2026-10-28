import {
  PaymentMethod,
  PayrollPaymentDestinationChangeStatus,
  PayrollSalaryChangeStatus,
} from "@prisma/client"

import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  approvalDecisionEligibility,
  getHrisApprovalInbox,
} from "@/services/hris/approval-inbox.service"

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

const mockResolveScope = resolveHrisPeopleAccessScope as jest.Mock

function buildClient() {
  return {
    payrollEmployee: { findMany: jest.fn() },
    payrollContract: { findMany: jest.fn() },
    payrollEmployeeRubriqueAssignment: { findMany: jest.fn() },
    payrollSalaryChangeRequest: { findMany: jest.fn() },
    payrollPaymentDestinationChangeRequest: { findMany: jest.fn() },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  } as any
}

const lifecyclePending = {
  requestId: "lifecycle-request-1",
  type: "TRANSFER",
  status: "REQUESTED",
  fromStatus: "ACTIVE",
  targetStatus: "ACTIVE",
  effectiveAt: "2026-08-01T00:00:00.000Z",
  reasonHash: "sha256:lifecycle-reason",
  evidenceHash: "sha256:lifecycle-evidence",
  target: { locationId: "loc-2" },
  requestedById: "maker-lifecycle",
  requestedAt: "2026-07-10T00:00:00.000Z",
}

const documentPending = {
  requestId: "document-request-1",
  capturedById: "maker-document",
  capturedAt: "2026-07-09T00:00:00.000Z",
  artifactHash: "sha256:contract-document",
  malwareScanEvidenceHash: "sha256:malware-scan",
  malwareScanProvider: "scanner",
  malwareScannedAt: "2026-07-09T00:00:00.000Z",
  signedAt: "2026-07-08T00:00:00.000Z",
  retentionPolicyCode: "HR-CONTRACT",
  retentionBasis: "Employment contract retention",
  retainUntil: "2036-07-08T00:00:00.000Z",
  legalHold: false,
  legalHoldReasonHash: null,
}

describe("HRIS approval inbox service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveScope.mockResolvedValue({
      organizationId: "org-1",
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        label: "Managed-location responsibility",
      },
      managedLocations: [{ id: "loc-1" }],
      employeeIds: ["emp-1"],
      limitations: [],
    })
  })

  it("enforces the domain segregation-of-duties matrix", () => {
    const permissions = ["hris.people.manage"]

    expect(approvalDecisionEligibility({
      actorId: "maker-1",
      actorPermissions: permissions,
      domain: "SALARY_CHANGE",
      stage: "REVIEW",
      requestedById: "maker-1",
    })).toEqual({ eligible: false, reasonCode: "REQUESTER_CANNOT_REVIEW" })

    expect(approvalDecisionEligibility({
      actorId: "approver-1",
      actorPermissions: permissions,
      domain: "PAYMENT_DESTINATION",
      stage: "APPLY",
      requestedById: "maker-1",
      approvedById: "approver-1",
    })).toEqual({ eligible: false, reasonCode: "APPROVER_CANNOT_APPLY" })

    expect(approvalDecisionEligibility({
      actorId: "approver-1",
      actorPermissions: permissions,
      domain: "LIFECYCLE",
      stage: "APPLY",
      requestedById: "maker-1",
      approvedById: "approver-1",
    })).toEqual({ eligible: true, reasonCode: "ACTION_ALLOWED" })

    expect(approvalDecisionEligibility({
      actorId: "operator-1",
      actorPermissions: permissions,
      domain: "SALARY_CHANGE",
      stage: "APPLY",
      requestedById: "maker-1",
      approvedById: "approver-1",
    })).toEqual({ eligible: true, reasonCode: "ACTION_ALLOWED" })
  })

  it("aggregates scoped pending blockers without authority, salary, payment, or document values", async () => {
    const client = buildClient()
    client.payrollEmployee.findMany.mockResolvedValue([
      {
        id: "emp-1",
        displayName: "Ada Manager",
        metadata: { hrisLifecycle: { pending: lifecyclePending } },
        updatedAt: new Date("2026-07-10T00:00:00.000Z"),
      },
    ])
    client.payrollContract.findMany.mockResolvedValue([
      {
        id: "contract-1",
        employeeId: "emp-1",
        contractNumber: "CTR-001",
        effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
        metadata: {
          hrisDocumentEvidence: { pending: documentPending },
          hrisContractApproval: {
            pending: {
              requestId: "contract-request-1",
              requestedById: "maker-contract",
              requestedAt: "2026-07-11T00:00:00.000Z",
              reasonHash: "sha256:contract-reason",
              requestEvidenceHash: "sha256:contract-request-evidence",
            },
          },
        },
        employee: { displayName: "Ada Manager" },
      },
    ])
    client.payrollEmployeeRubriqueAssignment.findMany.mockResolvedValue([
      {
        id: "assignment-1",
        employeeId: "emp-1",
        effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
        evidenceDocumentHash: "sha256:assignment-evidence",
        metadata: {
          hrisCompensationApproval: {
            version: 1,
            status: "REQUESTED",
            requestedById: "maker-assignment",
            requestBusinessEventId: "event-assignment-request",
            requestedAt: "2026-07-12T00:00:00.000Z",
          },
        },
        employee: { displayName: "Ada Manager" },
        rubrique: { code: "TRANSPORT", label: "Transport allowance" },
      },
    ])
    client.payrollSalaryChangeRequest.findMany.mockResolvedValue([
      {
        id: "salary-1",
        employeeId: "emp-1",
        status: PayrollSalaryChangeStatus.REQUESTED,
        requestedById: "maker-salary",
        approvedById: null,
        requestedAt: new Date("2026-07-13T00:00:00.000Z"),
        effectiveFrom: new Date("2026-08-01T00:00:00.000Z"),
        evidenceDocumentHash: "sha256:salary-evidence",
        approvalEvidenceHash: null,
        currentBaseSalary: "100000.00",
        proposedBaseSalary: "120000.00",
        employee: { displayName: "Ada Manager" },
      },
    ])
    client.payrollPaymentDestinationChangeRequest.findMany.mockResolvedValue([
      {
        id: "payment-1",
        employeeId: "emp-1",
        status: PayrollPaymentDestinationChangeStatus.APPROVED,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        requestedById: "maker-payment",
        approvedById: "checker-1",
        requestedAt: new Date("2026-07-14T00:00:00.000Z"),
        evidenceDocumentHash: "sha256:payment-evidence",
        approvalEvidenceHash: "sha256:payment-approval",
        bankAccountMasked: "****1234",
        employee: { displayName: "Ada Manager" },
      },
    ])

    const result = await getHrisApprovalInbox({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.read", "hris.people.manage"],
      limit: 50,
    }, client)

    expect(result.summary.visiblePending).toBe(6)
    expect(result.readiness).toEqual(expect.objectContaining({
      status: "BLOCKED",
      blockerCount: 6,
      blockerCodes: expect.arrayContaining([
        "LIFECYCLE_REQUEST_PENDING",
        "CONTRACT_ACTIVATION_PENDING",
        "DOCUMENT_EVIDENCE_PENDING",
        "COMPENSATION_ASSIGNMENT_PENDING",
        "COMPENSATION_CHANGE_PENDING",
        "PAYMENT_DESTINATION_CHANGE_PENDING",
      ]),
    }))
    expect(result.items.find((item) => item.id === "PAYMENT_DESTINATION:payment-1")?.decision)
      .toEqual({ eligible: false, reasonCode: "APPROVER_CANNOT_APPLY" })
    expect(mockResolveScope).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "checker-1",
    }), client)
    expect(client.payrollSalaryChangeRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ employeeId: { in: ["emp-1"] } }),
      }),
    )

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("maker-salary")
    expect(serialized).not.toContain("checker-1")
    expect(serialized).not.toContain("120000.00")
    expect(serialized).not.toContain("****1234")
    expect(serialized).not.toContain("sha256:contract-document")
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "HRIS_APPROVAL_INBOX_READ",
        organizationId: "org-1",
        userId: "checker-1",
        changes: expect.objectContaining({
          visiblePendingCount: 6,
          rawAuthorityIncluded: false,
          compensationValuesIncluded: false,
          paymentDestinationValuesIncluded: false,
        }),
      }),
    })
  })

  it("returns a ready empty state for a scoped manager with no pending work", async () => {
    const client = buildClient()
    client.payrollEmployee.findMany.mockResolvedValue([])
    client.payrollContract.findMany.mockResolvedValue([])
    client.payrollEmployeeRubriqueAssignment.findMany.mockResolvedValue([])
    client.payrollSalaryChangeRequest.findMany.mockResolvedValue([])
    client.payrollPaymentDestinationChangeRequest.findMany.mockResolvedValue([])

    const result = await getHrisApprovalInbox({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 25,
    }, client)

    expect(result.items).toEqual([])
    expect(result.readiness).toEqual({
      status: "READY",
      blockerCount: 0,
      blockerCodes: [],
    })
  })
})
