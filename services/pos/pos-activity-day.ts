import { ApplicationError } from "@/services/_shared/action-errors"

const dayMilliseconds = 24 * 60 * 60 * 1000

function parseDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) {
    throw new ApplicationError("VALIDATION_ERROR", "Enter a valid date.", 400)
  }
  return value
}

export function getPOSActivityDay(now: Date, timezone: string, selectedDate?: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" })
  const calendarDate = (timestamp: number) => {
    const parts = formatter.formatToParts(timestamp)
    return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value.padStart(type === "year" ? 4 : 2, "0")).join("-")
  }
  const firstInstantOfDay = (day: string, utcMidnight: number) => {
    let first = utcMidnight - dayMilliseconds
    let last = utcMidnight + dayMilliseconds
    while (first < last) {
      const middle = Math.floor((first + last) / 2)
      if (calendarDate(middle) < day) first = middle + 1
      else last = middle
    }
    return new Date(first)
  }

  const today = calendarDate(now.getTime())
  const date = selectedDate ?? today
  const utcMidnight = parseDate(date).getTime()
  const nextMidnight = utcMidnight + dayMilliseconds
  const nextDate = new Date(nextMidnight).toISOString().slice(0, 10)
  return { today, date, start: firstInstantOfDay(date, utcMidnight), end: firstInstantOfDay(nextDate, nextMidnight) }
}
