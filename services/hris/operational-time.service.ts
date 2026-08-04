import "server-only"

import { createHash } from "node:crypto"

import {
  HrisAttendanceAnomalyStatus,
  HrisOperationalStatus,
  HrisTimeEntryStatus,
  HrisTimeImportStatus,
  HrisTimeRequestStatus,
  HrisTimeRequestType,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"

type OperationalTimeClient = typeof db | Prisma.TransactionClient

const proofHash = z.string().trim().min(8).max(256)
const actor = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).default([]),
})

const timeRequestSchema = actor.extend({
  employeeId: z.string().trim().min(1).optional(),
  leavePolicyId: z.string().trim().min(1).optional(),
  type: z.nativeEnum(HrisTimeRequestType),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  requestedMinutes: z.number().int().positive(),
  proposedWorkedMinutes: z.number().int().nonnegative().optional(),
  proposedAbsenceMinutes: z.number().int().nonnegative().optional(),
  reason: z.string().trim().min(8).max(1000),
  requestEvidenceHash: proofHash,
  idempotencyKey: z.string().trim().min(8).max(160),
})

const decisionSchema = actor.extend({
  requestId: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  decisionReason: z.string().trim().min(3).max(1000),
  approvalEvidenceHash: proofHash.optional(),
})

const importSchema = actor.extend({
  sourceSystem: z.string().trim().min(1).max(120),
  sourceFileName: z.string().trim().max(255).optional(),
  sourceHash: proofHash,
  idempotencyKey: z.string().trim().min(8).max(160),
  entries: z.array(z.object({
    sourceRecordId: z.string().trim().min(1).max(160),
    employeeId: z.string().trim().min(1),
    workDate: z.coerce.date(),
    scheduledMinutes: z.number().int().nonnegative(),
    workedMinutes: z.number().int().nonnegative(),
    overtimeMinutes: z.number().int().nonnegative().default(0),
    absenceMinutes: z.number().int().nonnegative().default(0),
    sourceHash: proofHash,
  })).min(1).max(5000),
})

const anomalyDecisionSchema = actor.extend({
  anomalyId: z.string().trim().min(1),
  status: z.enum(["RESOLVED", "DISMISSED"]),
  resolutionHash: proofHash,
})

const certificationSchema = actor.extend({
  employeeId: z.string().trim().min(1),
  payrollPeriodId: z.string().trim().min(1),
  preparedById: z.string().trim().min(1),
  approvalEvidenceHash: proofHash,
})

const readSchema = actor.extend({
  employeeId: z.string().trim().min(1).optional(),
  limit: z.number().int().positive().max(100).default(50),
})

const MANAGE = ["hris.people.manage"] as const
const READ = ["hris.people.read", "hris.people.manage"] as const
const SELF_REQUEST = [
  "hris.self_service.request",
  "hris.people.manage",
] as const

function assertPermission(
  permissions: readonly string[],
  allowed: readonly string[],
  operation: string,
) {
  if (!hasAnyRbacPermission(permissions, allowed)) {
    throw new ForbiddenError(`Missing permission for ${operation}.`)
  }
}

function hash(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function isRootClient(
  client: OperationalTimeClient,
): client is typeof db {
  return "$transaction" in client
}

async function transaction<T>(
  client: OperationalTimeClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return isRootClient(client)
    ? client.$transaction(operation)
    : operation(client)
}

async function ownEmployee(
  client: OperationalTimeClient,
  organizationId: string,
  actorId: string,
) {
  const employee = await client.payrollEmployee.findFirst({
    where: { organizationId, userId: actorId, deletedAt: null },
    select: { id: true },
  })
  if (!employee) {
    throw new NotFoundError(
      "No HRIS employee profile is linked to the authenticated user.",
    )
  }
  return employee.id
}

async function scopedEmployee(
  client: OperationalTimeClient,
  input: z.output<typeof actor> & { employeeId: string },
) {
  await resolveHrisPeopleAccessScope({
    ...input,
    employeeId: input.employeeId,
    limit: 1,
    asOf: new Date(),
    delegationAuthority: "APPROVAL_DECISION",
  }, client)
}

async function audit(
  client: OperationalTimeClient,
  input: z.output<typeof actor>,
  entityType: string,
  entityId: string,
  action: string,
  changes: Record<string, unknown>,
) {
  await client.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      userId: input.actorId,
      organizationId: input.organizationId,
      changes: json(changes),
    },
  })
}

