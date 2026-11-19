import "server-only"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { db } from "@/prisma/db"
import { hashBusinessPayload } from "@/services/events/business-event.service"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { resolveHrisPeopleAccessScope } from "./org.service"
import { assertSetupReviewInTx } from "./setup-reviewer.service"
import { attendanceMetadata, lockOperationalEmployeeInTx } from "./attendance-correction"
import { assertDatedShiftPlansDoNotOverlap, buildDatedShiftPlan, datedShiftInputSchema, datedShiftWeeklyPattern, type DatedShiftPlan } from "./shift-plan"

type Client = typeof db | Prisma.TransactionClient
type Tx = Prisma.TransactionClient
const actor = z.object({ organizationId: z.string().min(1), actorId: z.string().min(1), actorPermissions: z.array(z.string()).default([]), employeeId: z.string().min(1) })
const proof = z.string().trim().min(8).max(256)
export const prepareScheduleSchema = actor.extend({
  calendarId: z.string().min(1), name: z.string().trim().min(1).max(160), timezone: z.string().min(1).max(80),
  weeklyPattern: z.record(z.string(), z.number().int().nonnegative().max(1440)),
  standardWeeklyMinutes: z.number().int().nonnegative().max(10080), effectiveFrom: z.coerce.date(), effectiveTo: z.coerce.date().nullable().optional(),
  sourceHash: proof, shiftPlan: datedShiftInputSchema.optional(), supersedesScheduleId: z.string().min(1).optional(), expectedSourceHash: proof.optional(),
})
export const approveScheduleSchema = actor.extend({ scheduleId: z.string().min(1), approvalEvidenceHash: proof })
const transaction = <T>(client: Client, run: (tx: Tx) => Promise<T>): Promise<T> => "$transaction" in client ? client.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }) : run(client)
const midnight = (date: Date) => date.toISOString().endsWith("T00:00:00.000Z")
const sameDate = (a: Date | null, b: Date | null) => a?.getTime() === b?.getTime()
async function scope(client: Tx, input: z.infer<typeof actor>) { await resolveHrisPeopleAccessScope({ ...input, limit: 1, asOf: new Date(), delegationAuthority: "APPROVAL_DECISION" }, client) }
async function assertLegacyBounds(tx: Tx, input: z.infer<typeof actor>) {
  const rows = await tx.hrisWorkSchedule.findMany({ where: { organizationId: input.organizationId, employeeId: input.employeeId, status: "ACTIVE" }, select: { effectiveFrom: true, effectiveTo: true } })
  if (rows.some(row => !midnight(row.effectiveFrom) || (row.effectiveTo && !midnight(row.effectiveTo)))) throw new BusinessRuleError("HRIS_SCHEDULE_LEGACY_BOUNDS_UNRESOLVED: Review retained nonmidnight schedule bounds before publishing new work-date versions.")
}
async function assertHolidayPlan(tx: Tx, organizationId: string, calendarId: string, plan: DatedShiftPlan | null) {
  if (plan && plan.scheduledMinutes > 0 && await tx.hrisPublicHoliday.count({ where: { organizationId, calendarId, holidayDate: new Date(plan.workDate + "T00:00:00Z") } })) throw new BusinessRuleError("HRIS_SHIFT_HOLIDAY_POLICY_UNRESOLVED: The reviewed calendar excludes this date. Resolve holiday-work policy before publishing a working shift.")
}
function validate(schedule: {effectiveFrom: Date; effectiveTo?: Date | null; timezone: string; weeklyPattern: Record<string, number>; standardWeeklyMinutes: number}, calendar: {effectiveFrom: Date; effectiveTo: Date | null; timezone: string}) {
  if (!midnight(schedule.effectiveFrom) || (schedule.effectiveTo && !midnight(schedule.effectiveTo))) throw new BusinessRuleError("HRIS_SCHEDULE_WORK_DATE_REQUIRED: Store local work-date bounds at UTC midnight.")
  if (schedule.effectiveTo && schedule.effectiveTo < schedule.effectiveFrom) throw new BusinessRuleError("HRIS_SCHEDULE_INTERVAL_INVALID")
  if (schedule.effectiveFrom < calendar.effectiveFrom || (calendar.effectiveTo && (!schedule.effectiveTo || schedule.effectiveTo > calendar.effectiveTo))) throw new BusinessRuleError("HRIS_SCHEDULE_CALENDAR_COVERAGE_REQUIRED")
  if (schedule.timezone !== calendar.timezone) throw new BusinessRuleError("HRIS_SCHEDULE_TIMEZONE_MISMATCH")
  const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], minutes = names.map((name, index) => schedule.weeklyPattern[name] ?? schedule.weeklyPattern[String(index)])
  if (Object.keys(schedule.weeklyPattern).some(key => !/^[0-6]$/.test(key) && !names.includes(key))
      || names.some((name, index) => schedule.weeklyPattern[name] !== undefined && schedule.weeklyPattern[String(index)] !== undefined && schedule.weeklyPattern[name] !== schedule.weeklyPattern[String(index)])
      || minutes.some(value => !Number.isInteger(value) || value < 0 || value > 1440)
      || minutes.reduce((sum, value) => sum + value, 0) !== schedule.standardWeeklyMinutes) throw new BusinessRuleError("HRIS_SCHEDULE_WEEKLY_TOTAL_INVALID")
}
function storedShiftPlan(value: unknown): DatedShiftPlan | null {
  if (value === null || value === undefined) return null
  const data = attendanceMetadata(value)
  const raw = datedShiftInputSchema.safeParse({ workDate: data.workDate, timezone: data.timezone, shifts: Array.isArray(data.shifts) ? data.shifts.map(item => {
    const shift = attendanceMetadata(item)
    return { start: shift.start, end: shift.end, unpaidBreaks: Array.isArray(shift.unpaidBreaks) ? shift.unpaidBreaks.map(item => { const b = attendanceMetadata(item); return { start: b.start, end: b.end } }) : undefined }
  }) : undefined })
  if (!raw.success) throw new BusinessRuleError("HRIS_SHIFT_PLAN_EVIDENCE_UNRESOLVED")
  const rebuilt = buildDatedShiftPlan(raw.data)
  if (hashBusinessPayload(rebuilt) !== hashBusinessPayload(value)) throw new BusinessRuleError("HRIS_SHIFT_PLAN_EVIDENCE_UNRESOLVED")
  return rebuilt
}
async function audit(tx: Tx, input: z.infer<typeof actor>, id: string, action: string, changes: Prisma.InputJsonObject) {
  await tx.auditLog.create({ data: { organizationId: input.organizationId, userId: input.actorId, entityType: "HrisWorkSchedule", entityId: id, action, changes } })
}

