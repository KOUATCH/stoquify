import { BusinessRuleError } from "@/services/_shared/action-errors"
import { attendanceHash, attendanceMetadata } from "./attendance-correction"

type Minutes = { scheduledMinutes: number; workedMinutes: number; absenceMinutes: number; overtimeMinutes: number }
type Entry = Minutes & { id: string; workDate: Date }
type Request = { id: string; type: string; status: string; periodStart: Date; periodEnd: Date; requestedMinutes: number; leavePolicyId: string | null; approvalEvidenceHash: string | null; sourceHash: string; metadata: unknown }
type Policy = { id: string; effectiveFrom: Date; effectiveTo: Date | null; sourceHash: string; approvedById: string | null; approvalEvidenceHash: string | null }
type Schedule = { id: string; sourceHash: string; timezone: string; weeklyPattern: unknown; effectiveFrom: Date; effectiveTo: Date | null; approvedById: string | null; approvalEvidenceHash: string | null;
  calendar: { sourceHash: string; status: string; timezone: string; effectiveFrom: Date; effectiveTo: Date | null; holidays: Array<{ holidayDate: Date; sourceHash: string }> } }
const DAY = 86400000
const names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
const day = (date: Date) => date.toISOString().slice(0, 10)
function fail(detail: string): never { throw new BusinessRuleError(`HRIS_TIME_ALLOCATION_UNRESOLVED: ${detail}`) }
const covers = (source: {effectiveFrom: Date; effectiveTo: Date | null}, date: Date) => day(source.effectiveFrom) <= day(date) && (!source.effectiveTo || day(source.effectiveTo) >= day(date))

/** Local work-date buckets: an overnight shift belongs once to its start date.
 * Date labels are stored as UTC midnight, never converted into elapsed instants.
 * Partial multi-day requests need reviewed per-date allocations; no guessed split.
 */
