import "server-only"

import {
  AccountingSourceType,
  PayrollAttendanceSnapshotStatus,
  PayrollPeriodStatus,
  PayrollRunStatus,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import { resolveHrisPeopleAccessScope } from "@/services/hris/org.service"
import {
  hrisTimeLeaveAttendanceCertificationSchema,
  hrisTimeLeaveEvidenceSchema,
  hrisTimeLeavePolicyCertificationSchema,
  hrisTimeLeaveProofHashSchema,
  hrisTimeLeaveUnresolvedSchema,
  validateHrisTimeLeaveAttendanceCertification,
  type HrisTimeLeaveAttendanceCertification,
} from "@/services/hris/time-leave.contract"
import { freezeAttendanceSnapshot } from "@/services/payroll/payroll-control.service"

export type HrisTimeLeaveDbClient = typeof db | Prisma.TransactionClient

const CERTIFY_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const CORRECT_PERMISSIONS = ["hris.people.manage"] as const
const READ_PERMISSIONS = ["hris.people.read", "hris.people.manage"] as const
const SELF_SERVICE_READ_PERMISSIONS = [
  "hris.self_service.read",
  ...READ_PERMISSIONS,
] as const

const SEALED_RUN_STATUSES = [
  PayrollRunStatus.CALCULATED,
  PayrollRunStatus.REVIEWED,
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.EMITTED,
  PayrollRunStatus.POSTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.ARCHIVED,
] as const

const actorSchema = z.object({
  organizationId: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorPermissions: z.array(z.string().trim().min(1)).optional().default([]),
})

const totalsSchema = z.object({
  scheduledMinutes: z.number().int().positive(),
  workedMinutes: z.number().int().nonnegative(),
  overtimeMinutes: z.number().int().nonnegative().default(0),
  absenceMinutes: z.number().int().nonnegative().default(0),
  leaveMinutes: z.number().int().nonnegative().default(0),
})

const certificationSourceSchema = z.object({
  sourceSystem: z.string().trim().min(1).max(120),
  sourceRecordId: z.string().trim().min(1).max(160),
  sourceRevision: z.number().int().positive(),
  preparedById: z.string().trim().min(1),
  approvalEvidenceHash: hrisTimeLeaveProofHashSchema,
  policy: hrisTimeLeavePolicyCertificationSchema,
  evidence: hrisTimeLeaveEvidenceSchema,
  unresolved: hrisTimeLeaveUnresolvedSchema,
})

export const certifyHrisTimeLeaveAttendanceInputSchema = actorSchema
  .merge(totalsSchema)
  .merge(certificationSourceSchema)
  .extend({
    payrollPeriodId: z.string().trim().min(1),
    employeeId: z.string().trim().min(1),
    idempotencyKey: z.string().trim().min(1).optional(),
  })

export const correctCertifiedHrisTimeLeaveAttendanceInputSchema =
  certifyHrisTimeLeaveAttendanceInputSchema.extend({
    originalAttendanceSnapshotId: z.string().trim().min(1),
    correctionReason: z.string().trim().min(8).max(1000),
    correctionEvidenceHash: hrisTimeLeaveProofHashSchema,
  })

export const hrisTimeLeaveAttendanceReadInputSchema = actorSchema.extend({
  employeeId: z.string().trim().min(1).optional(),
  payrollPeriodId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const ownHrisTimeLeaveAttendanceReadInputSchema = actorSchema.extend({
  payrollPeriodId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(12),
})

export type CertifyHrisTimeLeaveAttendanceInput = z.input<
  typeof certifyHrisTimeLeaveAttendanceInputSchema
>
export type CorrectCertifiedHrisTimeLeaveAttendanceInput = z.input<
  typeof correctCertifiedHrisTimeLeaveAttendanceInputSchema
>
export type HrisTimeLeaveAttendanceReadInput = z.input<
  typeof hrisTimeLeaveAttendanceReadInputSchema
>
export type OwnHrisTimeLeaveAttendanceReadInput = z.input<
  typeof ownHrisTimeLeaveAttendanceReadInputSchema
>

export const HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP = {
  sourceOwner: "HRIS_TIME_LEAVE_ATTENDANCE",
  payrollConsumer: "CERTIFIED_FROZEN_SNAPSHOT_ONLY",
  accountingConsumer: "PAYROLL_POSTING_ONLY",
  mutableInputPolicy: "NEVER_CONSUMED_BY_PAYROLL",
  policyRuleOwner: "REVIEWED_COUNTRY_AND_COMPANY_POLICY_REGISTER",
} as const

function assertPermission(
  actorPermissions: readonly string[],
  required: readonly string[],
  action: string,
) {
  if (!hasAnyRbacPermission(actorPermissions, required)) {
    throw new ForbiddenError(`Missing permission for ${action}.`)
  }
}

function delegatedPermissions(
  actorPermissions: readonly string[],
  permission: string,
) {
  return Array.from(new Set([...actorPermissions, permission]))
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function safeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

function prefixedHash(value: unknown) {
  return `sha256:${hashBusinessPayload(value)}`
}

function hasRootTransaction(client: HrisTimeLeaveDbClient): client is typeof db {
  return typeof (client as { $transaction?: unknown }).$transaction === "function"
}

async function inTransaction<T>(
  client: HrisTimeLeaveDbClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  if (hasRootTransaction(client)) {
    return client.$transaction((tx) => operation(tx))
  }
  return operation(client as Prisma.TransactionClient)
}

function safeAccessScope(
  scope: Awaited<ReturnType<typeof resolveHrisPeopleAccessScope>>,
) {
  return {
    organizationId: scope.organizationId,
    authority: scope.authority,
    managedLocationCount: scope.managedLocations.length,
  }
}

function buildCertification(
  input: z.output<typeof certifyHrisTimeLeaveAttendanceInputSchema>,
): HrisTimeLeaveAttendanceCertification {
  return {
    kind: "STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION",
    version: 1,
    sourceSystem: input.sourceSystem,
    sourceRecordId: input.sourceRecordId,
    sourceRevision: input.sourceRevision,
    policy: input.policy,
    evidence: input.evidence,
    approval: {
      preparedById: input.preparedById,
      approvedById: input.actorId,
      approvalEvidenceHash: input.approvalEvidenceHash,
    },
    unresolved: input.unresolved,
    totals: {
      scheduledMinutes: input.scheduledMinutes,
      workedMinutes: input.workedMinutes,
      overtimeMinutes: input.overtimeMinutes,
      absenceMinutes: input.absenceMinutes,
      leaveMinutes: input.leaveMinutes,
    },
  }
}

async function resolveMutationScope(
  input: z.output<typeof certifyHrisTimeLeaveAttendanceInputSchema>,
  client: HrisTimeLeaveDbClient,
  requiredPermissions: readonly string[],
  action: string,
) {
  assertPermission(input.actorPermissions, requiredPermissions, action)
  const scope = await resolveHrisPeopleAccessScope({
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorPermissions: input.actorPermissions,
    employeeId: input.employeeId,
  }, client)
  if (scope.authority.kind === "OWN_RECORD") {
    throw new ForbiddenError(
      "Own-record authority cannot approve or correct payroll attendance.",
    )
  }
  return scope
}

async function loadOpenPayrollPeriod(
  client: HrisTimeLeaveDbClient,
  input: { organizationId: string; payrollPeriodId: string },
) {
  const period = await client.payrollPeriod.findFirst({
    where: {
      id: input.payrollPeriodId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      status: true,
      countryCode: true,
      periodStart: true,
      periodEnd: true,
    },
  })
  if (!period) throw new NotFoundError("Payroll period was not found.")
  if (
    period.status === PayrollPeriodStatus.CLOSED ||
    period.status === PayrollPeriodStatus.POSTED
  ) {
    throw new BusinessRuleError(
      "HRIS time certification cannot change a closed or posted payroll period.",
    )
  }
  return period
}

function validateCertificationForPeriod(
  certification: HrisTimeLeaveAttendanceCertification,
  period: { countryCode: string; periodStart: Date; periodEnd: Date },
) {
  return validateHrisTimeLeaveAttendanceCertification({
    sourcePayload: certification,
    approvedById: certification.approval.approvedById,
    countryCode: period.countryCode,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    totals: certification.totals,
  })
}

function snapshotReadModel(snapshot: {
  id: string
  status: PayrollAttendanceSnapshotStatus
  periodStart: Date
  periodEnd: Date
  scheduledMinutes: number
  workedMinutes: number
  overtimeMinutes: number
  absenceMinutes: number
  leaveMinutes: number
  sourceHash: string
  frozenAt: Date | null
  correctedFromId: string | null
  metadata: unknown
}) {
  const sourcePayload = metadataRecord(snapshot.metadata).sourcePayload
  const certification = hrisTimeLeaveAttendanceCertificationSchema.safeParse(
    sourcePayload,
  )
  return {
    id: snapshot.id,
    status: snapshot.status,
    periodStart: snapshot.periodStart.toISOString(),
    periodEnd: snapshot.periodEnd.toISOString(),
    totals: {
      scheduledMinutes: snapshot.scheduledMinutes,
      workedMinutes: snapshot.workedMinutes,
      overtimeMinutes: snapshot.overtimeMinutes,
      absenceMinutes: snapshot.absenceMinutes,
      leaveMinutes: snapshot.leaveMinutes,
    },
    sourceProofPresent: Boolean(snapshot.sourceHash),
    certificationStatus: certification.success
      ? "CERTIFIED"
      : "LEGACY_OR_UNCERTIFIED",
    policyProofPresent: certification.success,
    approvalProofPresent: certification.success,
    unresolvedItemCount: certification.success
      ? Object.values(certification.data.unresolved)
        .reduce((sum, count) => sum + count, 0)
      : null,
    frozenAt: snapshot.frozenAt?.toISOString() ?? null,
    correctedFromId: snapshot.correctedFromId,
  }
}

export async function certifyHrisTimeLeaveAttendance(
  input: CertifyHrisTimeLeaveAttendanceInput,
  client: HrisTimeLeaveDbClient = db,
) {
  const parsed = certifyHrisTimeLeaveAttendanceInputSchema.parse(input)
  const scope = await resolveMutationScope(
    parsed,
    client,
    CERTIFY_PERMISSIONS,
    "HRIS time and attendance certification",
  )
  const period = await loadOpenPayrollPeriod(client, parsed)
  const certification = validateCertificationForPeriod(
    buildCertification(parsed),
    period,
  )

  const result = await freezeAttendanceSnapshot({
    organizationId: parsed.organizationId,
    actorPermissions: delegatedPermissions(
      parsed.actorPermissions,
      "payroll.attendance.freeze",
    ),
    payrollPeriodId: parsed.payrollPeriodId,
    employeeId: parsed.employeeId,
    scheduledMinutes: parsed.scheduledMinutes,
    workedMinutes: parsed.workedMinutes,
    overtimeMinutes: parsed.overtimeMinutes,
    absenceMinutes: parsed.absenceMinutes,
    leaveMinutes: parsed.leaveMinutes,
    sourcePayload: certification,
    frozenById: parsed.actorId,
    idempotencyKey: parsed.idempotencyKey,
    metadata: {
      owner: HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP.sourceOwner,
      policy: HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP.mutableInputPolicy,
    },
  }, client)

  return {
    organizationId: parsed.organizationId,
    employeeId: parsed.employeeId,
    attendanceSnapshot: snapshotReadModel(result.attendanceSnapshot),
    created: result.created,
    businessEventId: result.businessEventId,
    accessScope: safeAccessScope(scope),
    dataOwnership: HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP,
  }
}

function minuteDiff(
  previous: {
    scheduledMinutes: number
    workedMinutes: number
    overtimeMinutes: number
    absenceMinutes: number
    leaveMinutes: number
  },
  next: HrisTimeLeaveAttendanceCertification["totals"],
) {
  return {
    scheduledMinutes: next.scheduledMinutes - previous.scheduledMinutes,
    workedMinutes: next.workedMinutes - previous.workedMinutes,
    overtimeMinutes: next.overtimeMinutes - previous.overtimeMinutes,
    absenceMinutes: next.absenceMinutes - previous.absenceMinutes,
    leaveMinutes: next.leaveMinutes - previous.leaveMinutes,
  }
}

export async function correctCertifiedHrisTimeLeaveAttendance(
  input: CorrectCertifiedHrisTimeLeaveAttendanceInput,
  client: HrisTimeLeaveDbClient = db,
) {
  const parsed = correctCertifiedHrisTimeLeaveAttendanceInputSchema.parse(input)
  const scope = await resolveMutationScope(
    parsed,
    client,
    CORRECT_PERMISSIONS,
    "HRIS time and attendance correction",
  )

  const result = await inTransaction(client, async (tx) => {
    const period = await loadOpenPayrollPeriod(tx, parsed)
    const certification = validateCertificationForPeriod(
      buildCertification(parsed),
      period,
    )
    const original = await tx.payrollAttendanceSnapshot.findFirst({
      where: {
        id: parsed.originalAttendanceSnapshotId,
        organizationId: parsed.organizationId,
        payrollPeriodId: parsed.payrollPeriodId,
        employeeId: parsed.employeeId,
        status: PayrollAttendanceSnapshotStatus.FROZEN,
      },
    })
    if (!original) {
      throw new NotFoundError(
        "Frozen attendance snapshot was not found for this tenant, period, and employee.",
      )
    }

    const originalCertification = hrisTimeLeaveAttendanceCertificationSchema
      .safeParse(metadataRecord(original.metadata).sourcePayload)
    if (
      originalCertification.success &&
      certification.sourceRevision <= originalCertification.data.sourceRevision
    ) {
      throw new BusinessRuleError(
        "HRIS_TIME_CORRECTION_REVISION_STALE: A correction must advance the source revision.",
      )
    }

    const correctionReasonHash = prefixedHash({
      correctionReason: parsed.correctionReason,
    })
    const sourceHash = prefixedHash({
      correctedFromId: original.id,
      certification,
      correctionReasonHash,
      correctionEvidenceHash: parsed.correctionEvidenceHash,
    })
    const existing = await tx.payrollAttendanceSnapshot.findFirst({
      where: {
        organizationId: parsed.organizationId,
        employeeId: parsed.employeeId,
        payrollPeriodId: parsed.payrollPeriodId,
        correctedFromId: original.id,
        status: PayrollAttendanceSnapshotStatus.FROZEN,
      },
    })
    if (existing) {
      if (existing.sourceHash !== sourceHash) {
        throw new ConflictError(
          "Attendance correction replay changed the certified source payload.",
        )
      }
      return {
        attendanceSnapshot: existing,
        created: false,
        businessEventId: null,
      }
    }

    const sealedRun = await tx.payrollRun.findFirst({
      where: {
        organizationId: parsed.organizationId,
        payrollPeriodId: parsed.payrollPeriodId,
        deletedAt: null,
        status: { in: [...SEALED_RUN_STATUSES] },
      },
      select: { id: true, runNumber: true, status: true },
    })
    if (sealedRun) {
      throw new BusinessRuleError(
        `HRIS_TIME_CORRECTION_REQUIRES_PAYROLL_CORRECTION_RUN: Payroll run ${sealedRun.runNumber} is already ${sealedRun.status}.`,
      )
    }

    const diff = minuteDiff(original, certification.totals)
    const now = new Date()
    await tx.payrollAttendanceSnapshot.update({
      where: { id: original.id },
      data: { status: PayrollAttendanceSnapshotStatus.SUPERSEDED },
    })
    const attendanceSnapshot = await tx.payrollAttendanceSnapshot.create({
      data: {
        organizationId: parsed.organizationId,
        payrollPeriodId: parsed.payrollPeriodId,
        employeeId: parsed.employeeId,
        status: PayrollAttendanceSnapshotStatus.FROZEN,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        ...certification.totals,
        sourceHash,
        frozenById: parsed.actorId,
        frozenAt: now,
        correctedFromId: original.id,
        metadata: safeJson({
          gate: "stoquify-hris-10-time-leave-attendance-engine",
          sourcePayload: certification,
          correction: {
            correctionReasonHash,
            correctionEvidenceHash: parsed.correctionEvidenceHash,
            diff,
          },
        }),
      },
    })

    const eventResult = await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "attendance.period.corrected",
      eventSource: "INTERNAL",
      schemaVersion: 1,
      idempotencyKey: parsed.idempotencyKey ??
        `hris-attendance-correction:${parsed.organizationId}:${attendanceSnapshot.id}`,
      payload: {
        payrollPeriodId: parsed.payrollPeriodId,
        employeeId: parsed.employeeId,
        originalAttendanceSnapshotId: original.id,
        attendanceSnapshotId: attendanceSnapshot.id,
        sourceHash,
        diff,
      },
      occurredAt: now,
      actorId: parsed.actorId,
      sourceType: AccountingSourceType.PAYROLL_RUN,
      sourceId: attendanceSnapshot.id,
      documentHash: parsed.correctionEvidenceHash,
      metadata: {
        gate: "stoquify-hris-10-time-leave-attendance-engine",
        correctionReasonHash,
      },
      outboxMessages: [{
        channel: "NOTIFICATION",
        eventName: "attendance_snapshot.corrected",
        destination: "payroll",
        payload: {
          severity: "high",
          payrollPeriodId: parsed.payrollPeriodId,
          attendanceSnapshotId: attendanceSnapshot.id,
          originalAttendanceSnapshotId: original.id,
        },
      }],
    })
    await markBusinessEventAppliedInTx(
      tx,
      parsed.organizationId,
      eventResult.event.id,
    )
    await tx.auditLog.create({
      data: {
        entityType: "PayrollAttendanceSnapshot",
        entityId: attendanceSnapshot.id,
        action: "HRIS_ATTENDANCE_SNAPSHOT_CORRECTED",
        userId: parsed.actorId,
        organizationId: parsed.organizationId,
        changes: safeJson({
          originalAttendanceSnapshotId: original.id,
          originalStatus: original.status,
          newStatus: attendanceSnapshot.status,
          correctionEvidencePresent: true,
          correctionReasonHash,
          diff,
          businessEventId: eventResult.event.id,
        }),
      },
    })

    return {
      attendanceSnapshot,
      created: true,
      businessEventId: eventResult.event.id,
    }
  })

  return {
    organizationId: parsed.organizationId,
    employeeId: parsed.employeeId,
    attendanceSnapshot: snapshotReadModel(result.attendanceSnapshot),
    created: result.created,
    businessEventId: result.businessEventId,
    accessScope: safeAccessScope(scope),
    dataOwnership: HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP,
  }
}

export async function getHrisTimeLeaveAttendanceStatus(
  input: HrisTimeLeaveAttendanceReadInput,
  client: HrisTimeLeaveDbClient = db,
) {
  const parsed = hrisTimeLeaveAttendanceReadInputSchema.parse(input)
  assertPermission(
    parsed.actorPermissions,
    READ_PERMISSIONS,
    "HRIS time and attendance read",
  )
  const scope = await resolveHrisPeopleAccessScope(parsed, client)
  const employeeFilter = parsed.employeeId
    ? parsed.employeeId
    : scope.employeeIds === null
      ? undefined
      : { in: scope.employeeIds }
  const snapshots = await client.payrollAttendanceSnapshot.findMany({
    where: {
      organizationId: parsed.organizationId,
      ...(employeeFilter === undefined ? {} : { employeeId: employeeFilter }),
      ...(parsed.payrollPeriodId
        ? { payrollPeriodId: parsed.payrollPeriodId }
        : {}),
    },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
    take: parsed.limit,
  })

  return {
    organizationId: parsed.organizationId,
    snapshots: snapshots.map(snapshotReadModel),
    accessScope: safeAccessScope(scope),
    dataOwnership: HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP,
  }
}

export async function getOwnHrisTimeLeaveAttendanceStatus(
  input: OwnHrisTimeLeaveAttendanceReadInput,
  client: HrisTimeLeaveDbClient = db,
) {
  const parsed = ownHrisTimeLeaveAttendanceReadInputSchema.parse(input)
  assertPermission(
    parsed.actorPermissions,
    SELF_SERVICE_READ_PERMISSIONS,
    "own HRIS time and attendance read",
  )
  const employee = await client.payrollEmployee.findFirst({
    where: {
      organizationId: parsed.organizationId,
      userId: parsed.actorId,
      deletedAt: null,
    },
    select: { id: true },
  })
  if (!employee) {
    throw new NotFoundError("No HRIS employee profile is linked to the authenticated user.")
  }

  const snapshots = await client.payrollAttendanceSnapshot.findMany({
    where: {
      organizationId: parsed.organizationId,
      employeeId: employee.id,
      ...(parsed.payrollPeriodId
        ? { payrollPeriodId: parsed.payrollPeriodId }
        : {}),
    },
    orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
    take: parsed.limit,
  })

  await client.auditLog.create({
    data: {
      entityType: "HrisTimeLeaveAttendanceSelfService",
      entityId: employee.id,
      action: "HRIS_TIME_LEAVE_ATTENDANCE_SELF_SERVICE_READ",
      userId: parsed.actorId,
      organizationId: parsed.organizationId,
      changes: safeJson({ snapshotCount: snapshots.length }),
    },
  })

  return {
    organizationId: parsed.organizationId,
    snapshots: snapshots.map(snapshotReadModel),
    accessScope: {
      organizationId: parsed.organizationId,
      authority: {
        kind: "OWN_RECORD",
        label: "Own employee record",
        basis: "PayrollEmployee.userId",
        reportingLineAuthority: false,
        effectiveDating: "CURRENT_ONLY",
        historicalAccessSupported: false,
        delegationSupported: false,
      },
      managedLocationCount: 0,
    } as const,
    dataOwnership: HRIS_TIME_LEAVE_ATTENDANCE_OWNERSHIP,
  }
}