export async function prepareHrisWorkSchedule(input: z.input<typeof prepareScheduleSchema>, client: Client = db) {
  const parsed = prepareScheduleSchema.parse(input)
  if (!hasAnyRbacPermission(parsed.actorPermissions, ["hris.people.manage"])) throw new ForbiddenError("Missing permission for work schedule preparation.")
  const plan = parsed.shiftPlan ? buildDatedShiftPlan(parsed.shiftPlan) : null
  const weeklyPattern = plan ? datedShiftWeeklyPattern(plan) : parsed.weeklyPattern, standardWeeklyMinutes = plan ? plan.scheduledMinutes : parsed.standardWeeklyMinutes
  if (plan && (plan.timezone !== parsed.timezone || plan.workDate !== parsed.effectiveFrom.toISOString().slice(0, 10) || !sameDate(parsed.effectiveFrom, parsed.effectiveTo ?? null))) throw new BusinessRuleError("HRIS_DATED_SHIFT_INTERVAL_REQUIRED: A dated plan covers exactly its local start date.")
  if (!plan && standardWeeklyMinutes === 0) throw new BusinessRuleError("HRIS_SCHEDULE_WEEKLY_TOTAL_INVALID: Use an explicit dated off-day for zero work.")
  const sourceHash = hashBusinessPayload({ employeeId: parsed.employeeId, calendarId: parsed.calendarId, name: parsed.name, timezone: parsed.timezone, weeklyPattern, standardWeeklyMinutes,
    effectiveFrom: parsed.effectiveFrom.toISOString(), effectiveTo: parsed.effectiveTo?.toISOString() ?? null, sourceEvidenceHash: parsed.sourceHash, shiftPlan: plan,
    supersedesScheduleId: parsed.supersedesScheduleId ?? null, expectedSourceHash: parsed.expectedSourceHash ?? null })
  return transaction(client, async tx => {
    await scope(tx, parsed); await lockOperationalEmployeeInTx(tx, parsed.organizationId, parsed.employeeId)
    const existing = await tx.hrisWorkSchedule.findFirst({ where: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, effectiveFrom: parsed.effectiveFrom, sourceHash } })
    if (existing) return existing
    await assertLegacyBounds(tx, parsed)
    const calendar = await tx.hrisWorkCalendar.findFirst({ where: { id: parsed.calendarId, organizationId: parsed.organizationId, status: "ACTIVE" } })
    if (!calendar) throw new NotFoundError("Active work calendar was not found.")
    validate({ ...parsed, weeklyPattern, standardWeeklyMinutes }, calendar)
    await assertHolidayPlan(tx, parsed.organizationId, parsed.calendarId, plan)
    const active = await tx.hrisWorkSchedule.findFirst({ where: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, effectiveFrom: parsed.effectiveFrom, status: "ACTIVE" } })
    if (parsed.supersedesScheduleId) {
      if (!active || active.id !== parsed.supersedesScheduleId || active.sourceHash !== parsed.expectedSourceHash || !sameDate(active.effectiveTo, parsed.effectiveTo ?? null)) throw new ConflictError("HRIS_SCHEDULE_PREDECESSOR_STALE: Same-interval corrections require the current published predecessor and source hash.")
    } else if (active) throw new ConflictError("HRIS_SCHEDULE_PREDECESSOR_REQUIRED: Review the published version before preparing a correction.")
    const latest = await tx.hrisWorkSchedule.aggregate({ where: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, effectiveFrom: parsed.effectiveFrom }, _max: { revision: true } })
    const created = await tx.hrisWorkSchedule.create({ data: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, calendarId: parsed.calendarId,
      name: parsed.name, timezone: parsed.timezone, weeklyPattern: weeklyPattern as Prisma.InputJsonValue, standardWeeklyMinutes, effectiveFrom: parsed.effectiveFrom, effectiveTo: parsed.effectiveTo ?? null,
      revision: (latest._max.revision ?? 0) + 1, supersedesScheduleId: parsed.supersedesScheduleId ?? null, shiftPlan: plan ? plan as unknown as Prisma.InputJsonValue : Prisma.DbNull, preparedById: parsed.actorId, sourceHash } })
    await audit(tx, parsed, created.id, "HRIS_SCHEDULE_REVISION_PREPARED", { revision: created.revision, supersedesScheduleId: created.supersedesScheduleId, sourceEvidenceHash: parsed.sourceHash, sourceHash })
    return created
  })
}