export function allocateOperationalMinutes(input: { entries: Entry[]; requests: Request[]; schedules: Schedule[]; policies: Policy[]; periodStart: Date; periodEnd: Date; employmentStart?: Date; employmentEnd?: Date|null }) {
  const rows = new Map<string, Entry & { leaveMinutes: number; payableOvertime: number }>()
  const usedSchedules = new Map<string, Schedule>()
  const usedPolicies = new Map<string, Policy>()
  for (const entry of input.entries) {
    const date = day(entry.workDate)
    if (entry.workDate.toISOString() !== `${date}T00:00:00.000Z` || rows.has(date)) fail("Use one reconciled local work-date entry per employee/day; split or duplicate rows require review.")
    const schedule = input.schedules.filter(item => covers(item, entry.workDate)).sort((a,b)=>b.effectiveFrom.getTime()-a.effectiveFrom.getTime())[0]
    if (!schedule || !schedule.approvedById || !schedule.approvalEvidenceHash || schedule.calendar.status !== "ACTIVE"
        || schedule.timezone !== schedule.calendar.timezone || !covers(schedule.calendar, entry.workDate)) fail("Approve an effective employee schedule and matching calendar.")
    try { new Intl.DateTimeFormat("en", {timeZone:schedule.timezone}) } catch { fail("Review the schedule timezone.") }
    const pattern = attendanceMetadata(schedule.weeklyPattern)
    const weekday = entry.workDate.getUTCDay()
    const expected = pattern[names[weekday]] ?? pattern[String(weekday)]
    if (typeof expected !== "number" || !Number.isInteger(expected) || expected < 0 || expected > 1440) fail("Declare scheduled minutes for each local weekday (sun–sat or 0–6).")
    const holiday = schedule.calendar.holidays.some(item => day(item.holidayDate) === date)
    if (entry.scheduledMinutes !== (holiday ? 0 : expected)) fail("Imported scheduled minutes disagree with the reviewed schedule/holiday; resolve the source.")
    if (entry.workedMinutes + entry.absenceMinutes !== entry.scheduledMinutes || entry.overtimeMinutes > entry.workedMinutes
        || Object.values({scheduled:entry.scheduledMinutes,worked:entry.workedMinutes,absence:entry.absenceMinutes,overtime:entry.overtimeMinutes}).some(value=>!Number.isInteger(value)||value<0)) fail("Worked plus absence must equal scheduled; overtime must be a nonnegative subset of worked.")
    rows.set(date, {...entry, leaveMinutes:0, payableOvertime:0})
    usedSchedules.set(schedule.id,schedule)
  }
  const coverageStart=day(input.employmentStart && input.employmentStart>input.periodStart ? input.employmentStart : input.periodStart)
  const employmentLastDay=input.employmentEnd ? new Date(input.employmentEnd.getTime()-1) : input.periodEnd
  const coverageEnd=day(employmentLastDay<input.periodEnd ? employmentLastDay : input.periodEnd)
  if(new Date(coverageEnd).getTime()-new Date(coverageStart).getTime()>366*DAY)fail("Review the bounded payroll coverage interval.")
  for(let at=new Date(`${coverageStart}T00:00:00Z`);day(at)<=coverageEnd;at=new Date(at.getTime()+DAY)){
    const schedule=input.schedules.filter(item=>covers(item,at)).sort((a,b)=>b.effectiveFrom.getTime()-a.effectiveFrom.getTime())[0]
    if(!schedule||!schedule.approvedById||!schedule.approvalEvidenceHash||schedule.calendar.status!=="ACTIVE"||!covers(schedule.calendar,at))fail("The payroll period contains a date without a reviewed effective schedule/calendar.")
    const pattern=attendanceMetadata(schedule.weeklyPattern);const expected=pattern[names[at.getUTCDay()]]??pattern[String(at.getUTCDay())]
    if(typeof expected!=="number"||!Number.isInteger(expected)||expected<0||expected>1440)fail("Complete the weekday schedule for the whole payroll period.")
    const holiday=schedule.calendar.holidays.some(item=>day(item.holidayDate)===day(at))
    if(expected>0&&!holiday&&!rows.has(day(at)))fail("Import every scheduled work date in the employee's payroll period before certification.")
    usedSchedules.set(schedule.id,schedule)
  }
  const allocations: Array<{requestId:string; workDate:string; minutes:number; policyId:string|null}> = []
  for (const request of input.requests.filter(item=>item.status === "APPROVED" && item.type !== "ATTENDANCE_CORRECTION").sort((a,b)=>a.id.localeCompare(b.id))) {
    if (!request.approvalEvidenceHash) fail("Approved requests require retained review evidence.")
    const start = day(request.periodStart), end = day(request.periodEnd)
    if (end < start || request.periodEnd.getTime()-request.periodStart.getTime()>366*DAY) fail("Review the bounded request interval.")
    const eligible = [...rows.entries()].filter(([date])=>date>=start&&date<=end).sort(([a],[b])=>a.localeCompare(b))
    if (request.type === "OVERTIME") {
      // Approval caps eligible recorded work; it never adds worked minutes.
      let remaining = request.requestedMinutes
      for (const [date,row] of eligible) {
        const amount = Math.min(remaining,row.overtimeMinutes-row.payableOvertime)
        row.payableOvertime += amount; remaining -= amount
        if (amount) allocations.push({requestId:request.id,workDate:date,minutes:amount,policyId:null})
      }
      continue
    }
    if (request.type !== "LEAVE") fail("Unsupported request kind.")
    const policy = input.policies.find(item=>item.id===request.leavePolicyId)
    if (!policy || !policy.approvedById || !policy.approvalEvidenceHash || !covers(policy,request.periodStart) || !covers(policy,request.periodEnd)) fail("Select the employee's explicitly enrolled, reviewed leave policy for the whole request; split policy changes into separate requests.")
    usedPolicies.set(policy.id,policy)
    // All covered scheduled dates must be present, even outside this payroll period.
    for (let at=new Date(`${start}T00:00:00Z`);day(at)<=end;at=new Date(at.getTime()+DAY)) {
      const schedule=input.schedules.filter(item=>covers(item,at)).sort((a,b)=>b.effectiveFrom.getTime()-a.effectiveFrom.getTime())[0]
      if (!schedule) fail("A request crosses a date without an effective schedule.")
      const pattern=attendanceMetadata(schedule.weeklyPattern);const expected=pattern[names[at.getUTCDay()]]??pattern[String(at.getUTCDay())]
      if (typeof expected!=="number") fail("Complete the request's weekday schedule.")
      if (expected>0&&!schedule.calendar.holidays.some(item=>day(item.holidayDate)===day(at))&&!rows.has(day(at))) fail("Import all scheduled dates covered by the leave request before certification.")
    }
    const raw = attendanceMetadata(request.metadata).allocations
    let splits: Array<{workDate:string;minutes:number}>
    if (Array.isArray(raw)) {
      splits=raw.map(item=>{const value=attendanceMetadata(item);if(typeof value.workDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value.workDate)||typeof value.minutes!=="number"||!Number.isInteger(value.minutes)||value.minutes<=0)fail("Invalid reviewed leave allocation.");return{workDate:value.workDate as string,minutes:value.minutes as number}})
    } else if (eligible.length===1) splits=[{workDate:eligible[0][0],minutes:request.requestedMinutes}]
    else if (eligible.reduce((sum,[,row])=>sum+row.scheduledMinutes,0)===request.requestedMinutes) splits=eligible.filter(([,row])=>row.scheduledMinutes>0).map(([workDate,row])=>({workDate,minutes:row.scheduledMinutes}))
    else fail("Specify reviewed per-date allocations for a partial multi-day leave request.")
    if (new Set(splits.map(item=>item.workDate)).size!==splits.length || splits.reduce((sum,item)=>sum+item.minutes,0)!==request.requestedMinutes) fail("Leave allocations must be unique and sum exactly to requested minutes.")
    for (const split of splits) {
      const row=rows.get(split.workDate)
      if (!row||split.workDate<start||split.workDate>end||row.leaveMinutes+split.minutes>row.absenceMinutes) fail("Leave exceeds recorded absence or falls outside the reviewed request.")
      row.leaveMinutes+=split.minutes;allocations.push({requestId:request.id,...split,policyId:policy.id})
    }
  }
  const current=[...rows.entries()].filter(([date])=>date>=day(input.periodStart)&&date<=day(input.periodEnd))
  if(current.some(([date,row])=>(date<coverageStart||date>coverageEnd)&&row.scheduledMinutes>0))fail("Scheduled work lies outside the effective employment interval.")
  const totals=current.reduce((sum,[,row])=>({scheduledMinutes:sum.scheduledMinutes+row.scheduledMinutes,workedMinutes:sum.workedMinutes+row.workedMinutes,
    absenceMinutes:sum.absenceMinutes+row.absenceMinutes-row.leaveMinutes,leaveMinutes:sum.leaveMinutes+row.leaveMinutes,overtimeMinutes:sum.overtimeMinutes+row.payableOvertime}),{scheduledMinutes:0,workedMinutes:0,absenceMinutes:0,leaveMinutes:0,overtimeMinutes:0})
  if (current.some(([,row])=>row.payableOvertime!==row.overtimeMinutes)) fail("Recorded overtime needs matching approved authorization; resolve the unmatched work.")
  if (!totals.scheduledMinutes) fail("No scheduled work is available for this period.")
  return {totals,allocations,usedSchedules:[...usedSchedules.values()],usedPolicies:[...usedPolicies.values()],allocationHash:attendanceHash({version:1,period:[day(input.periodStart),day(input.periodEnd)],allocations,totals})}
}