export const createTimeFoundationInputSchema = actor.extend({
  countryCode: z.string().trim().length(2),
  calendarCode: z.string().trim().min(1).max(40),
  calendarName: z.string().trim().min(1).max(160),
  timezone: z.string().trim().min(1).max(80),
  calendarVersion: z.number().int().positive().default(1),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().nullable().optional(),
  calendarSourceHash: proofHash,
  holidays: z.array(z.object({
    date: z.coerce.date(),
    name: z.string().trim().min(1).max(160),
    paid: z.boolean().default(true),
    sourceHash: proofHash,
  })).max(100),
  leavePolicyCode: z.string().trim().min(1).max(40),
  leavePolicyName: z.string().trim().min(1).max(160),
  leavePolicyVersion: z.number().int().positive().default(1),
  annualEntitlementMinutes: z.number().int().nonnegative(),
  carryOverLimitMinutes: z.number().int().nonnegative().default(0),
  accrualRule: z.record(z.string(), z.unknown()),
  leavePolicySourceHash: proofHash,
})

export async function createTimeFoundation(
  input: z.input<typeof createTimeFoundationInputSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = createTimeFoundationInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE, "time policy preparation")
  if (parsed.effectiveTo && parsed.effectiveTo <= parsed.effectiveFrom) {
    throw new BusinessRuleError(
      "HRIS_TIME_EFFECTIVE_RANGE_INVALID: Effective-to must follow effective-from.",
    )
  }

  return transaction(client, async (tx) => {
    const calendar = await tx.hrisWorkCalendar.create({
      data: {
        organizationId: parsed.organizationId,
        code: parsed.calendarCode,
        name: parsed.calendarName,
        countryCode: parsed.countryCode.toUpperCase(),
        timezone: parsed.timezone,
        version: parsed.calendarVersion,
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo ?? null,
        sourceHash: parsed.calendarSourceHash,
        metadata: json({ preparedById: parsed.actorId }),
        holidays: {
          create: parsed.holidays.map((holiday) => ({
            organizationId: parsed.organizationId,
            holidayDate: holiday.date,
            name: holiday.name,
            paid: holiday.paid,
            sourceHash: holiday.sourceHash,
          })),
        },
      },
      include: { holidays: true },
    })
    const leavePolicy = await tx.hrisLeavePolicy.create({
      data: {
        organizationId: parsed.organizationId,
        code: parsed.leavePolicyCode,
        name: parsed.leavePolicyName,
        countryCode: parsed.countryCode.toUpperCase(),
        version: parsed.leavePolicyVersion,
        annualEntitlementMinutes: parsed.annualEntitlementMinutes,
        carryOverLimitMinutes: parsed.carryOverLimitMinutes,
        accrualRule: json(parsed.accrualRule),
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo ?? null,
        preparedById: parsed.actorId,
        sourceHash: parsed.leavePolicySourceHash,
      },
    })
    await audit(tx, parsed, "HrisTimeFoundation", calendar.id,
      "HRIS_TIME_FOUNDATION_PREPARED", {
        calendarId: calendar.id,
        leavePolicyId: leavePolicy.id,
        holidayCount: calendar.holidays.length,
        sourceHashesPresent: true,
      })
    return { calendar, leavePolicy }
  })
}

export const approveTimeFoundationInputSchema = actor.extend({
  calendarId: z.string().trim().min(1),
  leavePolicyId: z.string().trim().min(1),
  approvalEvidenceHash: proofHash,
})

