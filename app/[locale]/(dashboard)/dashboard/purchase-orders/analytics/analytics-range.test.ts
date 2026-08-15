import {
  normalizeAnalyticsRange,
  resolveAnalyticsDateWindow,
} from "./analytics-range"

describe("purchase-order analytics date window", () => {
  const now = new Date("2026-08-14T12:00:00.000Z")

  it("defaults unknown presets to a deterministic 90-day server window", () => {
    expect(normalizeAnalyticsRange("quarter")).toBe("90d")
    expect(resolveAnalyticsDateWindow("quarter", undefined, undefined, now)).toEqual({
      range: "90d",
      from: "2026-05-16",
      to: "2026-08-14",
    })
  })

  it("accepts a valid custom range", () => {
    expect(resolveAnalyticsDateWindow("90d", "2026-01-01", "2026-06-30", now)).toEqual({
      range: "custom",
      from: "2026-01-01",
      to: "2026-06-30",
    })
  })

  it("rejects impossible or reversed custom dates and returns to the selected preset", () => {
    expect(resolveAnalyticsDateWindow("30d", "2026-02-30", "2026-03-31", now)).toEqual({
      range: "30d",
      from: "2026-07-15",
      to: "2026-08-14",
    })
    expect(resolveAnalyticsDateWindow("all", "2026-12-31", "2026-01-01", now)).toEqual({
      range: "all",
    })
  })
})
