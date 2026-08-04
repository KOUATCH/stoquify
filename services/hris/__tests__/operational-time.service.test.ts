import {
  HrisAttendanceAnomalyStatus,
  HrisOperationalStatus,
  HrisTimeRequestStatus,
  HrisTimeRequestType,
} from "@prisma/client"

import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

import {
  buildOperationalAttendanceCertification,
  decideOperationalTimeRequest,
  importOperationalTime,
  requestOperationalTime,
} from "../operational-time.service"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("@/services/hris/org.service", () => ({
  resolveHrisPeopleAccessScope: jest.fn(),
}))

const mockScope = resolveHrisPeopleAccessScope as jest.Mock

function managerScope() {
  return {
    organizationId: "org-1",
    authority: { kind: "REPORTING_RELATIONSHIP" },
    managedLocations: [],
    employeeIds: ["emp-1"],
    limitations: [],
  }
}

describe("HRIS operational time management", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockScope.mockResolvedValue(managerScope())
  })

  it("derives the employee for self-service and creates a pending leave request", async () => {
    const client = {
      payrollEmployee: {
        findFirst: jest.fn().mockResolvedValue({ id: "emp-1" }),
      },
      hrisLeavePolicy: {
        findFirst: jest.fn().mockResolvedValue({ id: "policy-1" }),
      },
      hrisTimeRequest: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: "request-1",
          status: HrisTimeRequestStatus.REQUESTED,
          ...data,
        })),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    }

    const result = await requestOperationalTime({
      organizationId: "org-1",
      actorId: "employee-user-1",
      actorPermissions: ["hris.self_service.request"],
      employeeId: "client-selected-employee",
      leavePolicyId: "policy-1",
      type: HrisTimeRequestType.LEAVE,
      periodStart: new Date("2026-08-03"),
      periodEnd: new Date("2026-08-04"),
      requestedMinutes: 960,
      reason: "Annual leave requested",
      requestEvidenceHash: "sha256:request-proof",
      idempotencyKey: "leave-request-2026-08-03",
    }, client as never)

    expect(client.hrisTimeRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        employeeId: "emp-1",
        requestedById: "employee-user-1",
      }),
    })
    expect(JSON.stringify(client.hrisTimeRequest.create.mock.calls[0][0]))
      .not.toContain("client-selected-employee")
    expect(result.created).toBe(true)
  })

  it("blocks requester self-approval before touching leave balances", async () => {
    const client = {
      hrisTimeRequest: {
        findFirst: jest.fn().mockResolvedValue({
          id: "request-1",
          employeeId: "emp-1",
          leavePolicyId: "policy-1",
          requestedById: "manager-1",
          type: HrisTimeRequestType.LEAVE,
          status: HrisTimeRequestStatus.REQUESTED,
          requestedMinutes: 480,
        }),
        update: jest.fn(),
      },
      hrisLeaveBalanceEntry: {
        aggregate: jest.fn(),
        create: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    }

    await expect(decideOperationalTimeRequest({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.manage"],
      requestId: "request-1",
      employeeId: "emp-1",
      decision: "APPROVE",
      decisionReason: "Approved",
      approvalEvidenceHash: "sha256:approval-proof",
    }, client as never)).rejects.toThrow("SOD_VIOLATION")

    expect(client.hrisLeaveBalanceEntry.aggregate).not.toHaveBeenCalled()
    expect(client.hrisTimeRequest.update).not.toHaveBeenCalled()
  })

  it("validates imports and creates an anomaly queue for unreconciled rows", async () => {
    const client = {
      payrollEmployee: {
        findMany: jest.fn().mockResolvedValue([{ id: "emp-1" }]),
      },
      hrisTimeImportBatch: {
        create: jest.fn().mockResolvedValue({ id: "batch-1" }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: "batch-1",
          ...data,
        })),
      },
      hrisTimeEntry: {
        create: jest.fn().mockResolvedValue({ id: "entry-1" }),
      },
      hrisAttendanceAnomaly: {
        create: jest.fn().mockResolvedValue({ id: "anomaly-1" }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
    }

    const result = await importOperationalTime({
      organizationId: "org-1",
      actorId: "hr-admin-1",
      actorPermissions: ["hris.people.manage"],
      sourceSystem: "CLOCK_API",
      sourceHash: "sha256:batch-proof",
      idempotencyKey: "clock-import-2026-08-01",
      entries: [{
        sourceRecordId: "clock-row-1",
        employeeId: "emp-1",
        workDate: new Date("2026-08-01"),
        scheduledMinutes: 480,
        workedMinutes: 420,
        overtimeMinutes: 0,
        absenceMinutes: 0,
        sourceHash: "sha256:row-proof",
      }],
    }, client as never)

    expect(client.hrisAttendanceAnomaly.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: "SCHEDULE_RECONCILIATION_MISMATCH",
      }),
    })
    expect(result).toMatchObject({
      acceptedCount: 0,
      rejectedCount: 1,
      status: "REJECTED",
    })
  })

  it("builds certified snapshot input only from active policies, validated entries, approved requests and a clean anomaly queue", async () => {
    const period = {
      id: "period-1",
      organizationId: "org-1",
      countryCode: "CM",
      periodStart: new Date("2026-08-01"),
      periodEnd: new Date("2026-08-31"),
    }
    const client = {
      payrollPeriod: { findFirst: jest.fn().mockResolvedValue(period) },
      payrollEmployee: {
        findFirst: jest.fn().mockResolvedValue({ id: "emp-1" }),
      },
      hrisWorkSchedule: {
        findFirst: jest.fn().mockResolvedValue({
          id: "schedule-1",
          status: HrisOperationalStatus.ACTIVE,
          sourceHash: "sha256:schedule-proof",
          calendar: { sourceHash: "sha256:calendar-proof" },
        }),
      },
      hrisLeavePolicy: {
        findFirst: jest.fn().mockResolvedValue({
          id: "policy-1",
          code: "ANNUAL",
          version: 1,
          sourceHash: "sha256:policy-proof",
          approvedById: "policy-reviewer-1",
          approvalEvidenceHash: "sha256:policy-review",
          effectiveFrom: new Date("2026-01-01"),
          effectiveTo: null,
        }),
      },
      hrisTimeEntry: {
        findMany: jest.fn().mockResolvedValue([{
          scheduledMinutes: 480,
          workedMinutes: 420,
          overtimeMinutes: 60,
          absenceMinutes: 60,
        }]),
      },
      hrisTimeRequest: {
        findMany: jest.fn().mockResolvedValue([{
          type: HrisTimeRequestType.OVERTIME,
          status: HrisTimeRequestStatus.APPROVED,
          requestedMinutes: 60,
          sourceHash: "sha256:overtime-proof",
        }]),
      },
      hrisAttendanceAnomaly: { count: jest.fn().mockResolvedValue(0) },
      hrisTimeImportBatch: {
        findMany: jest.fn().mockResolvedValue([
          { sourceHash: "sha256:import-proof" },
        ]),
      },
      hrisLeaveBalanceEntry: { findMany: jest.fn().mockResolvedValue([]) },
    }

    const certification = await buildOperationalAttendanceCertification({
      organizationId: "org-1",
      actorId: "manager-1",
      actorPermissions: ["hris.people.read"],
      employeeId: "emp-1",
      payrollPeriodId: "period-1",
      preparedById: "time-preparer-1",
      approvalEvidenceHash: "sha256:attendance-approval",
    }, client as never)

    expect(certification.sourcePayload).toMatchObject({
      kind: "STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION",
      policy: {
        scheduleHash: "sha256:schedule-proof",
        holidayCalendarHash: "sha256:calendar-proof",
      },
      unresolved: {
        timeEntryCount: 0,
        leaveRequestCount: 0,
        overtimeRequestCount: 0,
        correctionCount: 0,
      },
      totals: {
        scheduledMinutes: 480,
        workedMinutes: 420,
        overtimeMinutes: 60,
        absenceMinutes: 60,
        leaveMinutes: 0,
      },
    })
    expect(client.hrisAttendanceAnomaly.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        employeeId: "emp-1",
        status: HrisAttendanceAnomalyStatus.OPEN,
      },
    })
  })
})