export async function approveTimeFoundation(
  input: z.input<typeof approveTimeFoundationInputSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = approveTimeFoundationInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE, "time policy approval")
  return transaction(client, async (tx) => {
    const [calendar, policy] = await Promise.all([
      tx.hrisWorkCalendar.findFirst({
        where: {
          id: parsed.calendarId,
          organizationId: parsed.organizationId,
          status: HrisOperationalStatus.DRAFT,
        },
      }),
      tx.hrisLeavePolicy.findFirst({
        where: {
          id: parsed.leavePolicyId,
          organizationId: parsed.organizationId,
          status: HrisOperationalStatus.DRAFT,
        },
      }),
    ])
    if (!calendar || !policy) {
      throw new NotFoundError("Draft time foundation was not found.")
    }
    const preparedById =
      typeof calendar.metadata === "object" && calendar.metadata
      && !Array.isArray(calendar.metadata)
      && typeof (calendar.metadata as Record<string, unknown>).preparedById === "string"
        ? (calendar.metadata as Record<string, unknown>).preparedById as string
        : policy.preparedById
    if (preparedById === parsed.actorId || policy.preparedById === parsed.actorId) {
      throw new BusinessRuleError(
        "SOD_VIOLATION: A time-policy preparer cannot approve the same foundation.",
      )
    }
    const now = new Date()
    const [approvedCalendar, approvedPolicy] = await Promise.all([
      tx.hrisWorkCalendar.update({
        where: { id: calendar.id },
        data: {
          status: HrisOperationalStatus.ACTIVE,
          reviewedById: parsed.actorId,
          reviewedAt: now,
        },
      }),
      tx.hrisLeavePolicy.update({
        where: { id: policy.id },
        data: {
          status: HrisOperationalStatus.ACTIVE,
          approvedById: parsed.actorId,
          approvedAt: now,
          approvalEvidenceHash: parsed.approvalEvidenceHash,
        },
      }),
    ])
    await audit(tx, parsed, "HrisTimeFoundation", calendar.id,
      "HRIS_TIME_FOUNDATION_APPROVED", {
        calendarId: calendar.id,
        leavePolicyId: policy.id,
        approvalEvidencePresent: true,
      })
    return { calendar: approvedCalendar, leavePolicy: approvedPolicy }
  })
}

export const assignWorkScheduleInputSchema = actor.extend({
  employeeId: z.string().trim().min(1),
  calendarId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(160),
  timezone: z.string().trim().min(1).max(80),
  weeklyPattern: z.record(
    z.string(),
    z.number().int().nonnegative().max(1440),
  ),
  standardWeeklyMinutes: z.number().int().positive().max(10080),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().nullable().optional(),
  sourceHash: proofHash,
})

export async function assignWorkSchedule(
  input: z.input<typeof assignWorkScheduleInputSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = assignWorkScheduleInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE, "work schedule preparation")
  await scopedEmployee(client, parsed)
  const calendar = await client.hrisWorkCalendar.findFirst({
    where: {
      id: parsed.calendarId,
      organizationId: parsed.organizationId,
      status: HrisOperationalStatus.ACTIVE,
    },
    select: { id: true, timezone: true },
  })
  if (!calendar) throw new NotFoundError("Active work calendar was not found.")
  if (calendar.timezone !== parsed.timezone) {
    throw new BusinessRuleError(
      "HRIS_SCHEDULE_TIMEZONE_MISMATCH: Schedule and calendar timezones must match.",
    )
  }
  return client.hrisWorkSchedule.create({
    data: {
      organizationId: parsed.organizationId,
      employeeId: parsed.employeeId,
      calendarId: parsed.calendarId,
      name: parsed.name,
      timezone: parsed.timezone,
      weeklyPattern: json(parsed.weeklyPattern),
      standardWeeklyMinutes: parsed.standardWeeklyMinutes,
      effectiveFrom: parsed.effectiveFrom,
      effectiveTo: parsed.effectiveTo ?? null,
      preparedById: parsed.actorId,
      sourceHash: parsed.sourceHash,
    },
  })
}

export const approveWorkScheduleInputSchema = actor.extend({
  scheduleId: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  approvalEvidenceHash: proofHash,
})

export async function approveWorkSchedule(
  input: z.input<typeof approveWorkScheduleInputSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = approveWorkScheduleInputSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE, "work schedule approval")
  await scopedEmployee(client, parsed)
  const schedule = await client.hrisWorkSchedule.findFirst({
    where: {
      id: parsed.scheduleId,
      employeeId: parsed.employeeId,
      organizationId: parsed.organizationId,
      status: HrisOperationalStatus.DRAFT,
    },
  })
  if (!schedule) throw new NotFoundError("Draft work schedule was not found.")
  if (schedule.preparedById === parsed.actorId) {
    throw new BusinessRuleError(
      "SOD_VIOLATION: A schedule preparer cannot approve the same schedule.",
    )
  }
  return client.hrisWorkSchedule.update({
    where: { id: schedule.id },
    data: {
      status: HrisOperationalStatus.ACTIVE,
      approvedById: parsed.actorId,
      approvedAt: new Date(),
      approvalEvidenceHash: parsed.approvalEvidenceHash,
    },
  })
}

