import { dashboardLoginRecoveryHref } from "../dashboard-session-recovery"

it.each(["en", "fr"] as const)("retains the requested dashboard view in %s", locale => {
  const target = `/${locale}/dashboard/daily-digest?digest=finance-cash&mode=command`
  expect(dashboardLoginRecoveryHref(target, locale)).toBe(`/${locale}/login?callbackUrl=${encodeURIComponent(target)}`)
  expect(dashboardLoginRecoveryHref(`${target}&_rsc=private-transport`, locale)).toBe(`/${locale}/login?callbackUrl=${encodeURIComponent(target)}`)
})

it.each([null, "https://attacker.invalid", "//attacker.invalid", "/\\attacker.invalid", "/en/dashboard/../../login", "/en/dashboard-other", "/fr/dashboard", "/en/dashboard\r\nlocation: elsewhere"])("rejects an invalid or out-of-scope return path: %s", value => {
  expect(dashboardLoginRecoveryHref(value, "en")).toBe("/en/login")
})

it("keeps query values as data without redirecting to their embedded URL", () => {
  const target = "/en/dashboard?search=https%3A%2F%2Fattacker.invalid"
  expect(dashboardLoginRecoveryHref(target, "en")).toBe(`/en/login?callbackUrl=${encodeURIComponent(target)}`)
})
