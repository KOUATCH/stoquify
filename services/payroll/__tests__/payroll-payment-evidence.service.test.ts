import {
  PaymentMethod,
  PayrollAttendanceSnapshotStatus,
  PayrollEmployeeStatus,
  PayrollPaymentDestinationChangeStatus,
} from "@prisma/client"

import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
  },
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

import { db } from "@/prisma/db"
import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  applyApprovedPaymentDestinationChange,
  approvePaymentDestinationChange,
  assertApprovedPaymentDestinationEvidence,
  getPaymentEvidenceReadiness,
  requestPaymentDestinationChange,
} from "../payment-evidence.service"

const mockDb = db as unknown as { $transaction: jest.Mock }
const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock

function buildTx() {
  return {
    payrollEmployee: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payrollPaymentDestinationChangeRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  }
}

function useTransaction(tx: ReturnType<typeof buildTx>) {
  mockDb.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx))
}

function employeeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "employee-1",
    organizationId: "org-1",
    userId: "user-1",
    employeeNumber: "EMP-001",
    displayName: "Ada Payroll",
    legalName: "Ada Payroll",
    status: PayrollEmployeeStatus.ACTIVE,
    hireDate: new Date("2026-01-01T00:00:00.000Z"),
    terminationDate: null,
    countryCode: "CM",
    locationId: null,
    department: "Operations",
    jobTitle: "Manager",
    costCenter: "OPS",
    taxIdentifierMasked: null,
    taxIdentifierHash: "sha256:tax",
    socialIdentifierMasked: null,
    socialIdentifierHash: "sha256:social",
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    bankAccountMasked: "***1234",
    bankAccountHash: "sha256:bank",
    mobileMoneyProvider: null,
    mobileMoneyPhoneMasked: null,
    mobileMoneyPhoneHash: null,
    paymentDestinationHash: "sha256:destination",
    metadata: {
      approvedPaymentDestinationEvidence: {
        requestId: "dest-change-1",
        paymentDestinationHash: "sha256:destination",
        evidenceDocumentHash: "sha256:request-evidence",
        approvalEvidenceHash: "sha256:approval-evidence",
      },
    },
    deletedAt: null,
    contracts: [{ id: "contract-1", signedDocumentHash: "sha256:contract", activatedBusinessEventId: "event-contract" }],
    salaryChangeRequests: [{ id: "salary-change-1", evidenceDocumentHash: "sha256:salary-request", approvalEvidenceHash: "sha256:salary-approval" }],
    paymentDestinationChangeRequests: [destinationChangeRow({ status: PayrollPaymentDestinationChangeStatus.APPLIED })],
    attendanceSnapshots: [attendanceSnapshotRow()],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

function destinationChangeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "dest-change-1",
    organizationId: "org-1",
    employeeId: "employee-1",
    employee: { id: "employee-1", displayName: "Ada Payroll", metadata: null, paymentDestinationHash: null },
    status: PayrollPaymentDestinationChangeStatus.REQUESTED,
    paymentMethod: PaymentMethod.BANK_TRANSFER,
    bankAccountMasked: "***1234",
    bankAccountHash: "sha256:bank",
    mobileMoneyProvider: null,
    mobileMoneyPhoneMasked: null,
    mobileMoneyPhoneHash: null,
    paymentDestinationHash: "sha256:destination",
    requestedById: "hr-1",
    approvedById: null,
    rejectedById: null,
    appliedById: null,
    requestedAt: new Date("2026-06-26T00:00:00.000Z"),
    approvedAt: null,
    rejectedAt: null,
    appliedAt: null,
    requestReason: "Bank account update",
    decisionReason: null,
    evidenceDocumentHash: "sha256:request-evidence",
    approvalEvidenceHash: null,
    requestBusinessEventId: null,
    approvalBusinessEventId: null,
    appliedBusinessEventId: null,
    metadata: null,
    deletedAt: null,
    createdAt: new Date("2026-06-26T00:00:00.000Z"),
    updatedAt: new Date("2026-06-26T00:00:00.000Z"),
    ...overrides,
  }
}

function attendanceSnapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "attendance-1",
    status: PayrollAttendanceSnapshotStatus.FROZEN,
    periodStart: new Date("2026-06-01T00:00:00.000Z"),
    periodEnd: new Date("2026-06-30T23:59:59.999Z"),
    sourceHash: "sha256:attendance-source",
    frozenAt: new Date("2026-06-25T00:00:00.000Z"),
    ...overrides,
  }
}