export async function requestOperationalTime(
  input: z.input<typeof timeRequestSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = timeRequestSchema.parse(input)
  assertPermission(parsed.actorPermissions, SELF_REQUEST, "time request")
  if (parsed.periodEnd < parsed.periodStart) {
    throw new BusinessRuleError(
      "HRIS_TIME_REQUEST_RANGE_INVALID: Request end precedes its start.",
    )
  }
  const employeeId = hasAnyRbacPermission(parsed.actorPermissions, MANAGE)
    ? parsed.employeeId
    : await ownEmployee(client, parsed.organizationId, parsed.actorId)
  if (!employeeId) {
    throw new BusinessRuleError("Employee is required for an HRIS time request.")
  }
  if (hasAnyRbacPermission(parsed.actorPermissions, MANAGE)) {
    await scopedEmployee(client, { ...parsed, employeeId })
  }
  if (parsed.type === HrisTimeRequestType.LEAVE && !parsed.leavePolicyId) {
    throw new BusinessRuleError(
      "HRIS_LEAVE_POLICY_REQUIRED: Leave requests require an active leave policy.",
    )
  }
  if (parsed.leavePolicyId) {
    const policy = await client.hrisLeavePolicy.findFirst({
      where: {
        id: parsed.leavePolicyId,
        organizationId: parsed.organizationId,
        status: HrisOperationalStatus.ACTIVE,
        effectiveFrom: { lte: parsed.periodStart },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: parsed.periodEnd } }],
      },
      select: { id: true },
    })
    if (!policy) {
      throw new BusinessRuleError(
        "HRIS_LEAVE_POLICY_NOT_EFFECTIVE: No active leave policy covers the request.",
      )
    }
  }
  const sourceHash = hash({
    employeeId,
    type: parsed.type,
    periodStart: parsed.periodStart.toISOString(),
    periodEnd: parsed.periodEnd.toISOString(),
    requestedMinutes: parsed.requestedMinutes,
    requestEvidenceHash: parsed.requestEvidenceHash,
  })
  return transaction(client, async (tx) => {
    const existing = await tx.hrisTimeRequest.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: parsed.organizationId,
          idempotencyKey: parsed.idempotencyKey,
        },
      },
    })
    if (existing) {
      if (existing.sourceHash !== sourceHash) {
        throw new BusinessRuleError(
          "IDEMPOTENCY_CONFLICT: This request key was used for different time data.",
        )
      }
      return { request: existing, created: false }
    }
    const request = await tx.hrisTimeRequest.create({
      data: {
        organizationId: parsed.organizationId,
        employeeId,
        leavePolicyId: parsed.leavePolicyId ?? null,
        type: parsed.type,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        requestedMinutes: parsed.requestedMinutes,
        proposedWorkedMinutes: parsed.proposedWorkedMinutes,
        proposedAbsenceMinutes: parsed.proposedAbsenceMinutes,
        reason: parsed.reason,
        requestedById: parsed.actorId,
        requestEvidenceHash: parsed.requestEvidenceHash,
        sourceHash,
        idempotencyKey: parsed.idempotencyKey,
      },
    })
    await audit(tx, parsed, "HrisTimeRequest", request.id,
      `HRIS_${parsed.type}_REQUESTED`, {
        employeeId,
        requestedMinutes: parsed.requestedMinutes,
        requestEvidencePresent: true,
        reasonIncluded: false,
      })
    return { request, created: true }
  })
}