export async function approveHrisWorkSchedule(input: z.input<typeof approveScheduleSchema>, client: Client = db) {
  const parsed = approveScheduleSchema.parse(input)
  return transaction(client, async tx => {
    const manage = hasAnyRbacPermission(parsed.actorPermissions, ["hris.people.manage"])
    if (manage) await scope(tx, parsed)
    await lockOperationalEmployeeInTx(tx, parsed.organizationId, parsed.employeeId)
    if (!manage) await assertSetupReviewInTx(tx, parsed, "WORK_SCHEDULE", parsed.employeeId)
    const schedule = await tx.hrisWorkSchedule.findFirst({ where: { id: parsed.scheduleId, employeeId: parsed.employeeId, organizationId: parsed.organizationId } })
    if (!schedule) throw new NotFoundError("Work schedule was not found.")
    if (schedule.status !== "DRAFT") {
      if (schedule.approvedById === parsed.actorId && schedule.approvalEvidenceHash === parsed.approvalEvidenceHash) return schedule
      throw new ConflictError("HRIS_SCHEDULE_APPROVAL_REPLAY_CONFLICT: Retained approval belongs to different reviewer evidence.")
    }
    if (schedule.preparedById === parsed.actorId) throw new BusinessRuleError("SOD_VIOLATION: A schedule preparer cannot approve the same schedule.")
    await assertLegacyBounds(tx, parsed)
    const calendar = await tx.hrisWorkCalendar.findFirst({ where: { id: schedule.calendarId, organizationId: parsed.organizationId, status: "ACTIVE" } })
    if (!calendar) throw new NotFoundError("Active work calendar was not found.")
    validate({ ...schedule, weeklyPattern: schedule.weeklyPattern as Record<string, number> }, calendar)
    const plan = storedShiftPlan(schedule.shiftPlan)
    await assertHolidayPlan(tx, parsed.organizationId, schedule.calendarId, plan)
    if (plan && (plan.workDate !== schedule.effectiveFrom.toISOString().slice(0, 10) || !sameDate(schedule.effectiveFrom, schedule.effectiveTo) || plan.timezone !== schedule.timezone || plan.scheduledMinutes !== schedule.standardWeeklyMinutes || hashBusinessPayload(datedShiftWeeklyPattern(plan)) !== hashBusinessPayload(schedule.weeklyPattern))) throw new BusinessRuleError("HRIS_SHIFT_PLAN_EVIDENCE_UNRESOLVED")
    const consumed = await tx.payrollRun.findFirst({ where: { organizationId: parsed.organizationId, deletedAt: null, status: { in: ["CALCULATED", "REVIEWED", "APPROVED", "EMITTED", "POSTED", "PAID", "ARCHIVED"] },
      payrollPeriod: { periodEnd: { gte: schedule.effectiveFrom }, ...(schedule.effectiveTo ? { periodStart: { lte: new Date(schedule.effectiveTo.getTime() + 86399999) } } : {}) } }, select: { id: true } })
    if (consumed) throw new BusinessRuleError("HRIS_SCHEDULE_REQUIRES_PAYROLL_CORRECTION: Published changes cannot rewrite a consumed payroll interval.")
    const active = await tx.hrisWorkSchedule.findMany({ where: { organizationId: parsed.organizationId, employeeId: parsed.employeeId, status: "ACTIVE" } })
    const sameStart = active.find(row => sameDate(row.effectiveFrom, schedule.effectiveFrom))
    if (schedule.supersedesScheduleId) {
      if (!sameStart || sameStart.id !== schedule.supersedesScheduleId || !sameDate(sameStart.effectiveTo, schedule.effectiveTo) || sameStart.revision >= schedule.revision) throw new ConflictError("HRIS_SCHEDULE_PREDECESSOR_STALE: Refresh the current published revision.")
    } else if (sameStart) throw new ConflictError("HRIS_SCHEDULE_PREDECESSOR_REQUIRED")
    // Only dated clock plans can establish clock-time overlaps. Office patterns
    // retain their explicitly declared minute capacity and are shown as such.
    if (plan) {
      const applicable = active.filter(row => row.id !== schedule.supersedesScheduleId && row.shiftPlan !== null)
      assertDatedShiftPlansDoNotOverlap([plan, ...applicable.map(row => storedShiftPlan(row.shiftPlan)!)])
    }
    if (sameStart) await tx.hrisWorkSchedule.update({ where: { id: sameStart.id }, data: { status: "RETIRED" } })
    const claimed = await tx.hrisWorkSchedule.updateMany({ where: { id: schedule.id, organizationId: parsed.organizationId, status: "DRAFT" }, data: { status: "ACTIVE", approvedById: parsed.actorId, approvedAt: new Date(), approvalEvidenceHash: parsed.approvalEvidenceHash } })
    if (claimed.count !== 1) throw new ConflictError("HRIS_SCHEDULE_ALREADY_DECIDED")
    await audit(tx, parsed, schedule.id, "HRIS_SCHEDULE_REVISION_PUBLISHED", { revision: schedule.revision, supersedesScheduleId: schedule.supersedesScheduleId, sourceHash: schedule.sourceHash, approvalEvidenceHash: parsed.approvalEvidenceHash })
    return tx.hrisWorkSchedule.findUniqueOrThrow({ where: { id: schedule.id } })
  })
}