describe("payroll payment evidence service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRecordBusinessEventInTx.mockResolvedValue({ event: { id: "event-1" }, created: true })
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({ id: "event-1", status: "APPLIED" })
  })

  it("requests a payment destination change with tenant scope, masked values, hashes, audit, and no raw details", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollEmployee.findFirst.mockResolvedValue(employeeRow({ paymentDestinationHash: null, metadata: null }))
    tx.payrollPaymentDestinationChangeRequest.findFirst.mockResolvedValue(null)
    tx.payrollPaymentDestinationChangeRequest.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      destinationChangeRow({ ...data, id: "dest-change-1", employee: employeeRow() }),
    )
    tx.payrollPaymentDestinationChangeRequest.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      destinationChangeRow({ requestBusinessEventId: data.requestBusinessEventId, employee: employeeRow() }),
    )

    const result = await requestPaymentDestinationChange({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.payment_destination.request"],
      employeeId: "employee-1",
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountNumber: "1234 5678 9012 1234",
      bankName: "Bank",
      accountHolderName: "Ada Payroll",
      requestReason: "Bank account update",
      evidenceDocumentHash: "sha256:request-evidence",
    })

    expect(result.businessEventId).toBe("event-1")
    expect(tx.payrollEmployee.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", id: "employee-1" }),
    }))
    const createdData = tx.payrollPaymentDestinationChangeRequest.create.mock.calls[0][0].data
    expect(createdData.bankAccountMasked).toBe("***1234")
    expect(createdData.bankAccountHash).toMatch(/^sha256:/)
    expect(createdData.paymentDestinationHash).toMatch(/^sha256:/)
    expect(JSON.stringify(createdData)).not.toContain("1234567890121234")
    expect(JSON.stringify(result)).not.toContain("1234567890121234")
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(tx, expect.objectContaining({
      eventType: "payroll.payment_destination.requested",
      documentHash: "sha256:request-evidence",
    }))
  })

  it("blocks a requester from approving their own payment destination change", async () => {
    const tx = buildTx()
    useTransaction(tx)
    tx.payrollPaymentDestinationChangeRequest.findFirst.mockResolvedValue(destinationChangeRow({ requestedById: "hr-1" }))

    await expect(approvePaymentDestinationChange({
      organizationId: "org-1",
      actorId: "hr-1",
      actorPermissions: ["payroll.payment_destination.approve"],
      paymentDestinationChangeRequestId: "dest-change-1",
      decisionReason: "Approved",
      approvalEvidenceHash: "sha256:approval-evidence",
    })).rejects.toBeInstanceOf(ForbiddenError)

    expect(tx.payrollPaymentDestinationChangeRequest.update).not.toHaveBeenCalled()
  })

  it("approves and applies payment destination evidence without mutating raw payment details into employee metadata", async () => {
    const tx = buildTx()
    useTransaction(tx)
    const approved = destinationChangeRow({
      status: PayrollPaymentDestinationChangeStatus.APPROVED,
      approvedById: "finance-1",
      approvalEvidenceHash: "sha256:approval-evidence",
      approvalBusinessEventId: "event-approve",
      employee: employeeRow({ metadata: null, paymentDestinationHash: null }),
    })
    tx.payrollPaymentDestinationChangeRequest.findFirst.mockResolvedValue(approved)
    tx.payrollEmployee.update.mockResolvedValue(employeeRow())
    tx.payrollPaymentDestinationChangeRequest.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      destinationChangeRow({ ...approved, ...data, employee: employeeRow({ paymentDestinationHash: "sha256:destination" }) }),
    )

    const result = await applyApprovedPaymentDestinationChange({
      organizationId: "org-1",
      actorId: "payroll-ops-1",
      actorPermissions: ["payroll.payment_destination.apply"],
      paymentDestinationChangeRequestId: "dest-change-1",
    })

    expect(result.paymentDestinationChange.status).toBe(PayrollPaymentDestinationChangeStatus.APPLIED)
    const employeeUpdate = tx.payrollEmployee.update.mock.calls[0][0].data
    expect(employeeUpdate.paymentDestinationHash).toBe("sha256:destination")
    expect(employeeUpdate.metadata.approvedPaymentDestinationEvidence.requestId).toBe("dest-change-1")
    expect(JSON.stringify(employeeUpdate.metadata)).not.toContain("1234567890121234")
  })

  it("returns readiness with evidence references, redacted destination data, and attendance drift detection", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([
          employeeRow({ attendanceSnapshots: [attendanceSnapshotRow({ sourceHash: "sha256:frozen-attendance" })] }),
        ]),
      },
      auditLog: { create: jest.fn() },
    }

    const result = await getPaymentEvidenceReadiness({
      organizationId: "org-1",
      actorId: "reader-1",
      actorPermissions: ["payroll.payment_destination.read", "payroll.attendance.readiness.read"],
      expectedAttendanceSourceHashes: { "employee-1": "sha256:current-attendance" },
    }, client as never)

    expect(result.summary.attendanceDriftCount).toBe(1)
    expect(result.employees[0].attendanceReadiness.status).toBe("DRIFT_DETECTED")
    expect(result.employees[0].evidence.paymentEvidenceHashes).toEqual(expect.arrayContaining([
      "sha256:request-evidence",
      "sha256:approval-evidence",
    ]))
    expect(JSON.stringify(result)).not.toContain("bankAccountNumber")
  })

  it("requires an applied destination approval record before payment release can proceed", async () => {
    const client = {
      payrollEmployee: {
        findFirst: jest.fn().mockResolvedValue(employeeRow({
          paymentDestinationHash: "sha256:destination",
          metadata: { approvedPaymentDestinationEvidence: { requestId: "dest-change-1", paymentDestinationHash: "sha256:destination" } },
        })),
      },
      payrollPaymentDestinationChangeRequest: { findFirst: jest.fn() },
    }

    await expect(assertApprovedPaymentDestinationEvidence(client as never, {
      organizationId: "org-1",
      employeeId: "employee-1",
    })).rejects.toBeInstanceOf(BusinessRuleError)
  })
})