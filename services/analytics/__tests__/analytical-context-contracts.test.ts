import { resolveOrganizationAnalyticalContext } from "../analytical-context-contracts"

const baseInput = {
  organizationId: "org-1",
  currency: "XAF",
  timezone: "Africa/Douala",
  generatedAt: "2026-08-30T10:30:00.000Z",
  periodStart: "2026-08-29T23:00:00.000Z",
  periodEndExclusive: "2026-08-30T23:00:00.000Z",
}

describe("organization analytical context", () => {
  it("resolves organization currency, timezone and half-open period without a fallback", () => {
    const result = resolveOrganizationAnalyticalContext(baseInput)

    expect(result).toEqual({
      state: "ready",
      blockers: [],
      context: {
        schemaVersion: "organization-analytical-context.v1",
        organizationId: "org-1",
        generatedAt: "2026-08-30T10:30:00.000Z",
        currency: {
          code: "XAF",
          minorUnit: 0,
          source: "ORGANIZATION",
          aggregationPrecision: "DECIMAL_SOURCE_AGGREGATION",
        },
        timezone: {
          iana: "Africa/Douala",
          calendar: "gregory",
          source: "ORGANIZATION",
        },
        period: {
          periodStart: "2026-08-29T23:00:00.000Z",
          periodEndExclusive: "2026-08-30T23:00:00.000Z",
          boundaryConvention: "INCLUSIVE_START_EXCLUSIVE_END",
          timezone: "Africa/Douala",
        },
        scope: { kind: "ORGANIZATION", locationId: null },
      },
    })
  })

  it("normalizes currency and a permitted location scope", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      currency: " eur ",
      timezone: "Europe/Paris",
      locationId: " branch-1 ",
    })

    expect(result).toMatchObject({
      state: "ready",
      context: {
        currency: { code: "EUR", minorUnit: 2 },
        timezone: { iana: "Europe/Paris" },
        scope: { kind: "LOCATION", locationId: "branch-1" },
      },
    })
  })

  it("blocks a missing organization currency instead of falling back to XAF", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      currency: null,
    })

    expect(result.state).toBe("blocked")
    expect(result.context).toBeNull()
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_CURRENCY", field: "currency" }),
      ]),
    )
  })

  it("blocks an invalid IANA timezone", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      timezone: "Africa/Not-A-Zone",
    })

    expect(result.state).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_TIMEZONE", field: "timezone" }),
      ]),
    )
  })

  it("blocks date-only boundaries that could inherit server-local semantics", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      periodStart: "2026-08-30",
      periodEndExclusive: "2026-08-31",
    })

    expect(result.state).toBe("blocked")
    expect(result.blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining(["INVALID_PERIOD_START", "INVALID_PERIOD_END"]),
    )
  })

  it("blocks an empty or reversed period", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      periodStart: "2026-08-31T00:00:00.000Z",
      periodEndExclusive: "2026-08-30T00:00:00.000Z",
    })

    expect(result.state).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_PERIOD_ORDER" }),
      ]),
    )
  })

  it("does not widen an explicitly blank location to organization scope", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      locationId: "   ",
    })

    expect(result.state).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_LOCATION_SCOPE", field: "locationId" }),
      ]),
    )
  })

  it("blocks an invalid generation timestamp", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      generatedAt: "not-a-date",
    })

    expect(result.state).toBe("blocked")
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_GENERATED_AT", field: "generatedAt" }),
      ]),
    )
  })

  it.each([
    ["XOF", 0],
    ["KWD", 3],
  ])("preserves %s currency precision", (currency, minorUnit) => {
    const result = resolveOrganizationAnalyticalContext({ ...baseInput, currency })

    expect(result).toMatchObject({
      state: "ready",
      context: { currency: { code: currency, minorUnit } },
    })
  })

  it("normalizes organization midnight across the UTC month boundary", () => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      periodStart: "2026-09-01T00:00:00+01:00",
      periodEndExclusive: "2026-09-02T00:00:00+01:00",
    })

    expect(result).toMatchObject({
      state: "ready",
      context: {
        period: {
          periodStart: "2026-08-31T23:00:00.000Z",
          periodEndExclusive: "2026-09-01T23:00:00.000Z",
        },
      },
    })
  })

  it.each([
    {
      season: "spring",
      start: "2026-03-29T00:00:00+01:00",
      end: "2026-03-30T00:00:00+02:00",
      expectedStart: "2026-03-28T23:00:00.000Z",
      expectedEnd: "2026-03-29T22:00:00.000Z",
      hours: 23,
    },
    {
      season: "autumn",
      start: "2026-10-25T00:00:00+02:00",
      end: "2026-10-26T00:00:00+01:00",
      expectedStart: "2026-10-24T22:00:00.000Z",
      expectedEnd: "2026-10-25T23:00:00.000Z",
      hours: 25,
    },
  ])("preserves explicit $season DST boundaries without assuming a 24-hour day", (period) => {
    const result = resolveOrganizationAnalyticalContext({
      ...baseInput,
      currency: "EUR",
      timezone: "Europe/Paris",
      periodStart: period.start,
      periodEndExclusive: period.end,
    })

    expect(result.state).toBe("ready")
    if (result.state !== "ready") throw new Error("Expected valid explicit DST boundaries")
    expect(result.context.period.periodStart).toBe(period.expectedStart)
    expect(result.context.period.periodEndExclusive).toBe(period.expectedEnd)
    expect(
      (Date.parse(result.context.period.periodEndExclusive) - Date.parse(result.context.period.periodStart)) / 3_600_000,
    ).toBe(period.hours)
  })

  it("shares one exact cutoff between adjacent half-open periods", () => {
    const first = resolveOrganizationAnalyticalContext({
      ...baseInput,
      periodStart: "2026-08-31T00:00:00+01:00",
      periodEndExclusive: "2026-09-01T00:00:00+01:00",
    })
    const second = resolveOrganizationAnalyticalContext({
      ...baseInput,
      periodStart: "2026-08-31T23:00:00Z",
      periodEndExclusive: "2026-09-01T23:00:00Z",
    })

    if (first.state !== "ready" || second.state !== "ready") {
      throw new Error("Expected valid adjacent periods")
    }
    expect(first.context.period.periodEndExclusive).toBe(second.context.period.periodStart)
    expect(first.context.period.boundaryConvention).toBe("INCLUSIVE_START_EXCLUSIVE_END")
    expect(second.context.period.boundaryConvention).toBe("INCLUSIVE_START_EXCLUSIVE_END")
  })

  it.each([
    { override: { timezone: "   " }, code: "INVALID_TIMEZONE" },
    { override: { organizationId: "   " }, code: "MISSING_ORGANIZATION_ID" },
    { override: { periodEndExclusive: baseInput.periodStart }, code: "INVALID_PERIOD_ORDER" },
    { override: { periodStart: "2026-08-30T00:00:00" }, code: "INVALID_PERIOD_START" },
  ])("blocks $code instead of inferring missing context", ({ override, code }) => {
    const result = resolveOrganizationAnalyticalContext({ ...baseInput, ...override })

    expect(result.state).toBe("blocked")
    expect(result.context).toBeNull()
    expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ code })]))
  })
})