export async function decideOperationalTimeRequest(
  input: z.input<typeof decisionSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = decisionSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE, "time request decision")
  await scopedEmployee(client, parsed)
  return transaction(client, async (tx) => {
    const request = await tx.hrisTimeRequest.findFirst({
      where: {
        id: parsed.requestId,
        employeeId: parsed.employeeId,
        organizationId: parsed.organizationId,
        status: HrisTimeRequestStatus.REQUESTED,
      },
    })
    if (!request) throw new NotFoundError("Pending time request was not found.")
    if (request.requestedById === parsed.actorId) {
      throw new BusinessRuleError(
        "SOD_VIOLATION: A requester cannot approve or reject their own request.",
      )
    }
    if (parsed.decision === "APPROVE" && !parsed.approvalEvidenceHash) {
      throw new BusinessRuleError(
        "MISSING_DOCUMENT: Approval evidence is required.",
      )
    }
    if (
      request.type === HrisTimeRequestType.LEAVE
      && parsed.decision === "APPROVE"
    ) {
      const balance = await tx.hrisLeaveBalanceEntry.aggregate({
        where: {
          organizationId: parsed.organizationId,
          employeeId: request.employeeId,
          leavePolicyId: request.leavePolicyId!,
          effectiveAt: { lte: request.periodStart },
        },
        _sum: { deltaMinutes: true },
      })
      if ((balance._sum.deltaMinutes ?? 0) < request.requestedMinutes) {
        throw new BusinessRuleError(
          "HRIS_LEAVE_BALANCE_INSUFFICIENT: Approved leave cannot exceed the certified balance.",
        )
      }
    }
    const approved = parsed.decision === "APPROVE"
    const updated = await tx.hrisTimeRequest.update({
      where: { id: request.id },
      data: {
        status: approved
          ? HrisTimeRequestStatus.APPROVED
          : HrisTimeRequestStatus.REJECTED,
        reviewedById: parsed.actorId,
        reviewedAt: new Date(),
        approvalEvidenceHash: parsed.approvalEvidenceHash ?? null,
        metadata: json({
          decisionReasonHash: hash(parsed.decisionReason),
          rawDecisionReasonStored: false,
        }),
      },
    })
    if (approved && request.type === HrisTimeRequestType.LEAVE) {
      await tx.hrisLeaveBalanceEntry.create({
        data: {
          organizationId: parsed.organizationId,
          employeeId: request.employeeId,
          leavePolicyId: request.leavePolicyId!,
          deltaMinutes: -request.requestedMinutes,
          effectiveAt: request.periodStart,
          entryType: "LEAVE_APPROVED",
          sourceType: "HRIS_TIME_REQUEST",
          sourceId: request.id,
          sourceHash: request.sourceHash,
          idempotencyKey: `leave-debit:${request.id}`,
          createdById: parsed.actorId,
        },
      })
    }
    await audit(tx, parsed, "HrisTimeRequest", request.id,
      `HRIS_${request.type}_${parsed.decision}D`, {
        employeeId: request.employeeId,
        approvalEvidencePresent: Boolean(parsed.approvalEvidenceHash),
        decisionReasonHash: hash(parsed.decisionReason),
      })
    return updated
  })
}

