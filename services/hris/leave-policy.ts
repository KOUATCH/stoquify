import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
})
/** Employer-authored facts, never a statutory default. The existing independent
 * time-foundation approval owns this JSON and its effective policy version. */
export const leaveRulesSchema = z.object({
  schemaVersion: z.literal(1),
  employeeIds: z.array(z.string().min(1)).min(1).max(200),
  negativeBalance: z.literal("FORBID"),
  rounding: z.literal("EXACT_MINUTES"),
  credits: z.array(z.object({
    date, minutes: z.number().int().positive().max(527040),
    kind: z.enum(["OPENING_BALANCE", "ACCRUAL"]),
  }).strict()).max(366),
  expiry: z.enum(["NONE", "AT_POLICY_END"]),
  carryover: z.object({ fromPolicyId: z.string().min(1), limitMinutes: z.number().int().nonnegative().max(527040) }).strict().nullable(),
}).strict()
export type LeaveRules = z.infer<typeof leaveRulesSchema>
export type LeavePolicyFacts = {
  id: string; status: string; effectiveFrom: Date; effectiveTo: Date | null;
  approvedById: string | null; approvalEvidenceHash: string | null;
  accrualRule: unknown; annualEntitlementMinutes: number; carryOverLimitMinutes: number;
}
export const workDate = (value: Date) => value.toISOString().slice(0, 10)
export function readLeaveRules(policy: LeavePolicyFacts): LeaveRules {
  const result = leaveRulesSchema.safeParse(policy.accrualRule)
  const fail = () => { throw new BusinessRuleError("HRIS_LEAVE_RULES_UNRESOLVED: HR must approve explicit employee eligibility, credits, carryover, expiry, negative-balance and rounding rules for this policy version.") }
  if (!result.success) return fail()
  const rules = result.data
  if (policy.effectiveFrom.toISOString() !== `${workDate(policy.effectiveFrom)}T00:00:00.000Z`
      || (policy.effectiveTo && policy.effectiveTo.toISOString() !== `${workDate(policy.effectiveTo)}T00:00:00.000Z`)
      || new Set(rules.employeeIds).size !== rules.employeeIds.length
      || new Set(rules.credits.map(c => `${c.date}:${c.kind}`)).size !== rules.credits.length
      || rules.credits.some(c => c.date < workDate(policy.effectiveFrom) || (policy.effectiveTo && c.date > workDate(policy.effectiveTo)))
      || rules.credits.reduce((sum, c) => sum + c.minutes, 0) > policy.annualEntitlementMinutes
      || (rules.expiry === "AT_POLICY_END" && !policy.effectiveTo)
      || (rules.carryover && (rules.carryover.fromPolicyId === policy.id || rules.carryover.limitMinutes !== policy.carryOverLimitMinutes))) return fail()
  return rules
}
export function assertLeaveEligibility(policy: LeavePolicyFacts | null, employeeId: string, start: Date, end = start) {
  if (!policy || policy.status !== "ACTIVE" || !policy.approvedById || !policy.approvalEvidenceHash
      || workDate(start) < workDate(policy.effectiveFrom) || end < start
      || (policy.effectiveTo && workDate(end) > workDate(policy.effectiveTo))) {
    throw new BusinessRuleError("HRIS_LEAVE_POLICY_NOT_EFFECTIVE: Select a reviewed policy covering the whole request; split requests at policy-version changes.")
  }
  const rules = readLeaveRules(policy)
  if (!rules.employeeIds.includes(employeeId)) throw new BusinessRuleError("HRIS_LEAVE_EMPLOYEE_NOT_ELIGIBLE: HR must explicitly enroll this employee in the reviewed policy version.")
  return rules
}

/** Exact conversion using reviewed local work-date schedule quantities. */
export function leaveQuantityMinutes(quantity: number, unit: "MINUTES" | "HOURS" | "DAYS", scheduledMinutes: number) {
  const minutes = quantity * (unit === "DAYS" ? scheduledMinutes : unit === "HOURS" ? 60 : 1)
  if (!Number.isFinite(minutes) || !Number.isInteger(minutes) || minutes <= 0 || minutes > scheduledMinutes) {
    throw new BusinessRuleError("HRIS_LEAVE_QUANTITY_UNRESOLVED: Use a positive quantity that converts exactly to whole minutes within the reviewed work-date schedule.")
  }
  return minutes
}
