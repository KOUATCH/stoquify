import {
  PayrollAttendanceSnapshotStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
} from "@prisma/client"


import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import { freezeAttendanceSnapshot } from "@/services/payroll/payroll-control.service"

import {
  certifyHrisTimeLeaveAttendance,
  correctCertifiedHrisTimeLeaveAttendance,
  getOwnHrisTimeLeaveAttendanceStatus,
} from "../time-leave.service"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))

jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

jest.mock("@/services/payroll/payroll-control.service", () => ({
  freezeAttendanceSnapshot: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual("@/services/events/business-event.service")
  return {
    ...actual,
    markBusinessEventAppliedInTx: jest.fn(),
    recordBusinessEventInTx: jest.fn(),
  }
})

const mockScope = resolveHrisPeopleAccessScope as jest.Mock
const mockFreeze = freezeAttendanceSnapshot as jest.Mock
const mockRecordEvent = recordBusinessEventInTx as jest.Mock
const mockMarkEvent = markBusinessEventAppliedInTx as jest.Mock

function managerScope() {
  return {
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
    managedLocations: [{ id: "loc-1", name: "Main", code: "MAIN" }],
    employeeIds: ["emp-1"],
    limitations: [],
  }
}

function adminScope() {
  return {
    ...managerScope(),
    authority: {
      ...managerScope().authority,
      kind: "TENANT_HRIS_ADMIN",
      label: "Tenant HRIS administration",
      basis: "HRIS_PERMISSION",
      effectiveDating: "NOT_APPLICABLE",
    },
    managedLocations: [],
    employeeIds: null,
  }
}

function policy() {
  return {
    countryCode: "CM",
    policyVersion: "CM-COMPANY-2026.1",
    countryPolicyHash: "sha256:country-policy",
    companyPolicyHash: "sha256:company-policy",
    leavePolicyHash: "sha256:leave-policy",
    overtimePolicyHash: "sha256:overtime-policy",
    scheduleHash: "sha256:schedule",
    holidayCalendarHash: "sha256:holiday-calendar",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    verificationStatus: "REVIEWED" as const,
    reviewedById: "policy-reviewer-1",
    reviewEvidenceHash: "sha256:policy-review",
  }
}

function evidence() {
  return {
    attendanceImportHash: "sha256:attendance-import",
    leaveBalanceSnapshotHash: "sha256:leave-balance",
    approvedLeaveRequestHashes: ["sha256:leave-request"],
    approvedOvertimeRequestHashes: ["sha256:overtime-request"],
  }
}

function certificationManifest(sourceRevision = 1) {
  return {
    kind: "STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION",
    version: 1,
    sourceSystem: "hris-attendance",
    sourceRecordId: "attendance-period-emp-1",
    sourceRevision,
    policy: policy(),
    evidence: evidence(),
    approval: {
      preparedById: "attendance-preparer-1",
      approvedById: "manager-1",
      approvalEvidenceHash: "sha256:attendance-approval",
    },
    unresolved: {
      timeEntryCount: 0,
      leaveRequestCount: 0,
      overtimeRequestCount: 0,
      correctionCount: 0,
    },
    totals: {
      scheduledMinutes: 9600,
      workedMinutes: 9000,
      overtimeMinutes: 0,
      absenceMinutes: 200,
      leaveMinutes: 400,
    },
  }
}

function certifyInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    actorId: "manager-1",
    actorPermissions: ["hris.people.read"],
    payrollPeriodId: "period-1",
    employeeId: "emp-1",
    scheduledMinutes: 9600,
    workedMinutes: 9200,
    overtimeMinutes: 120,
    absenceMinutes: 0,
    leaveMinutes: 400,
    sourceSystem: "hris-attendance",
    sourceRecordId: "attendance-period-emp-1",
    sourceRevision: 1,
    preparedById: "attendance-preparer-1",
    approvalEvidenceHash: "sha256:attendance-approval",
    policy: policy(),
    evidence: evidence(),
    unresolved: {
      timeEntryCount: 0,
      leaveRequestCount: 0,
      overtimeRequestCount: 0,
      correctionCount: 0,
    },
    idempotencyKey: "attendance-certify-1",
    ...overrides,
  }
}