export async function importOperationalTime(
  input: z.input<typeof importSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = importSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE, "time import")
  const employeeIds = [...new Set(parsed.entries.map((entry) => entry.employeeId))]
  const employees = await client.payrollEmployee.findMany({
    where: {
      organizationId: parsed.organizationId,
      id: { in: employeeIds },
      deletedAt: null,
    },
    select: { id: true },
  })
  const known = new Set(employees.map((employee) => employee.id))
  return transaction(client, async (tx) => {
    const batch = await tx.hrisTimeImportBatch.create({
      data: {
        organizationId: parsed.organizationId,
        sourceSystem: parsed.sourceSystem,
        sourceFileName: parsed.sourceFileName,
        sourceHash: parsed.sourceHash,
        rowCount: parsed.entries.length,
        importedById: parsed.actorId,
        idempotencyKey: parsed.idempotencyKey,
      },
    })
    let acceptedCount = 0
    let rejectedCount = 0
    for (const entry of parsed.entries) {
      const issues: string[] = []
      if (!known.has(entry.employeeId)) issues.push("UNKNOWN_EMPLOYEE")
      if (
        entry.workedMinutes + entry.absenceMinutes
        !== entry.scheduledMinutes
      ) issues.push("SCHEDULE_RECONCILIATION_MISMATCH")
      if (entry.overtimeMinutes > entry.workedMinutes) {
        issues.push("OVERTIME_EXCEEDS_WORKED")
      }
      const status = issues.length
        ? HrisTimeEntryStatus.REJECTED
        : HrisTimeEntryStatus.VALIDATED
      const timeEntry = known.has(entry.employeeId)
        ? await tx.hrisTimeEntry.create({
            data: {
              organizationId: parsed.organizationId,
              importBatchId: batch.id,
              employeeId: entry.employeeId,
              workDate: entry.workDate,
              scheduledMinutes: entry.scheduledMinutes,
              workedMinutes: entry.workedMinutes,
              overtimeMinutes: entry.overtimeMinutes,
              absenceMinutes: entry.absenceMinutes,
              status,
              sourceRecordId: entry.sourceRecordId,
              sourceHash: entry.sourceHash,
            },
          })
        : null
      if (issues.length) {
        rejectedCount += 1
        for (const code of issues) {
          await tx.hrisAttendanceAnomaly.create({
            data: {
              organizationId: parsed.organizationId,
              importBatchId: batch.id,
              timeEntryId: timeEntry?.id ?? null,
              employeeId: known.has(entry.employeeId)
                ? entry.employeeId
                : null,
              code,
              severity: code === "UNKNOWN_EMPLOYEE" ? "HIGH" : "MEDIUM",
              evidenceHash: hash({
                sourceHash: entry.sourceHash,
                code,
              }),
              detail: json({
                sourceRecordIdHash: hash(entry.sourceRecordId),
                rawRecordIncluded: false,
              }),
            },
          })
        }
      } else acceptedCount += 1
    }
    const finalized = await tx.hrisTimeImportBatch.update({
      where: { id: batch.id },
      data: {
        status: rejectedCount
          ? HrisTimeImportStatus.REJECTED
          : HrisTimeImportStatus.VALIDATED,
        acceptedCount,
        rejectedCount,
        validatedById: parsed.actorId,
        validatedAt: new Date(),
      },
    })
    await audit(tx, parsed, "HrisTimeImportBatch", batch.id,
      "HRIS_TIME_IMPORT_VALIDATED", {
        acceptedCount,
        rejectedCount,
        sourceHashPresent: true,
      })
    return finalized
  })
}

export async function resolveOperationalTimeAnomaly(
  input: z.input<typeof anomalyDecisionSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = anomalyDecisionSchema.parse(input)
  assertPermission(parsed.actorPermissions, MANAGE, "attendance anomaly resolution")
  const anomaly = await client.hrisAttendanceAnomaly.findFirst({
    where: {
      id: parsed.anomalyId,
      organizationId: parsed.organizationId,
      status: HrisAttendanceAnomalyStatus.OPEN,
    },
  })
  if (!anomaly) throw new NotFoundError("Open attendance anomaly was not found.")
  return client.hrisAttendanceAnomaly.update({
    where: { id: anomaly.id },
    data: {
      status: parsed.status,
      resolvedById: parsed.actorId,
      resolvedAt: new Date(),
      resolutionHash: parsed.resolutionHash,
    },
  })
}

