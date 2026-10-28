export type AnalyticsRange = "30d" | "90d" | "365d" | "all"
export type ResolvedAnalyticsRange = AnalyticsRange | "custom"

const RANGE_DAYS: Record<Exclude<AnalyticsRange, "all">, number> = {
  "30d": 30,
  "90d": 90,
  "365d": 365,
}

export function normalizeAnalyticsRange(value?: string): AnalyticsRange {
  return value === "30d" || value === "90d" || value === "365d" || value === "all"
    ? value
    : "90d"
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function presetDateWindow(range: AnalyticsRange, now: Date) {
  if (range === "all") return {}

  const to = new Date(now)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - RANGE_DAYS[range])

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
  }
}

function normalizeDateInput(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || formatDateInput(parsed) !== value) return undefined
  return value
}

export function resolveAnalyticsDateWindow(
  rangeValue?: string,
  fromValue?: string,
  toValue?: string,
  now = new Date(),
): { range: ResolvedAnalyticsRange; from?: string; to?: string } {
  const range = normalizeAnalyticsRange(rangeValue)
  const from = normalizeDateInput(fromValue)
  const to = normalizeDateInput(toValue)
  const hasInvalidDate = Boolean(fromValue && !from) || Boolean(toValue && !to)
  const validOrder = !from || !to || from <= to

  if (!hasInvalidDate && validOrder && (from || to)) {
    return { range: "custom", ...(from ? { from } : {}), ...(to ? { to } : {}) }
  }

  return { range, ...presetDateWindow(range, now) }
}
