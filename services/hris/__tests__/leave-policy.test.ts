import { assertLeaveEligibility, leaveQuantityMinutes, readLeaveRules } from "../leave-policy"
const policy = { id: "p", status: "ACTIVE", effectiveFrom: new Date("2026-01-01Z"), effectiveTo: new Date("2026-06-30Z"), approvedById: "checker", approvalEvidenceHash: "reviewed", annualEntitlementMinutes: 4800, carryOverLimitMinutes: 120,
  accrualRule: { schemaVersion: 1, employeeIds: ["a", "b"], negativeBalance: "FORBID", rounding: "EXACT_MINUTES", credits: [{ date: "2026-02-01", minutes: 480, kind: "ACCRUAL" }], expiry: "AT_POLICY_END", carryover: null } }
test("two policies are explicit and mid-period changes require separate requests", () => {
  expect(assertLeaveEligibility(policy, "a", new Date("2026-06-30Z"))).toBeTruthy()
  expect(assertLeaveEligibility({ ...policy, id: "sick" }, "a", new Date("2026-06-30Z"))).toBeTruthy()
  expect(() => assertLeaveEligibility(policy, "a", new Date("2026-06-30Z"), new Date("2026-07-01Z"))).toThrow("split requests")
  expect(() => assertLeaveEligibility(policy, "c", new Date("2026-06-30Z"))).toThrow("NOT_ELIGIBLE")
})
test.each([{}, { ...policy.accrualRule, negativeBalance: "ALLOW" }, { ...policy.accrualRule, rounding: "ROUND_UP" }, { ...policy.accrualRule, expiry: undefined }, { ...policy.accrualRule, credits: [{ date: "2026-02-30", minutes: 480, kind: "ACCRUAL" }] }, { ...policy.accrualRule, credits: [{ date: "2026-01-01", minutes: 5000, kind: "ACCRUAL" }] }])("undefined or unsupported rules block calculation: %j", accrualRule => {
  expect(() => readLeaveRules({ ...policy, accrualRule })).toThrow("RULES_UNRESOLVED")
})
test("partial days follow each work-date schedule; hours convert exactly", () => {
  expect(leaveQuantityMinutes(0.5, "DAYS", 480)).toBe(240)
  expect(leaveQuantityMinutes(0.5, "DAYS", 720)).toBe(360)
  expect(leaveQuantityMinutes(1.5, "HOURS", 480)).toBe(90)
  expect(() => leaveQuantityMinutes(0.333, "HOURS", 480)).toThrow("whole minutes")
  expect(() => leaveQuantityMinutes(1, "DAYS", 0)).toThrow("QUANTITY_UNRESOLVED")
})
test("R5 work-date policy bounds cannot use competing timestamps on the same day", () => {
  expect(() => readLeaveRules({ ...policy, effectiveFrom: new Date("2026-01-01T12:00:00Z") })).toThrow("RULES_UNRESOLVED")
  expect(() => readLeaveRules({ ...policy, effectiveTo: new Date("2026-06-30T12:00:00Z") })).toThrow("RULES_UNRESOLVED")
})