export async function buildOperationalAttendanceCertification(
  input: z.input<typeof certificationSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = certificationSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ, "attendance certification preparation")
  await scopedEmployee(client, parsed)
  if (parsed.preparedById === parsed.actorId) {
    throw new BusinessRuleError(
      "SOD_VIOLATION: Attendance preparer cannot certify their own period.",
    )
  }
  const period = await client.payrollPeriod.findFirst({
    where: {
      id: parsed.payrollPeriodId,
      organizationId: parsed.organizationId,
    },
  })
  if (!period) throw new NotFoundError("Payroll period was not found.")
  const [employee, schedule, policy, entries, requests, anomalies, imports, balance] =
    await Promise.all([
      client.payrollEmployee.findFirst({
        where: {
          id: parsed.employeeId,
          organizationId: parsed.organizationId,
          deletedAt: null,
        },
      }),
      client.hrisWorkSchedule.findFirst({
        where: {
          organizationId: parsed.organizationId,
          employeeId: parsed.employeeId,
          status: HrisOperationalStatus.ACTIVE,
          effectiveFrom: { lte: period.periodStart },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodEnd } }],
        },
        include: { calendar: true },
        orderBy: { effectiveFrom: "desc" },
      }),
      client.hrisLeavePolicy.findFirst({
        where: {
          organizationId: parsed.organizationId,
          countryCode: period.countryCode,
          status: HrisOperationalStatus.ACTIVE,
          effectiveFrom: { lte: period.periodStart },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.periodEnd } }],
        },
        orderBy: { effectiveFrom: "desc" },
      }),
      client.hrisTimeEntry.findMany({
        where: {
          organizationId: parsed.organizationId,
          employeeId: parsed.employeeId,
          workDate: { gte: period.periodStart, lte: period.periodEnd },
          status: HrisTimeEntryStatus.VALIDATED,
        },
      }),
      client.hrisTimeRequest.findMany({
        where: {
          organizationId: parsed.organizationId,
          employeeId: parsed.employeeId,
          periodStart: { lte: period.periodEnd },
          periodEnd: { gte: period.periodStart },
        },
      }),
      client.hrisAttendanceAnomaly.count({
        where: {
          organizationId: parsed.organizationId,
          employeeId: parsed.employeeId,
          status: HrisAttendanceAnomalyStatus.OPEN,
        },
      }),
      client.hrisTimeImportBatch.findMany({
        where: {
          organizationId: parsed.organizationId,
          entries: {
            some: {
              employeeId: parsed.employeeId,
              workDate: { gte: period.periodStart, lte: period.periodEnd },
            },
          },
        },
        select: { sourceHash: true },
      }),
      client.hrisLeaveBalanceEntry.findMany({
        where: {
          organizationId: parsed.organizationId,
          employeeId: parsed.employeeId,
          effectiveAt: { lte: period.periodEnd },
        },
        select: { sourceHash: true, deltaMinutes: true },
      }),
    ])
  if (!employee || !schedule || !policy) {
    throw new BusinessRuleError(
      "HRIS_TIME_FOUNDATION_INCOMPLETE: Employee, active schedule/calendar, and leave policy are required.",
    )
  }
  const pending = requests.filter(
    (request) => request.status === HrisTimeRequestStatus.REQUESTED,
  )
  if (anomalies || pending.length) {
    throw new BusinessRuleError(
      "HRIS_TIME_INPUT_UNAPPROVED: Open anomalies or pending requests block certification.",
    )
  }
  const approvedLeave = requests.filter(
    (request) =>
      request.status === HrisTimeRequestStatus.APPROVED
      && request.type === HrisTimeRequestType.LEAVE,
  )
  const approvedOvertime = requests.filter(
    (request) =>
      request.status === HrisTimeRequestStatus.APPROVED
      && request.type === HrisTimeRequestType.OVERTIME,
  )
  const totals = entries.reduce((result, entry) => ({
    scheduledMinutes: result.scheduledMinutes + entry.scheduledMinutes,
    workedMinutes: result.workedMinutes + entry.workedMinutes,
    overtimeMinutes: result.overtimeMinutes + entry.overtimeMinutes,
    absenceMinutes: result.absenceMinutes + entry.absenceMinutes,
    leaveMinutes: result.leaveMinutes,
  }), {
    scheduledMinutes: 0,
    workedMinutes: 0,
    overtimeMinutes: 0,
    absenceMinutes: 0,
    leaveMinutes: approvedLeave.reduce(
      (sum, request) => sum + request.requestedMinutes,
      0,
    ),
  })
  totals.absenceMinutes = Math.max(
    0,
    totals.scheduledMinutes - totals.workedMinutes - totals.leaveMinutes,
  )
  if (totals.scheduledMinutes <= 0) {
    throw new BusinessRuleError(
      "HRIS_TIME_ENTRIES_MISSING: Validated time entries are required for certification.",
    )
  }
  const sourcePayload = {
    kind: "STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION" as const,
    version: 1 as const,
    sourceSystem: "STOQUIFY_HRIS_OPERATIONAL_TIME",
    sourceRecordId: `${parsed.employeeId}:${parsed.payrollPeriodId}`,
    sourceRevision: 1,
    policy: {
      countryCode: period.countryCode,
      policyVersion: `${policy.code}:${policy.version}`,
      countryPolicyHash: policy.sourceHash,
      companyPolicyHash: policy.sourceHash,
      leavePolicyHash: policy.sourceHash,
      overtimePolicyHash: policy.sourceHash,
      scheduleHash: schedule.sourceHash,
      holidayCalendarHash: schedule.calendar.sourceHash,
      effectiveFrom: policy.effectiveFrom.toISOString(),
      effectiveTo: policy.effectiveTo?.toISOString() ?? null,
      verificationStatus: "REVIEWED" as const,
      reviewedById: policy.approvedById!,
      reviewEvidenceHash: policy.approvalEvidenceHash!,
    },
    evidence: {
      attendanceImportHash: hash(imports.map((item) => item.sourceHash).sort()),
      leaveBalanceSnapshotHash: hash(balance),
      approvedLeaveRequestHashes: approvedLeave.map((item) => item.sourceHash).sort(),
      approvedOvertimeRequestHashes: approvedOvertime.map((item) => item.sourceHash).sort(),
    },
    approval: {
      preparedById: parsed.preparedById,
      approvedById: parsed.actorId,
      approvalEvidenceHash: parsed.approvalEvidenceHash,
    },
    unresolved: {
      timeEntryCount: 0,
      leaveRequestCount: 0,
      overtimeRequestCount: 0,
      correctionCount: 0,
    },
    totals,
  }
  return {
    payrollPeriodId: parsed.payrollPeriodId,
    employeeId: parsed.employeeId,
    ...totals,
    sourceSystem: sourcePayload.sourceSystem,
    sourceRecordId: sourcePayload.sourceRecordId,
    sourceRevision: sourcePayload.sourceRevision,
    preparedById: parsed.preparedById,
    approvalEvidenceHash: parsed.approvalEvidenceHash,
    policy: sourcePayload.policy,
    evidence: sourcePayload.evidence,
    unresolved: sourcePayload.unresolved,
    sourcePayload,
    idempotencyKey: `operational-attendance:${parsed.employeeId}:${parsed.payrollPeriodId}:1`,
  }
}

