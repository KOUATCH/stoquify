import { BusinessRuleError } from "@/services/_shared/action-errors"
import type { PerformanceScope } from "@/lib/analytics/sales-performance-scope"
import { dailySalesPeriod } from "./daily-sales-period"

const dayMs = 86_400_000
export const shiftSalesDay = (date: string, days: number) => new Date(Date.parse(date + "T00:00:00Z") + days * dayMs).toISOString().slice(0, 10)

// Resolve the same wall-clock instant on another local date; ambiguous/nonexistent
// comparison clocks are explicitly unavailable, rather than silently shifted.
function equivalentClock(date: string, timezone: string, now: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
  const wall = formatter.format(now)
  const [h, m, s] = wall.split(":").map(Number)
  const guess = dailySalesPeriod(date, timezone).start.getTime() + ((h * 60 + m) * 60 + s) * 1000 + now.getUTCMilliseconds()
  const matches: Date[] = []
  for (let minutes = -180; minutes <= 180; minutes += 15) {
    const candidate = new Date(guess + minutes * 60_000)
    if (formatter.format(candidate) === wall && dailySalesPeriod(candidate, timezone).date === date) matches.push(candidate)
  }
  return matches.length === 1 ? matches[0] : null
}

export function salesPerformancePeriod(scope: PerformanceScope, timezone: string, now = new Date()) {
  const today = dailySalesPeriod(undefined, timezone, now).date
  const preset = scope.preset ?? "7d"
  const end = preset === "custom" ? scope.end : preset === "yesterday" ? shiftSalesDay(today, -1) : today
  const start = preset === "custom" ? scope.start : preset === "7d" ? shiftSalesDay(today, -6) : preset === "month" ? today.slice(0, 8) + "01" : end
  if (!start || !end) throw new BusinessRuleError("Choose both report dates.")
  const first = dailySalesPeriod(start, timezone), last = dailySalesPeriod(end, timezone)
  const days = (last.calendarDate.getTime() - first.calendarDate.getTime()) / dayMs + 1
  if (days < 1 || days > 366 || end > today) throw new BusinessRuleError("Choose up to 366 calendar days, ending no later than today.")
  const previousStartDate = shiftSalesDay(start, -days), previousEndDate = shiftSalesDay(end, -days)
  const partial = end === today
  const previousEnd = partial ? equivalentClock(previousEndDate, timezone, now) : dailySalesPeriod(previousEndDate, timezone).endExclusive
  return { start, end, days, partial, startAt: first.start, endAt: partial ? now : last.endExclusive,
    previousStartDate, previousEndDate, previousStartAt: dailySalesPeriod(previousStartDate, timezone).start, previousEndAt: previousEnd }
}
