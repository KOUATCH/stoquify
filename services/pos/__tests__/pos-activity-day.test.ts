import { getPOSActivityDay } from "../pos-activity-day"

it("uses the organization calendar when the local day starts on the preceding UTC date", () => {
  expect(getPOSActivityDay(new Date("2026-11-17T23:20:00Z"), "Africa/Douala")).toEqual({
    today: "2026-11-18", date: "2026-11-18",
    start: new Date("2026-11-17T23:00:00Z"), end: new Date("2026-11-18T23:00:00Z"),
  })
})

it.each([
  ["2026-03-29", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"],
  ["2026-10-25", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"],
])("uses the actual midnight boundaries over the Paris clock change on %s", (date, from, to) => {
  const day = getPOSActivityDay(new Date("2026-11-18T09:00:00Z"), "Europe/Paris", date)
  expect(day).toEqual({ today: "2026-11-18", date, start: new Date(from), end: new Date(to) })
})

it("rejects an overflowing date", () => {
  expect(() => getPOSActivityDay(new Date(), "UTC", "2026-02-30")).toThrow("Enter a valid date.")
})

