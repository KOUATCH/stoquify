import { PayrollEmployeeStatus } from "@prisma/client"

import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

jest.mock("@/services/payroll/org-manager-scope.service", () => ({
  assertPayrollEmployeeLocationInOrganization: jest.fn(async (_tx, _organizationId, locationId) => locationId ?? null),
}))

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

import {
  applyApprovedHrisEmployeeLifecycle,
  approveHrisEmployeeLifecycle,
  getHrisEmployeeLifecycleTimeline,
  requestHrisEmployeeLifecycle,
} from "../lifecycle.service"

const mockedRecordBusinessEventInTx = recordBusinessEventInTx as jest.Mock
const mockedMarkBusinessEventAppliedInTx = markBusinessEventAppliedInTx as jest.Mock
const mockedResolveHrisPeopleAccessScope = resolveHrisPeopleAccessScope as jest.Mock

const locationResponsibilityScope = {
  organizationId: "org-1",
  authority: {
    kind: "LOCATION_RESPONSIBILITY",
    label: "Managed-location responsibility",
    basis: "Location.managerId",
    reportingLineAuthority: false,
    effectiveDating: "CURRENT_ONLY",
    historicalAccessSupported: false,
    delegationSupported: false,
  },
  managedLocations: [{ id: "loc-1", name: "Douala Branch", code: "DLA" }],
  employeeIds: ["emp-1"],
  limitations: [],
}

function employee(overrides: Record<string, unknown> = {}) {
  return {
    id: "emp-1",
    organizationId: "org-1",
    userId: "user-1",
    employeeNumber: "EMP-001",
    displayName: "Alice Ngono",
    legalName: "Alice Ngono",
    status: PayrollEmployeeStatus.ACTIVE,
    hireDate: new Date("2025-01-01T00:00:00.000Z"),
    terminationDate: null,
    countryCode: "CM",
    locationId: "loc-1",
    department: "Operations",
    jobTitle: "Analyst",
    costCenter: "OPS",
    paymentDestinationHash: "sha256:payment-destination",
    metadata: {},
    deletedAt: null,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-14T00:00:00.000Z"),
    ...overrides,
  }
}

function pending(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "event-requested",
    type: "TERMINATE",
    status: "REQUESTED",
    fromStatus: PayrollEmployeeStatus.ACTIVE,
    targetStatus: PayrollEmployeeStatus.TERMINATED,
    effectiveAt: "2026-08-01T00:00:00.000Z",
    reasonHash: "sha256:reason-hash",
    evidenceHash: "sha256:evidence-hash",
    target: {},
    requestedById: "maker-1",
    requestedAt: "2026-07-14T00:00:00.000Z",
    ...overrides,
  }
}

function buildTx(initial = employee()) {
  let current = initial
  const tx = {
    payrollEmployee: {
      findFirst: jest.fn(async () => current),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        current = { ...current, ...data }
        return current
      }),
    },
    payrollRunLine: { findFirst: jest.fn().mockResolvedValue(null) },
    payrollAttendanceSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
    payrollContract: {
      findFirst: jest.fn().mockResolvedValue({ id: "contract-1" }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    payrollEmployeeRubriqueAssignment: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    businessEvent: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  }
  return tx
}

