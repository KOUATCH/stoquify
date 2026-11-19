import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { attendanceMetadata } from "./attendance-correction"
import { allocateOperationalMinutes } from "./time-allocation"
import { leaveQuantityMinutes, workDate } from "./leave-policy"

/** Request capacity uses reviewed schedules, not fabricated attendance. Payroll
 * certification still independently reconciles actual recorded absence. */
export async function resolveLeaveAllocationInTx(tx: Prisma.TransactionClient, input: {
  organizationId: string; employeeId: string; leavePolicyId: string; periodStart: Date; periodEnd: Date;
  requestedMinutes: number; allocations?: Array<{ workDate: string; minutes: number }>;
  quantity?: number; quantityUnit?: "MINUTES" | "HOURS" | "DAYS";
  checkApproved?: boolean; excludeRequestId?: string;
}): Promise<{requestedMinutes: number; allocations: Array<{workDate: string; minutes: number}>; conversion: {quantity: number; unit: string; workDate: string; scheduledMinutes: number; minutes: number; scheduleId: string; scheduleHash: string} | null}> {
  const start = workDate(input.periodStart), end = workDate(input.periodEnd)
  if (end < start || new Date(end).getTime() - new Date(start).getTime() > 365 * 86400000) throw new BusinessRuleError("HRIS_LEAVE_RANGE_INVALID: Use a bounded request of at most 366 work dates.")
  const [schedules, policy] = await Promise.all([
    tx.hrisWorkSchedule.findMany({ where: { organizationId: input.organizationId, employeeId: input.employeeId, status: "ACTIVE", effectiveFrom: { lt: new Date(new Date(end).getTime() + 86400000) }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date(start) } }] }, include: { calendar: { include: { holidays: true } } } }),
    tx.hrisLeavePolicy.findFirstOrThrow({ where: { organizationId: input.organizationId, id: input.leavePolicyId } }),
  ])
  const entries = [], days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  for (let date = new Date(start); workDate(date) <= end; date = new Date(date.getTime() + 86400000)) {
    const effective = schedules.filter(row => workDate(row.effectiveFrom) <= workDate(date) && (!row.effectiveTo || workDate(row.effectiveTo) >= workDate(date))).sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())
    const schedule = effective[0]
    if (!schedule || (effective[1] && effective[1].effectiveFrom.getTime() === schedule.effectiveFrom.getTime())) throw new BusinessRuleError("HRIS_LEAVE_SCHEDULE_UNRESOLVED: Approve one unambiguous effective employee schedule for each requested date.")
    if (schedule.effectiveFrom.toISOString() !== `${workDate(schedule.effectiveFrom)}T00:00:00.000Z` || (schedule.effectiveTo && schedule.effectiveTo.toISOString() !== `${workDate(schedule.effectiveTo)}T00:00:00.000Z`)) throw new BusinessRuleError("HRIS_LEAVE_SCHEDULE_DATE_UNRESOLVED: Schedule bounds must be local work-date labels stored at UTC midnight.")
    const pattern = attendanceMetadata(schedule.weeklyPattern), raw = pattern[days[date.getUTCDay()]] ?? pattern[String(date.getUTCDay())]
    const minutes = schedule.calendar.holidays.some(row => workDate(row.holidayDate) === workDate(date)) ? 0 : raw
    if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 0 || minutes > 1440) throw new BusinessRuleError("HRIS_LEAVE_SCHEDULE_UNRESOLVED: Complete reviewed weekday minutes.")
    entries.push({ id: workDate(date), workDate: date, scheduledMinutes: minutes, absenceMinutes: minutes, workedMinutes: 0, overtimeMinutes: 0 })
  }
  let requestedMinutes = input.requestedMinutes
  if (input.quantity !== undefined) {
    if (start !== end) throw new BusinessRuleError("HRIS_LEAVE_QUANTITY_DATE_REQUIRED: Day/hour quantities apply to one local work date. For several dates, supply explicit minute allocations.")
    requestedMinutes = leaveQuantityMinutes(input.quantity, input.quantityUnit ?? "MINUTES", entries[0].scheduledMinutes)
  }
  const allocation = allocateOperationalMinutes({ entries, schedules, policies: [policy], periodStart: input.periodStart, periodEnd: input.periodEnd,
    requests: [{ id: "capacity-preview", type: "LEAVE", status: "APPROVED", periodStart: input.periodStart, periodEnd: input.periodEnd, requestedMinutes, leavePolicyId: policy.id,
      approvalEvidenceHash: policy.approvalEvidenceHash, sourceHash: policy.sourceHash, metadata: input.allocations ? { allocations: input.allocations } : {} }] })
  if (input.checkApproved !== false) {
    const others = await tx.hrisTimeRequest.findMany({ where: { organizationId: input.organizationId, employeeId: input.employeeId, type: "LEAVE", status: "APPROVED", id: input.excludeRequestId ? { not: input.excludeRequestId } : undefined,
      periodStart: { lt: new Date(new Date(end).getTime() + 86400000) }, periodEnd: { gte: new Date(start) } } })
    const used = new Map(allocation.allocations.map(row => [row.workDate, row.minutes]))
    for (const row of others) {
      if (!row.leavePolicyId) throw new BusinessRuleError("HRIS_LEAVE_EXISTING_ALLOCATION_UNRESOLVED")
      const previous = await resolveLeaveAllocationInTx(tx, { organizationId: input.organizationId, employeeId: input.employeeId, leavePolicyId: row.leavePolicyId, periodStart: row.periodStart, periodEnd: row.periodEnd,
        requestedMinutes: row.requestedMinutes, allocations: attendanceMetadata(row.metadata).allocations as Array<{workDate:string;minutes:number}> | undefined, checkApproved: false })
      for (const split of previous.allocations) used.set(split.workDate, (used.get(split.workDate) ?? 0) + split.minutes)
    }
    if (entries.some(row => (used.get(workDate(row.workDate)) ?? 0) > row.scheduledMinutes)) throw new BusinessRuleError("HRIS_LEAVE_DAY_CAPACITY_EXCEEDED: Approved leave already uses this work date. Review or cancel it before adding more leave.")
  }
  const conversion = input.quantity !== undefined ? { quantity: input.quantity, unit: input.quantityUnit ?? "MINUTES", workDate: start, scheduledMinutes: entries[0].scheduledMinutes, minutes: requestedMinutes,
    scheduleId: allocation.usedSchedules[0].id, scheduleHash: allocation.usedSchedules[0].sourceHash } : null
  return { requestedMinutes, allocations: allocation.allocations.map(({ workDate, minutes }) => ({ workDate, minutes })), conversion }
}
