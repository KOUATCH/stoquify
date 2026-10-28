import { z } from "zod"

import { BusinessRuleError } from "@/services/_shared/action-errors"

export const hrisTimeLeaveProofHashSchema = z.string().trim().min(8).max(256)

export const hrisTimeLeavePolicyCertificationSchema = z.object({
  countryCode: z.string().trim().min(2).max(32),
  policyVersion: z.string().trim().min(1).max(120),
  countryPolicyHash: hrisTimeLeaveProofHashSchema,
  companyPolicyHash: hrisTimeLeaveProofHashSchema,
  leavePolicyHash: hrisTimeLeaveProofHashSchema,
  overtimePolicyHash: hrisTimeLeaveProofHashSchema,
  scheduleHash: hrisTimeLeaveProofHashSchema,
  holidayCalendarHash: hrisTimeLeaveProofHashSchema,
  effectiveFrom: z.string().datetime({ offset: true }),
  effectiveTo: z.string().datetime({ offset: true }).nullable(),
  verificationStatus: z.literal("REVIEWED"),
  reviewedById: z.string().trim().min(1),
  reviewEvidenceHash: hrisTimeLeaveProofHashSchema,
}).strict()

export const hrisTimeLeaveEvidenceSchema = z.object({
  attendanceImportHash: hrisTimeLeaveProofHashSchema,
  leaveBalanceSnapshotHash: hrisTimeLeaveProofHashSchema,
  approvedLeaveRequestHashes: z.array(hrisTimeLeaveProofHashSchema).max(500).default([]),
  approvedOvertimeRequestHashes: z.array(hrisTimeLeaveProofHashSchema).max(500).default([]),
}).strict()

export const hrisTimeLeaveUnresolvedSchema = z.object({
  timeEntryCount: z.number().int().nonnegative().default(0),
  leaveRequestCount: z.number().int().nonnegative().default(0),
  overtimeRequestCount: z.number().int().nonnegative().default(0),
  correctionCount: z.number().int().nonnegative().default(0),
}).strict()

export const hrisTimeLeaveTotalsSchema = z.object({
  scheduledMinutes: z.number().int().positive(),
  workedMinutes: z.number().int().nonnegative(),
  overtimeMinutes: z.number().int().nonnegative(),
  absenceMinutes: z.number().int().nonnegative(),
  leaveMinutes: z.number().int().nonnegative(),
}).strict()

export const hrisTimeLeaveAttendanceCertificationSchema = z.object({
  kind: z.literal("STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_CERTIFICATION"),
  version: z.literal(1),
  sourceSystem: z.string().trim().min(1).max(120),
  sourceRecordId: z.string().trim().min(1).max(160),
  sourceRevision: z.number().int().positive(),
  policy: hrisTimeLeavePolicyCertificationSchema,
  evidence: hrisTimeLeaveEvidenceSchema,
  approval: z.object({
    preparedById: z.string().trim().min(1),
    approvedById: z.string().trim().min(1),
    approvalEvidenceHash: hrisTimeLeaveProofHashSchema,
  }).strict(),
  unresolved: hrisTimeLeaveUnresolvedSchema,
  totals: hrisTimeLeaveTotalsSchema,
}).strict()

export type HrisTimeLeaveAttendanceCertification = z.output<
  typeof hrisTimeLeaveAttendanceCertificationSchema
>

type CertificationValidationInput = {
  sourcePayload: unknown
  approvedById: string
  countryCode: string
  periodStart: Date
  periodEnd: Date
  totals: z.output<typeof hrisTimeLeaveTotalsSchema>
}

function parseDate(value: string, label: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new BusinessRuleError(`HRIS time certification has an invalid ${label}.`)
  }
  return date
}

export function validateHrisTimeLeaveAttendanceCertification(
  input: CertificationValidationInput,
): HrisTimeLeaveAttendanceCertification {
  const result = hrisTimeLeaveAttendanceCertificationSchema.safeParse(
    input.sourcePayload,
  )
  if (!result.success) {
    throw new BusinessRuleError(
      "HRIS_TIME_CERTIFICATION_INVALID: Payroll attendance requires a complete HRIS certification manifest.",
    )
  }
  const certification = result.data

  if (certification.policy.countryCode !== input.countryCode) {
    throw new BusinessRuleError(
      "HRIS_TIME_POLICY_COUNTRY_MISMATCH: Reviewed policy proof must match the payroll period country.",
    )
  }
  if (certification.approval.preparedById === certification.approval.approvedById) {
    throw new BusinessRuleError(
      "HRIS_TIME_APPROVAL_SEPARATION_REQUIRED: The preparer cannot approve the certified time period.",
    )
  }
  if (certification.approval.approvedById !== input.approvedById) {
    throw new BusinessRuleError(
      "HRIS_TIME_APPROVER_MISMATCH: The certified approver must match the authenticated freezer.",
    )
  }

  const unresolvedCount = Object.values(certification.unresolved)
    .reduce((sum, count) => sum + count, 0)
  if (unresolvedCount > 0) {
    throw new BusinessRuleError(
      "HRIS_TIME_INPUT_UNAPPROVED: Unapproved time, leave, overtime, or correction items block payroll certification.",
    )
  }

  const expectedTotals = input.totals
  for (const key of Object.keys(expectedTotals) as Array<keyof typeof expectedTotals>) {
    if (certification.totals[key] !== expectedTotals[key]) {
      throw new BusinessRuleError(
        "HRIS_TIME_TOTAL_MISMATCH: Certified totals do not match the payroll freeze request.",
      )
    }
  }
  if (
    certification.totals.workedMinutes +
      certification.totals.absenceMinutes +
      certification.totals.leaveMinutes !==
    certification.totals.scheduledMinutes
  ) {
    throw new BusinessRuleError(
      "HRIS_TIME_TOTALS_UNBALANCED: Worked, absence, and leave minutes must reconcile to scheduled minutes.",
    )
  }
  if (
    certification.totals.leaveMinutes > 0 &&
    certification.evidence.approvedLeaveRequestHashes.length === 0
  ) {
    throw new BusinessRuleError(
      "HRIS_LEAVE_APPROVAL_EVIDENCE_MISSING: Leave minutes require approved leave-request evidence.",
    )
  }
  if (
    certification.totals.overtimeMinutes > 0 &&
    certification.evidence.approvedOvertimeRequestHashes.length === 0
  ) {
    throw new BusinessRuleError(
      "HRIS_OVERTIME_APPROVAL_EVIDENCE_MISSING: Overtime minutes require approved overtime evidence.",
    )
  }

  const policyStart = parseDate(
    certification.policy.effectiveFrom,
    "policy effective-from date",
  )
  const policyEnd = certification.policy.effectiveTo
    ? parseDate(certification.policy.effectiveTo, "policy effective-to date")
    : null
  if (policyStart > input.periodStart || (policyEnd && policyEnd < input.periodEnd)) {
    throw new BusinessRuleError(
      "HRIS_TIME_POLICY_NOT_EFFECTIVE: Reviewed leave and overtime policy proof must cover the full payroll period.",
    )
  }

  return {
    ...certification,
    evidence: {
      ...certification.evidence,
      approvedLeaveRequestHashes: Array.from(new Set(
        certification.evidence.approvedLeaveRequestHashes,
      )).sort(),
      approvedOvertimeRequestHashes: Array.from(new Set(
        certification.evidence.approvedOvertimeRequestHashes,
      )).sort(),
    },
  }
}
