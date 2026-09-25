import { BusinessRuleError } from "@/services/_shared/action-errors"

function calendar(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BusinessRuleError("Choose a valid calendar date.")
  const instant = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0, 10) !== value) throw new BusinessRuleError("Choose a valid calendar date.")
  return instant
}

/** Local calendar boundaries, independent of the application server timezone.
 * Nonexistent or ambiguous midnight is unavailable rather than silently guessed. */
export function dailySalesPeriod(date: string | Date | undefined, timezone: string, now = new Date()) {
  let formatter: Intl.DateTimeFormat
  try {
    if (!timezone.trim()) throw new Error("Missing timezone")
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, calendar: "gregory", numberingSystem: "latn", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
  } catch { throw new BusinessRuleError("A valid organization timezone is required for the daily report.") }
  const parts = (instant: Date) => Object.fromEntries(formatter.formatToParts(instant).filter(part => part.type !== "literal").map(part => [part.type, part.value]))
  const key = (instant: Date) => {
    if (!Number.isFinite(instant.getTime())) throw new BusinessRuleError("Choose a valid calendar date.")
    const value = parts(instant)
    return `${value.year}-${value.month}-${value.day}`
  }
  const selectedDate = typeof date === "string" ? date : key(date ?? now)
  const calendarDate = calendar(selectedDate)
  const nextDate = new Date(calendarDate.getTime() + 86_400_000).toISOString().slice(0, 10)
  const midnight = (value: string) => {
    const target = calendar(value).getTime()
    const wallTime = (instant: number) => {
      const p = parts(new Date(instant))
      return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.000Z`)
    }
    let candidate = target
    for (let attempt = 0; attempt < 4; attempt++) {
      const delta = target - wallTime(candidate)
      candidate += delta
      if (delta === 0) {
        for (let offset = -180; offset <= 180; offset += 15) if (offset !== 0 && wallTime(candidate + offset * 60_000) === target) throw new BusinessRuleError("The selected day has an ambiguous midnight in the organization timezone.")
        return new Date(candidate)
      }
    }
    throw new BusinessRuleError("The selected day has no resolvable midnight in the organization timezone.")
  }
  return { date: selectedDate, calendarDate, start: midnight(selectedDate), endExclusive: midnight(nextDate) }
}
