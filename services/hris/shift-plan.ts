import { z } from "zod"
import { BusinessRuleError } from "@/services/_shared/action-errors"

const timestamp = z.string().max(40).regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::00)?(?:Z|[+-]\d{2}:\d{2})$/)
const interval = z.object({ start: timestamp, end: timestamp }).strict()
export const datedShiftInputSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(80),
  shifts: z.array(interval.extend({ unpaidBreaks: z.array(interval).max(8) }).strict()).max(4),
}).strict()
export type DatedShiftInput = z.infer<typeof datedShiftInputSchema>
type PlannedInterval = { start: string; end: string; startAt: string; endAt: string; minutes: number }
export type DatedShiftPlan = {
  version: 1; workDate: string; timezone: string; allocation: "LOCAL_START_DATE";
  scheduledMinutes: number; shifts: Array<PlannedInterval & { unpaidBreaks: PlannedInterval[]; paidMinutes: number }>;
}
function fail(message: string): never { throw new BusinessRuleError(`HRIS_SHIFT_PLAN_INVALID: ${message}`) }
function localMinute(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date)
  const get = (type: string) => parts.find(part => part.type === type)?.value
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}
function instant(value: string, timezone: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()) || localMinute(date, timezone) !== value.slice(0, 16)) fail("The supplied offset and local time must match the configured timezone. Resolve DST ambiguity explicitly; nonexistent local times are not accepted.")
  return date
}
function readInterval(value: {start: string; end: string}, timezone: string): PlannedInterval {
  const start = instant(value.start, timezone), end = instant(value.end, timezone), minutes = (end.getTime() - start.getTime()) / 60000
  if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) fail("Each interval must last a positive whole number of minutes, at most 24 hours.")
  return { ...value, startAt: start.toISOString(), endAt: end.toISOString(), minutes }
}
function noOverlap(rows: PlannedInterval[], message: string) {
  const sorted = [...rows].sort((a, b) => a.startAt.localeCompare(b.startAt))
  if (sorted.some((row, index) => index > 0 && row.startAt < sorted[index - 1].endAt)) fail(message)
}
/** A dated off-day is an explicit empty shifts list. No attendance is inferred. */
export function buildDatedShiftPlan(input: DatedShiftInput): DatedShiftPlan {
  const parsed = datedShiftInputSchema.parse(input), date = new Date(parsed.workDate)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== parsed.workDate) fail("Select a valid local work date.")
  try { new Intl.DateTimeFormat("en", { timeZone: parsed.timezone }) } catch { fail("Select a valid IANA timezone.") }
  const shifts = parsed.shifts.map(shift => {
    if (shift.start.slice(0, 10) !== parsed.workDate) fail("Every shift belongs to its local start date.")
    const main = readInterval(shift, parsed.timezone), unpaidBreaks = shift.unpaidBreaks.map(row => readInterval(row, parsed.timezone))
    if (unpaidBreaks.some(row => row.startAt < main.startAt || row.endAt > main.endAt)) fail("Unpaid breaks must be fully inside their shift.")
    noOverlap(unpaidBreaks, "Unpaid breaks cannot overlap.")
    const paidMinutes = main.minutes - unpaidBreaks.reduce((sum, row) => sum + row.minutes, 0)
    if (paidMinutes <= 0) fail("A working shift must retain paid minutes; use an explicit off-day instead.")
    return { ...main, unpaidBreaks, paidMinutes }
  })
  noOverlap(shifts, "Shifts cannot overlap.")
  const scheduledMinutes = shifts.reduce((sum, row) => sum + row.paidMinutes, 0)
  if (scheduledMinutes > 1440) fail("Paid time assigned to one local start date cannot exceed 24 hours.")
  return { version: 1, workDate: parsed.workDate, timezone: parsed.timezone, allocation: "LOCAL_START_DATE", scheduledMinutes, shifts }
}
export function assertDatedShiftPlansDoNotOverlap(plans: DatedShiftPlan[]) {
  noOverlap(plans.flatMap(plan => plan.shifts), "Published shifts overlap across neighboring work dates. Review the preceding and following roster dates.")
}
export function datedShiftWeeklyPattern(plan: DatedShiftPlan) {
  const weekday = new Date(plan.workDate).getUTCDay(), names = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
  return Object.fromEntries(names.map((day, index) => [day, index === weekday ? plan.scheduledMinutes : 0]))
}
