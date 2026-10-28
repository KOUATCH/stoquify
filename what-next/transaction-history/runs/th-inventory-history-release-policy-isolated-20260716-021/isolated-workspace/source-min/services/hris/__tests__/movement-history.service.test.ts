import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  deriveHrisMovementProofState,
  getHrisMovementHistory,
} from "@/services/hris/movement-history.service"

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

const mockResolveScope = resolveHrisPeopleAccessScope as jest.Mock

function buildClient() {
  return {
    payrollEmployee: { findMany: jest.fn() },
    payrollContract: { findMany: jest.fn().mockResolvedValue([]) },
    payrollEmployeeRubriqueAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    payrollSalaryChangeRequest: { findMany: jest.fn().mockResolvedValue([]) },
    payrollPaymentDestinationChangeRequest: { findMany: jest.fn().mockResolvedValue([]) },
    payrollAttendanceSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
    payrollRunLine: { findMany: jest.fn().mockResolvedValue([]) },
    payrollPayslip: { findMany: jest.fn().mockResolvedValue([]) },
    businessEvent: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "audit-read-1" }),
    },
  } as any
}

describe("HRIS movement-history service", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockResolveScope.mockResolvedValue({
      organizationId: "org-1",
      authority: {
        kind: "LOCATION_RESPONSIBILITY",
        label: "Managed-location responsibility",
      },
      managedLocations: [{ id: "loc-1", name: "Main", code: "MAIN" }],
      employeeIds: ["emp-1"],
      limitations: [],
    })
  })

  it("derives proof badges only from consistent evidence combinations", () => {
    expect(deriveHrisMovementProofState({
      hasBusinessEvent: true,
      eventStatus: "APPLIED",
      payloadHashPresent: true,
      auditLinked: true,
      sourceRecordPresent: true,
      documentEvidencePresent: true,
    })).toEqual(expect.objectContaining({
      state: "AUDIT_AND_EVENT",
      consistent: true,
    }))

    expect(deriveHrisMovementProofState({
      hasBusinessEvent: true,
      eventStatus: "APPLIED",
      payloadHashPresent: true,
      auditLinked: false,
      sourceRecordPresent: true,
      documentEvidencePresent: false,
    }).state).toBe("EVENT_ONLY")

    expect(deriveHrisMovementProofState({
      hasBusinessEvent: true,
      eventStatus: "FAILED",
      payloadHashPresent: true,
      auditLinked: true,
      sourceRecordPresent: true,
      documentEvidencePresent: false,
    }).state).toBe("FAILED_EVENT")

    expect(deriveHrisMovementProofState({
      hasBusinessEvent: false,
      eventStatus: null,
      payloadHashPresent: false,
      auditLinked: false,
      sourceRecordPresent: true,
      documentEvidencePresent: true,
    }).state).toBe("SOURCE_RECORD_ONLY")
  })

  it("returns tenant and manager-scoped movements with sensitive payloads and proof identifiers redacted", async () => {
    const client = buildClient()
    client.payrollEmployee.findMany.mockResolvedValue([{
      id: "emp-1",
      employeeNumber: "EMP-001",
      displayName: "Ada Payroll",
      department: "Finance",
      locationId: "loc-1",
    }])
    client.payrollSalaryChangeRequest.findMany.mockResolvedValue([{
      id: "salary-1",
      employeeId: "emp-1",
    }])
    client.payrollPayslip.findMany.mockResolvedValue([{
      id: "payslip-1",
      employeeId: "emp-1",
      status: "EMITTED",
      issuedAt: new Date("2026-07-14T00:00:00.000Z"),
      documentHash: "sha256:private-payslip-document",
      createdAt: new Date("2026-07-14T00:00:00.000Z"),
    }])
    client.businessEvent.findMany.mockResolvedValue([
      {
        id: "event-salary-1",
        eventType: "payroll.salary_change.approved",
        eventSource: "INTERNAL",
        status: "APPLIED",
        payloadHash: "sha256:private-payload-hash",
        payload: {
          employeeId: "emp-1",
          currentBaseSalary: "900000.00",
          proposedBaseSalary: "1100000.00",
          bankAccount: "SECRET-ACCOUNT-1234",
          effectiveFrom: "2026-08-01T00:00:00.000Z",
        },
        occurredAt: new Date("2026-07-15T09:00:00.000Z"),
        recordedAt: new Date("2026-07-15T09:00:01.000Z"),
        processedAt: new Date("2026-07-15T09:00:02.000Z"),
        actorId: "maker-sensitive-id",
        sourceId: "salary-1",
        documentHash: "sha256:private-approval-evidence",
      },
      {
        id: "event-lifecycle-1",
        eventType: "hris.employee.lifecycle.applied",
        eventSource: "INTERNAL",
        status: "APPLIED",
        payloadHash: "sha256:lifecycle-payload",
        payload: { employeeId: "emp-1", effectiveAt: "2026-07-15T00:00:00.000Z" },
        occurredAt: new Date("2026-07-15T08:00:00.000Z"),
        recordedAt: new Date("2026-07-15T08:00:01.000Z"),
        processedAt: new Date("2026-07-15T08:00:02.000Z"),
        actorId: "lifecycle-actor-sensitive-id",
        sourceId: "emp-1",
        documentHash: null,
      },
      {
        id: "event-outside-scope",
        eventType: "hris.employee.lifecycle.applied",
        eventSource: "INTERNAL",
        status: "APPLIED",
        payloadHash: "sha256:outside-scope",
        payload: { employeeId: "emp-2" },
        occurredAt: new Date("2026-07-15T10:00:00.000Z"),
        recordedAt: new Date("2026-07-15T10:00:01.000Z"),
        processedAt: new Date("2026-07-15T10:00:02.000Z"),
        actorId: "outside-actor",
        sourceId: "emp-2",
        documentHash: null,
      },
    ])
    client.auditLog.findMany.mockResolvedValue([{
      changes: {
        after: { approvalBusinessEventId: "event-salary-1" },
      },
    }])

    const result = await getHrisMovementHistory({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 50,
    }, client)

    expect(result.items).toHaveLength(3)
    expect(result.items.find((item) => item.id.startsWith("event-salary-1"))?.proof)
      .toEqual(expect.objectContaining({
        state: "AUDIT_AND_EVENT",
        documentEvidencePresent: true,
        rawHashesIncluded: false,
      }))
    expect(result.items.find((item) => item.id.startsWith("event-lifecycle-1"))?.proof.state)
      .toBe("EVENT_ONLY")
    expect(result.items.find((item) => item.id === "payslip-source:payslip-1")?.proof.state)
      .toBe("SOURCE_RECORD_ONLY")
    expect(result.items.some((item) => item.id.includes("outside-scope"))).toBe(false)

    expect(client.payrollEmployee.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        id: { in: ["emp-1"] },
      }),
    }))
    expect(client.businessEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        sourceId: { in: expect.arrayContaining(["emp-1", "salary-1", "payslip-1"]) },
      }),
    }))
    const sourceIds = client.businessEvent.findMany.mock.calls[0][0].where.sourceId.in
    expect(sourceIds).not.toContain("emp-2")

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("900000.00")
    expect(serialized).not.toContain("1100000.00")
    expect(serialized).not.toContain("SECRET-ACCOUNT-1234")
    expect(serialized).not.toContain("maker-sensitive-id")
    expect(serialized).not.toContain("sha256:private-payload-hash")
    expect(serialized).not.toContain("sha256:private-approval-evidence")
    expect(serialized).not.toContain("sha256:private-payslip-document")
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        userId: "manager-1",
        action: "HRIS_MOVEMENT_HISTORY_READ",
        changes: expect.objectContaining({
          sourceEventCount: 3,
          returnedCount: 3,
          rawEventPayloadIncluded: false,
          actorIdentifiersIncluded: false,
          rawProofHashesIncluded: false,
        }),
      }),
    })
  })

  it("applies proof filters without upgrading source-only records", async () => {
    const client = buildClient()
    client.payrollEmployee.findMany.mockResolvedValue([{
      id: "emp-1",
      employeeNumber: "EMP-001",
      displayName: "Ada Payroll",
      department: null,
      locationId: "loc-1",
    }])
    client.payrollPayslip.findMany.mockResolvedValue([{
      id: "payslip-1",
      employeeId: "emp-1",
      status: "EMITTED",
      issuedAt: null,
      documentHash: "sha256:payslip",
      createdAt: new Date("2026-07-14T00:00:00.000Z"),
    }])

    const result = await getHrisMovementHistory({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      proofState: "SOURCE_RECORD_ONLY",
      limit: 25,
    }, client)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].proof).toEqual(expect.objectContaining({
      state: "SOURCE_RECORD_ONLY",
      auditLinked: false,
      payloadHashPresent: false,
    }))
  })

  it("returns an audited empty result without querying unrelated event sources", async () => {
    const client = buildClient()
    client.payrollEmployee.findMany.mockResolvedValue([])

    const result = await getHrisMovementHistory({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      limit: 25,
    }, client)

    expect(result.items).toEqual([])
    expect(result.summary).toEqual(expect.objectContaining({ matched: 0, returned: 0 }))
    expect(client.businessEvent.findMany).not.toHaveBeenCalled()
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "HRIS_MOVEMENT_HISTORY_READ" }),
    })
  })
})
