"use server"

import { revalidatePath } from "next/cache"

import { protect } from "@/services/_shared/protect"
import {
  certifyHrisTimeLeaveAttendance,
  correctCertifiedHrisTimeLeaveAttendance,
  getHrisTimeLeaveAttendanceStatus,
  type CertifyHrisTimeLeaveAttendanceInput,
  type CorrectCertifiedHrisTimeLeaveAttendanceInput,
  type HrisTimeLeaveAttendanceReadInput,
} from "@/services/hris/time-leave.service"

export type {
  CertifyHrisTimeLeaveAttendanceInput,
  CorrectCertifiedHrisTimeLeaveAttendanceInput,
  HrisTimeLeaveAttendanceReadInput,
}

function asRecord(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown>
    : {}
}

function certificationFields(input: unknown) {
  const record = asRecord(input)
  return {
    payrollPeriodId: record.payrollPeriodId,
    employeeId: record.employeeId,
    scheduledMinutes: record.scheduledMinutes,
    workedMinutes: record.workedMinutes,
    overtimeMinutes: record.overtimeMinutes,
    absenceMinutes: record.absenceMinutes,
    leaveMinutes: record.leaveMinutes,
    sourceSystem: record.sourceSystem,
    sourceRecordId: record.sourceRecordId,
    sourceRevision: record.sourceRevision,
    preparedById: record.preparedById,
    approvalEvidenceHash: record.approvalEvidenceHash,
    policy: record.policy,
    evidence: record.evidence,
    unresolved: record.unresolved,
    idempotencyKey: record.idempotencyKey,
  }
}

function correctionFields(input: unknown) {
  const record = asRecord(input)
  return {
    ...certificationFields(input),
    originalAttendanceSnapshotId: record.originalAttendanceSnapshotId,
    correctionReason: record.correctionReason,
    correctionEvidenceHash: record.correctionEvidenceHash,
  }
}

function revalidateTimeLeavePaths() {
  revalidatePath("/dashboard/people", "page")
  revalidatePath("/[locale]/dashboard/people", "page")
  revalidatePath("/dashboard/payroll/attendance", "page")
  revalidatePath("/[locale]/dashboard/payroll/attendance", "page")
  revalidatePath("/dashboard/payroll/command-center", "page")
  revalidatePath("/[locale]/dashboard/payroll/command-center", "page")
}

const readTimeLeaveAttendance = protect<
  unknown,
  Awaited<ReturnType<typeof getHrisTimeLeaveAttendanceStatus>>
>(
  {
    permission: "hris.people.read",
    auditResource: "HrisTimeLeaveAttendance",
    auditAllowed: false,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => getHrisTimeLeaveAttendanceStatus({
    ...asRecord(input),
    organizationId: ctx.orgId,
    actorId: ctx.userId,
    actorPermissions: ctx.permissions,
  } as HrisTimeLeaveAttendanceReadInput),
)

export async function getHrisTimeLeaveAttendanceStatusAction(input: unknown) {
  return readTimeLeaveAttendance(input)
}

const certifyTimeLeaveAttendance = protect<
  unknown,
  Awaited<ReturnType<typeof certifyHrisTimeLeaveAttendance>>
>(
  {
    permission: "hris.people.read",
    auditResource: "HrisTimeLeaveAttendance",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const result = await certifyHrisTimeLeaveAttendance({
      ...certificationFields(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as CertifyHrisTimeLeaveAttendanceInput)
    revalidateTimeLeavePaths()
    return result
  },
)

const correctTimeLeaveAttendance = protect<
  unknown,
  Awaited<ReturnType<typeof correctCertifiedHrisTimeLeaveAttendance>>
>(
  {
    permission: "hris.people.manage",
    auditResource: "HrisTimeLeaveAttendance",
    freshAuth: true,
    tenantGuard: "handler-derived",
  },
  async (input, ctx) => {
    const result = await correctCertifiedHrisTimeLeaveAttendance({
      ...correctionFields(input),
      organizationId: ctx.orgId,
      actorId: ctx.userId,
      actorPermissions: ctx.permissions,
    } as CorrectCertifiedHrisTimeLeaveAttendanceInput)
    revalidateTimeLeavePaths()
    return result
  },
)

export async function certifyHrisTimeLeaveAttendanceAction(input: unknown) {
  return certifyTimeLeaveAttendance(input)
}

export async function correctCertifiedHrisTimeLeaveAttendanceAction(
  input: unknown,
) {
  return correctTimeLeaveAttendance(input)
}
