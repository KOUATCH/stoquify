import { buildDatedShiftPlan, assertDatedShiftPlansDoNotOverlap, datedShiftWeeklyPattern } from "../shift-plan"
const night = { workDate: "2026-10-31", timezone: "Africa/Douala", shifts: [{ start: "2026-10-31T22:00+01:00", end: "2026-11-01T06:00+01:00", unpaidBreaks: [{ start: "2026-11-01T02:00+01:00", end: "2026-11-01T02:30+01:00" }] }] }
test("overnight month-end shift is assigned once to its local start date, with explicit breaks", () => {
  const plan = buildDatedShiftPlan(night)
  expect(plan).toMatchObject({ workDate: "2026-10-31", scheduledMinutes: 450, allocation: "LOCAL_START_DATE" })
  expect(datedShiftWeeklyPattern(plan)).toEqual({ sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 450 })
})
test("off-day is explicit and creates no paid minutes", () => {
  expect(buildDatedShiftPlan({ ...night, shifts: [] }).scheduledMinutes).toBe(0)
})
test("DST fold requires a matching explicit offset and measures elapsed minutes", () => {
  const plan = buildDatedShiftPlan({ workDate: "2026-10-25", timezone: "Europe/Paris", shifts: [{ start: "2026-10-25T01:00+02:00", end: "2026-10-25T04:00+01:00", unpaidBreaks: [] }] })
  expect(plan.scheduledMinutes).toBe(240)
})
test("nonexistent DST local time, wrong offset and invalid dates fail closed", () => {
  expect(() => buildDatedShiftPlan({ workDate: "2026-03-29", timezone: "Europe/Paris", shifts: [{ start: "2026-03-29T02:30+01:00", end: "2026-03-29T04:00+02:00", unpaidBreaks: [] }] })).toThrow("offset and local time")
  expect(() => buildDatedShiftPlan({ ...night, timezone: "UTC" })).toThrow("offset and local time")
  expect(() => buildDatedShiftPlan({ ...night, workDate: "2026-02-30", shifts: [] })).toThrow("valid local work date")
})
test("breaks and shifts cannot overlap or escape the shift", () => {
  expect(() => buildDatedShiftPlan({ ...night, shifts: [{ ...night.shifts[0], unpaidBreaks: [night.shifts[0].unpaidBreaks[0], night.shifts[0].unpaidBreaks[0]] }] })).toThrow("breaks cannot overlap")
  expect(() => buildDatedShiftPlan({ ...night, shifts: [{ ...night.shifts[0], unpaidBreaks: [{ start: "2026-11-01T06:00+01:00", end: "2026-11-01T06:30+01:00" }] }] })).toThrow("fully inside")
  expect(() => buildDatedShiftPlan({ ...night, shifts: [night.shifts[0], night.shifts[0]] })).toThrow("Shifts cannot overlap")
})
test("neighboring local work dates still detect cross-midnight overlap", () => {
  const next = buildDatedShiftPlan({ workDate: "2026-11-01", timezone: "Africa/Douala", shifts: [{ start: "2026-11-01T05:00+01:00", end: "2026-11-01T12:00+01:00", unpaidBreaks: [] }] })
  expect(() => assertDatedShiftPlansDoNotOverlap([buildDatedShiftPlan(night), next])).toThrow("neighboring work dates")
})