function payrollPeriod() {
  return {
    id: "period-1",
    status: PayrollPeriodStatus.OPEN,
    countryCode: "CM",
    periodStart: new Date("2026-06-01T00:00:00.000Z"),
    periodEnd: new Date("2026-06-30T23:59:59.999Z"),
  }
}

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: "attendance-1",
    organizationId: "org-1",
    payrollPeriodId: "period-1",
    employeeId: "emp-1",
    status: PayrollAttendanceSnapshotStatus.FROZEN,
    periodStart: new Date("2026-06-01T00:00:00.000Z"),
    periodEnd: new Date("2026-06-30T23:59:59.999Z"),
    scheduledMinutes: 9600,
    workedMinutes: 9200,
    overtimeMinutes: 120,
    absenceMinutes: 0,
    leaveMinutes: 400,
    sourceHash: "sha256:certified-attendance",
    frozenById: "manager-1",
    frozenAt: new Date("2026-07-01T00:00:00.000Z"),
    correctedFromId: null,
    metadata: { sourcePayload: certificationManifest() },
    ...overrides,
  }
}

describe("HRIS time, leave, and attendance boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockScope.mockResolvedValue(managerScope())
    mockRecordEvent.mockResolvedValue({ event: { id: "event-correction" } })
    mockMarkEvent.mockResolvedValue({ id: "event-correction", status: "APPLIED" })
    mockFreeze.mockImplementation(async (input: Record<string, unknown>) => ({
      attendanceSnapshot: snapshot({
        metadata: { sourcePayload: input.sourcePayload },
      }),
      created: true,
      businessEventId: "event-freeze",
    }))
  })

  it("lets a scoped manager certify approved inputs and delegates only a frozen manifest to payroll", async () => {
    const client = {
      payrollPeriod: { findFirst: jest.fn().mockResolvedValue(payrollPeriod()) },
    }

    const result = await certifyHrisTimeLeaveAttendance(
      certifyInput(),
      client as any,
    )

    expect(mockScope).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorId: "manager-1",
      employeeId: "emp-1",
    }), client)
    expect(mockFreeze).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      employeeId: "emp-1",
      frozenById: "manager-1",
      actorPermissions: expect.arrayContaining([
        "hris.people.read",
        "payroll.attendance.freeze",
      ]),
      sourcePayload: expect.objectContaining({
        kind: "STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION",
        approval: expect.objectContaining({
          preparedById: "attendance-preparer-1",
          approvedById: "manager-1",
        }),
      }),
    }), client)
    expect(result.attendanceSnapshot).toMatchObject({
      certificationStatus: "CERTIFIED",
      sourceProofPresent: true,
      approvalProofPresent: true,
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain("sha256:country-policy")
    expect(serialized).not.toContain("sha256:attendance-approval")
  })

  it("blocks certification while a leave request remains unapproved", async () => {
    const client = {
      payrollPeriod: { findFirst: jest.fn().mockResolvedValue(payrollPeriod()) },
    }

    await expect(certifyHrisTimeLeaveAttendance(certifyInput({
      unresolved: {
        timeEntryCount: 0,
        leaveRequestCount: 1,
        overtimeRequestCount: 0,
        correctionCount: 0,
      },
    }), client as any)).rejects.toThrow("HRIS_TIME_INPUT_UNAPPROVED")

    expect(mockFreeze).not.toHaveBeenCalled()
  })

  it("blocks policy proof from a different payroll country", async () => {
    const client = {
      payrollPeriod: { findFirst: jest.fn().mockResolvedValue(payrollPeriod()) },
    }

    await expect(certifyHrisTimeLeaveAttendance(certifyInput({
      policy: { ...policy(), countryCode: "CI" },
    }), client as any)).rejects.toThrow("HRIS_TIME_POLICY_COUNTRY_MISMATCH")

    expect(mockFreeze).not.toHaveBeenCalled()
  })

  it("requires manager approval to be separate from preparation", async () => {
    const client = {
      payrollPeriod: { findFirst: jest.fn().mockResolvedValue(payrollPeriod()) },
    }

    await expect(certifyHrisTimeLeaveAttendance(certifyInput({
      preparedById: "manager-1",
    }), client as any)).rejects.toThrow("HRIS_TIME_APPROVAL_SEPARATION_REQUIRED")

    expect(mockFreeze).not.toHaveBeenCalled()
  })

  it("supersedes a frozen snapshot and records correction diff evidence without the raw reason", async () => {
    mockScope.mockResolvedValue(adminScope())
    const original = snapshot({
      workedMinutes: 9000,
      overtimeMinutes: 0,
      absenceMinutes: 200,
      metadata: { sourcePayload: certificationManifest(1) },
    })
    const client = {
      payrollPeriod: { findFirst: jest.fn().mockResolvedValue(payrollPeriod()) },
      payrollAttendanceSnapshot: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(original)
          .mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue({
          ...original,
          status: PayrollAttendanceSnapshotStatus.SUPERSEDED,
        }),
        create: jest.fn().mockImplementation(
          async ({ data }: { data: Record<string, unknown> }) =>
            snapshot({ ...data, id: "attendance-correction-1" }),
        ),
      },
      payrollRun: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    }

    const result = await correctCertifiedHrisTimeLeaveAttendance({
      ...certifyInput({
        actorId: "hr-admin-1",
        actorPermissions: ["hris.people.manage"],
        sourceRevision: 2,
      }),
      originalAttendanceSnapshotId: "attendance-1",
      correctionReason: "Approved correction to imported clock records",
      correctionEvidenceHash: "sha256:correction-evidence",
    }, client as any)

    expect(client.payrollAttendanceSnapshot.update).toHaveBeenCalledWith({
      where: { id: "attendance-1" },
      data: { status: PayrollAttendanceSnapshotStatus.SUPERSEDED },
    })
    expect(client.payrollAttendanceSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        correctedFromId: "attendance-1",
        metadata: expect.objectContaining({
          correction: expect.objectContaining({
            correctionEvidenceHash: "sha256:correction-evidence",
            diff: {
              scheduledMinutes: 0,
              workedMinutes: 200,
              overtimeMinutes: 120,
              absenceMinutes: -200,
              leaveMinutes: 0,
            },
          }),
        }),
      }),
    })
    expect(mockRecordEvent).toHaveBeenCalledWith(client, expect.objectContaining({
      eventType: "attendance.period.corrected",
      payload: expect.objectContaining({
        originalAttendanceSnapshotId: "attendance-1",
        diff: expect.objectContaining({ workedMinutes: 200 }),
      }),
    }))
    expect(JSON.stringify(mockRecordEvent.mock.calls[0][1]))
      .not.toContain("Approved correction to imported clock records")
    expect(JSON.stringify(client.auditLog.create.mock.calls[0][0]))
      .not.toContain("Approved correction to imported clock records")
    expect(result.attendanceSnapshot).toMatchObject({
      id: "attendance-correction-1",
      correctedFromId: "attendance-1",
      certificationStatus: "CERTIFIED",
    })
  })

  it("requires a payroll correction run after calculation is sealed", async () => {
    mockScope.mockResolvedValue(adminScope())
    const client = {
      payrollPeriod: { findFirst: jest.fn().mockResolvedValue(payrollPeriod()) },
      payrollAttendanceSnapshot: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(snapshot({
            metadata: { sourcePayload: certificationManifest(1) },
          }))
          .mockResolvedValueOnce(null),
        update: jest.fn(),
        create: jest.fn(),
      },
      payrollRun: {
        findFirst: jest.fn().mockResolvedValue({
          id: "run-1",
          runNumber: "PAY-202606-001",
          status: PayrollRunStatus.CALCULATED,
        }),
      },
      auditLog: { create: jest.fn() },
    }

    await expect(correctCertifiedHrisTimeLeaveAttendance({
      ...certifyInput({
        actorId: "hr-admin-1",
        actorPermissions: ["hris.people.manage"],
        sourceRevision: 2,
      }),
      originalAttendanceSnapshotId: "attendance-1",
      correctionReason: "Approved correction to imported clock records",
      correctionEvidenceHash: "sha256:correction-evidence",
    }, client as any)).rejects.toThrow(
      "HRIS_TIME_CORRECTION_REQUIRES_PAYROLL_CORRECTION_RUN",
    )

    expect(client.payrollAttendanceSnapshot.update).not.toHaveBeenCalled()
    expect(client.payrollAttendanceSnapshot.create).not.toHaveBeenCalled()
  })

  it("binds self-service attendance reads to the authenticated employee", async () => {
    const client = {
      payrollEmployee: {
        findFirst: jest.fn().mockResolvedValue({ id: "emp-1" }),
      },
      payrollAttendanceSnapshot: {
        findMany: jest.fn().mockResolvedValue([snapshot()]),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-own-read" }) },
    }

    const result = await getOwnHrisTimeLeaveAttendanceStatus({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["hris.self_service.read"],
      employeeId: "client-selected-employee",
      limit: 1,
    } as any, client as any)

    expect(client.payrollEmployee.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        userId: "employee-user-1",
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(client.payrollAttendanceSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          employeeId: "emp-1",
        }),
        take: 1,
      }),
    )
    expect(client.payrollAttendanceSnapshot.findMany.mock.calls[0][0].where)
      .not.toHaveProperty("employeeId", "client-selected-employee")
    expect(result.accessScope.authority.kind).toBe("OWN_RECORD")
    expect(result.snapshots[0]).toMatchObject({
      status: PayrollAttendanceSnapshotStatus.FROZEN,
      certificationStatus: "CERTIFIED",
      sourceProofPresent: true,
    })
    expect(JSON.stringify(result)).not.toContain("sha256:certified-attendance")
    expect(client.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "HRIS_TIME_LEAVE_ATTENDANCE_SELF_SERVICE_READ",
        userId: "employee-user-1",
        organizationId: "org-1",
      }),
    }))
  })
})
