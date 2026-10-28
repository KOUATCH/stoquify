import {
  adminPermissions,
  branchDailyClosePermissions,
  cashierPermissions,
  managerPermissions,
  staffPermissions,
  viewerPermissions,
} from "../permissions"

describe("branch daily-close default-role permissions", () => {
  const reviewPermission = "branch.daily-close.review"

  it("registers review separately from critical sign-off", () => {
    expect(branchDailyClosePermissions).toEqual([
      reviewPermission,
      "branch.daily-close.sign",
    ])
  })

  it.each([
    ["admin", adminPermissions],
    ["manager", managerPermissions],
  ])("grants review authority to %s", (_role, permissions) => {
    expect(permissions).toContain(reviewPermission)
  })

  it.each([
    ["staff", staffPermissions],
    ["cashier", cashierPermissions],
    ["viewer", viewerPermissions],
  ])("does not grant review authority to %s", (_role, permissions) => {
    expect(permissions).not.toContain(reviewPermission)
  })
})