export async function getOwnOperationalTime(
  input: z.input<typeof readSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = readSchema.parse(input)
  assertPermission(parsed.actorPermissions, [
    "hris.self_service.read",
    ...SELF_REQUEST,
  ], "own operational time read")
  const employeeId = await ownEmployee(
    client,
    parsed.organizationId,
    parsed.actorId,
  )
  const [requests, balances] = await Promise.all([
    client.hrisTimeRequest.findMany({
      where: { organizationId: parsed.organizationId, employeeId },
      orderBy: { requestedAt: "desc" },
      take: parsed.limit,
      select: {
        id: true,
        type: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        requestedMinutes: true,
        requestedAt: true,
      },
    }),
    client.hrisLeaveBalanceEntry.groupBy({
      by: ["leavePolicyId"],
      where: { organizationId: parsed.organizationId, employeeId },
      _sum: { deltaMinutes: true },
    }),
  ])
  return {
    employeeId,
    requests,
    balances: balances.map((item) => ({
      leavePolicyId: item.leavePolicyId,
      availableMinutes: item._sum.deltaMinutes ?? 0,
    })),
  }
}

export async function getManagedOperationalTimeInbox(
  input: z.input<typeof readSchema>,
  client: OperationalTimeClient = db,
) {
  const parsed = readSchema.parse(input)
  assertPermission(parsed.actorPermissions, READ, "managed time inbox read")
  const scope = await resolveHrisPeopleAccessScope(parsed, client)
  const requests = await client.hrisTimeRequest.findMany({
    where: {
      organizationId: parsed.organizationId,
      status: HrisTimeRequestStatus.REQUESTED,
      ...(scope.employeeIds === null
        ? {}
        : { employeeId: { in: scope.employeeIds } }),
    },
    select: {
      id: true,
      type: true,
      employeeId: true,
      periodStart: true,
      periodEnd: true,
      requestedMinutes: true,
      requestedAt: true,
      requestedById: true,
      employee: { select: { displayName: true } },
    },
    orderBy: { requestedAt: "asc" },
    take: parsed.limit,
  })
  return {
    requests: requests.map(({ requestedById, ...request }) => ({
      ...request,
      canDecide: requestedById !== parsed.actorId
        && hasAnyRbacPermission(parsed.actorPermissions, MANAGE),
    })),
    accessScope: scope.authority,
  }
}

export type OperationalTimeSelfService = Awaited<
  ReturnType<typeof getOwnOperationalTime>
>

export type OperationalTimeManagerInbox = Awaited<
  ReturnType<typeof getManagedOperationalTimeInbox>
>