describe("HRIS employee lifecycle service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedRecordBusinessEventInTx.mockImplementation(async (_tx, input) => ({
      event: { id: `event-${String(input.eventType).split(".").at(-1)}` },
      created: true,
    }))
    mockedMarkBusinessEventAppliedInTx.mockResolvedValue({ status: "APPLIED" })
    mockedResolveHrisPeopleAccessScope.mockResolvedValue(locationResponsibilityScope)
  })

  it("creates a traceable request without persisting the raw reason", async () => {
    const tx = buildTx()

    const result = await requestHrisEmployeeLifecycle({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      type: "TRANSFER",
      effectiveAt: "2026-08-01",
      reason: "Move closer to the new operating team",
      evidenceHash: "sha256:transfer-evidence",
      target: { locationId: "loc-2", department: "Finance" },
    }, tx as never)

    expect(result.workflow).toMatchObject({
      type: "TRANSFER",
      status: "REQUESTED",
      requestedById: "maker-1",
      target: { locationId: "loc-2", department: "Finance" },
    })
    const eventInput = mockedRecordBusinessEventInTx.mock.calls[0][1]
    expect(eventInput.eventType).toBe("hris.employee.lifecycle.requested")
    expect(JSON.stringify(eventInput)).not.toContain("Move closer")
    expect(eventInput.payload.reasonHash).toMatch(/^sha256:/)
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "HRIS_EMPLOYEE_LIFECYCLE_REQUESTED" }),
    }))
  })

  it("rejects invalid lifecycle state transitions before recording an event", async () => {
    const tx = buildTx()

    await expect(requestHrisEmployeeLifecycle({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      type: "ONBOARD",
      effectiveAt: "2026-08-01",
      reason: "Attempt duplicate onboarding",
      evidenceHash: "sha256:onboarding-evidence",
    }, tx as never)).rejects.toBeInstanceOf(BusinessRuleError)

    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(tx.payrollEmployee.update).not.toHaveBeenCalled()
  })
  it("enforces maker-checker separation on approval", async () => {
    const tx = buildTx(employee({ metadata: { hrisLifecycle: { pending: pending() } } }))

    await expect(approveHrisEmployeeLifecycle({
      organizationId: "org-1",
      actorId: "maker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      requestId: "event-requested",
      decisionReason: "Approved by the requester",
      approvalEvidenceHash: "sha256:approval-evidence",
    }, tx as never)).rejects.toBeInstanceOf(ForbiddenError)

    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
    expect(tx.payrollEmployee.update).not.toHaveBeenCalled()
  })

  it("approves a request with independent evidence and preserves the projection", async () => {
    const tx = buildTx(employee({ metadata: { hrisLifecycle: { pending: pending() } } }))

    const result = await approveHrisEmployeeLifecycle({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      requestId: "event-requested",
      decisionReason: "Evidence and effective date verified",
      approvalEvidenceHash: "sha256:approval-evidence",
    }, tx as never)

    expect(result.workflow).toMatchObject({
      status: "APPROVED",
      approvedById: "checker-1",
      approvalEvidenceHash: "sha256:approval-evidence",
    })
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: "hris.employee.lifecycle.approved",
      documentHash: "sha256:approval-evidence",
    }))
  })

  it("blocks lifecycle application when certified payroll evidence overlaps the effective date", async () => {
    const tx = buildTx(employee({
      metadata: { hrisLifecycle: { pending: pending({
        status: "APPROVED",
        approvedById: "checker-1",
        approvedAt: "2026-07-15T00:00:00.000Z",
        approvalEvidenceHash: "sha256:approval-evidence",
      }) } },
    }))
    tx.payrollRunLine.findFirst.mockResolvedValue({ id: "line-1" })

    await expect(applyApprovedHrisEmployeeLifecycle({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      requestId: "event-requested",
    }, tx as never)).rejects.toBeInstanceOf(BusinessRuleError)

    expect(tx.payrollEmployee.update).not.toHaveBeenCalled()
    expect(mockedRecordBusinessEventInTx).not.toHaveBeenCalled()
  })

  it("applies an approved termination and closes downstream pay assignments", async () => {
    const tx = buildTx(employee({
      metadata: { hrisLifecycle: { pending: pending({
        status: "APPROVED",
        approvedById: "checker-1",
        approvedAt: "2026-07-15T00:00:00.000Z",
        approvalEvidenceHash: "sha256:approval-evidence",
      }) } },
    }))

    const result = await applyApprovedHrisEmployeeLifecycle({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      requestId: "event-requested",
    }, tx as never)

    expect(result.employee).toMatchObject({
      status: PayrollEmployeeStatus.TERMINATED,
      terminationDate: "2026-08-01T00:00:00.000Z",
    })
    expect(tx.payrollContract.updateMany).toHaveBeenCalledTimes(2)
    expect(tx.payrollEmployeeRubriqueAssignment.updateMany).toHaveBeenCalledTimes(2)
    expect(mockedRecordBusinessEventInTx).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: "hris.employee.lifecycle.applied",
    }))
  })

  it("requires starter contract evidence before onboarding application", async () => {
    const tx = buildTx(employee({
      status: PayrollEmployeeStatus.DRAFT,
      metadata: { hrisLifecycle: { pending: pending({
        type: "ONBOARD",
        status: "APPROVED",
        fromStatus: PayrollEmployeeStatus.DRAFT,
        targetStatus: PayrollEmployeeStatus.ACTIVE,
        approvedById: "checker-1",
        approvedAt: "2026-07-15T00:00:00.000Z",
        approvalEvidenceHash: "sha256:approval-evidence",
      }) } },
    }))
    tx.payrollContract.findFirst.mockResolvedValue(null)

    await expect(applyApprovedHrisEmployeeLifecycle({
      organizationId: "org-1",
      actorId: "checker-1",
      actorPermissions: ["hris.people.manage"],
      employeeId: "emp-1",
      requestId: "event-requested",
    }, tx as never)).rejects.toThrow("approved active contract")
  })

  it("returns a tenant-scoped lifecycle timeline and audits the read", async () => {
    const tx = buildTx()
    tx.businessEvent.findMany.mockResolvedValue([{
      id: "event-requested",
      eventType: "hris.employee.lifecycle.requested",
      status: "APPLIED",
      actorId: "maker-1",
      occurredAt: new Date("2026-07-14T00:00:00.000Z"),
      processedAt: new Date("2026-07-14T00:00:01.000Z"),
      documentHash: "sha256:evidence-hash",
      payload: { employeeId: "emp-1", type: "TRANSFER" },
    }])

    const result = await getHrisEmployeeLifecycleTimeline({
      organizationId: "org-1",
      actorId: "auditor-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
    }, tx as never)

    expect(result.events).toHaveLength(1)
    expect(result.accessScope).toEqual(locationResponsibilityScope)
    expect(mockedResolveHrisPeopleAccessScope).toHaveBeenCalledWith({
      organizationId: "org-1",
      actorId: "auditor-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
      limit: 1,
    }, tx)
    expect(tx.businessEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-1", sourceId: "emp-1" }),
    }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "HRIS_EMPLOYEE_LIFECYCLE_TIMELINE_READ" }),
    }))
  })
})
