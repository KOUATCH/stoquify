import { canChangeOperatingRoleSet, canGrantOperatingRole, hasTenantWideOperatingGrantAuthority } from "../operating-access-grant-policy"

const limited = { permissions: ["dashboard.read", "users.roles.assign"], roleCodes: ["location_manager"] }
const admin = { ...limited, roleCodes: ["admin"] }
const reader = { code: "reader", permissions: ["dashboard.read"] }

it.each(["admin", "administrator", "super_admin", " ADMIN ", "Administrator", "Super_Admin"])("treats %s as latent authority", code => {
  expect(canGrantOperatingRole(limited, { code })).toBe(false)
  expect(canGrantOperatingRole(admin, { code })).toBe(true)
  expect(canChangeOperatingRoleSet(limited, [{ code, permissions: [] }], [{ code, permissions: [] }, reader])).toBe(false)
})
it.each([undefined, null, "", " "])("fails closed on missing target code %s", code => {
  expect(canGrantOperatingRole(admin, { code } as any)).toBe(false)
  expect(canChangeOperatingRoleSet(admin, [], [{ code, permissions: [] }] as any)).toBe(false)
})
it("does not turn an inert reserved code into effective grant authority", () => {
  expect(hasTenantWideOperatingGrantAuthority({ permissions: [], roleCodes: ["admin"] })).toBe(false)
  expect(canGrantOperatingRole({ permissions: [], roleCodes: ["admin"] }, { code: "admin" })).toBe(false)
})
it("recognizes current stored wildcard without changing separate permission ceilings", () => {
  expect(hasTenantWideOperatingGrantAuthority({ permissions: ["*"], roleCodes: [] })).toBe(true)
})
it("keeps ordinary grants and reductions available to limited actors", () => {
  expect(canGrantOperatingRole(limited, reader)).toBe(true)
  expect(canChangeOperatingRoleSet(limited, [], [reader])).toBe(true)
  expect(canChangeOperatingRoleSet(limited, [{ code: "admin", permissions: ["dashboard.read"] }], [reader])).toBe(true)
})
it("allows current tenant administrators to authorize composed operating scope", () => {
  expect(canChangeOperatingRoleSet(admin, [{ code: "admin", permissions: [] }], [{ code: "admin", permissions: [] }, reader])).toBe(true)
})
