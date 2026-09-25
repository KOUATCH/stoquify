export const ORGANIZATION_ANALYTICAL_CONTEXT_SCHEMA_VERSION =
  "organization-analytical-context.v1" as const

export type AnalyticalPeriodBoundaryConvention =
  "INCLUSIVE_START_EXCLUSIVE_END"

export type AnalyticalAggregationPrecision = "DECIMAL_SOURCE_AGGREGATION"

export type AnalyticalContextBlockerCode =
  | "MISSING_ORGANIZATION_ID"
  | "INVALID_CURRENCY"
  | "INVALID_TIMEZONE"
  | "INVALID_GENERATED_AT"
  | "INVALID_PERIOD_START"
  | "INVALID_PERIOD_END"
  | "INVALID_PERIOD_ORDER"
  | "INVALID_LOCATION_SCOPE"

export type AnalyticalContextBlocker = {
  code: AnalyticalContextBlockerCode
  severity: "high"
  field:
    | "organizationId"
    | "currency"
    | "timezone"
    | "generatedAt"
    | "periodStart"
    | "periodEndExclusive"
    | "locationId"
  message: string
}

export type OrganizationAnalyticalContext = {
  schemaVersion: typeof ORGANIZATION_ANALYTICAL_CONTEXT_SCHEMA_VERSION
  organizationId: string
  generatedAt: string
  currency: {
    code: string
    minorUnit: number
    source: "ORGANIZATION"
    aggregationPrecision: AnalyticalAggregationPrecision
  }
  timezone: {
    iana: string
    calendar: "gregory"
    source: "ORGANIZATION"
  }
  period: {
    periodStart: string
    periodEndExclusive: string
    boundaryConvention: AnalyticalPeriodBoundaryConvention
    timezone: string
  }
  scope:
    | {
        kind: "ORGANIZATION"
        locationId: null
      }
    | {
        kind: "LOCATION"
        locationId: string
      }
}

export type OrganizationAnalyticalContextResult =
  | {
      state: "ready"
      context: OrganizationAnalyticalContext
      blockers: []
    }
  | {
      state: "blocked"
      context: null
      blockers: AnalyticalContextBlocker[]
    }

export type ResolveOrganizationAnalyticalContextInput = {
  organizationId: string | null | undefined
  currency: string | null | undefined
  timezone: string | null | undefined
  generatedAt: Date | string
  periodStart: Date | string
  periodEndExclusive: Date | string
  locationId?: string | null
}

const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/
const EXPLICIT_OFFSET_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i

function blocker(
  code: AnalyticalContextBlockerCode,
  field: AnalyticalContextBlocker["field"],
  message: string,
): AnalyticalContextBlocker {
  return { code, severity: "high", field, message }
}

function normalizeExplicitInstant(value: Date | string) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null
  }

  const normalized = value.trim()
  if (!normalized || !EXPLICIT_OFFSET_PATTERN.test(normalized)) return null

  const parsed = new Date(normalized)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null
}

function isValidIanaTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(
      new Date("2026-01-01T00:00:00.000Z"),
    )
    return true
  } catch {
    return false
  }
}

function currencyMinorUnit(currency: string) {
  try {
    const minorUnit = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits
    return typeof minorUnit === "number" ? minorUnit : null
  } catch {
    return null
  }
}

export function resolveOrganizationAnalyticalContext(
  input: ResolveOrganizationAnalyticalContextInput,
): OrganizationAnalyticalContextResult {
  const blockers: AnalyticalContextBlocker[] = []
  const organizationId = input.organizationId?.trim() ?? ""
  const currency = input.currency?.trim().toUpperCase() ?? ""
  const timezone = input.timezone?.trim() ?? ""
  const generatedAt = normalizeExplicitInstant(input.generatedAt)
  const periodStart = normalizeExplicitInstant(input.periodStart)
  const periodEndExclusive = normalizeExplicitInstant(input.periodEndExclusive)

  if (!organizationId) {
    blockers.push(
      blocker(
        "MISSING_ORGANIZATION_ID",
        "organizationId",
        "An organization is required for analytical context.",
      ),
    )
  }

  const minorUnit = ISO_CURRENCY_PATTERN.test(currency)
    ? currencyMinorUnit(currency)
    : null

  if (minorUnit === null) {
    blockers.push(
      blocker(
        "INVALID_CURRENCY",
        "currency",
        "The organization currency must be an explicit three-letter currency code.",
      ),
    )
  }

  if (!timezone || !isValidIanaTimezone(timezone)) {
    blockers.push(
      blocker(
        "INVALID_TIMEZONE",
        "timezone",
        "The organization timezone must be an explicit IANA timezone.",
      ),
    )
  }

  if (!generatedAt) {
    blockers.push(
      blocker(
        "INVALID_GENERATED_AT",
        "generatedAt",
        "The analytical generation time must be an instant with an explicit UTC offset.",
      ),
    )
  }

  if (!periodStart) {
    blockers.push(
      blocker(
        "INVALID_PERIOD_START",
        "periodStart",
        "The analytical period start must be an instant with an explicit UTC offset.",
      ),
    )
  }

  if (!periodEndExclusive) {
    blockers.push(
      blocker(
        "INVALID_PERIOD_END",
        "periodEndExclusive",
        "The analytical period end must be an exclusive instant with an explicit UTC offset.",
      ),
    )
  }

  if (
    periodStart &&
    periodEndExclusive &&
    new Date(periodEndExclusive).getTime() <= new Date(periodStart).getTime()
  ) {
    blockers.push(
      blocker(
        "INVALID_PERIOD_ORDER",
        "periodEndExclusive",
        "The analytical period end must be later than its start.",
      ),
    )
  }

  const hasExplicitLocation = input.locationId !== undefined && input.locationId !== null
  const locationId = input.locationId?.trim() ?? ""
  if (hasExplicitLocation && !locationId) {
    blockers.push(
      blocker(
        "INVALID_LOCATION_SCOPE",
        "locationId",
        "An explicit location scope requires a non-empty location identifier.",
      ),
    )
  }

  if (
    blockers.length > 0 ||
    minorUnit === null ||
    !generatedAt ||
    !periodStart ||
    !periodEndExclusive
  ) {
    return { state: "blocked", context: null, blockers }
  }

  return {
    state: "ready",
    blockers: [],
    context: {
      schemaVersion: ORGANIZATION_ANALYTICAL_CONTEXT_SCHEMA_VERSION,
      organizationId,
      generatedAt,
      currency: {
        code: currency,
        minorUnit,
        source: "ORGANIZATION",
        aggregationPrecision: "DECIMAL_SOURCE_AGGREGATION",
      },
      timezone: {
        iana: timezone,
        calendar: "gregory",
        source: "ORGANIZATION",
      },
      period: {
        periodStart,
        periodEndExclusive,
        boundaryConvention: "INCLUSIVE_START_EXCLUSIVE_END",
        timezone,
      },
      scope: locationId
        ? { kind: "LOCATION", locationId }
        : { kind: "ORGANIZATION", locationId: null },
    },
  }
}
