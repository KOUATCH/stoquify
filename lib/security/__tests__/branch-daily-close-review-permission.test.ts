import {
  hasRbacPermission,
  isKnownPermission,
  permissionRisk,
} from "../rbac-permissions"

describe("branch daily-close review authority", () => {
  const permission = "branch.daily-close.review"

  it("registers review as canonical high-risk authority", () => {
    expect(isKnownPermission(permission)).toBe(true)
    expect(permissionRisk(permission)).toBe("high")
  })

  it("requires an explicit grant instead of accepting wildcard authority", () => {
    expect(hasRbacPermission(["*"], permission)).toBe(false)
    expect(hasRbacPermission([permission], permission)).toBe(true)
    expect(hasRbacPermission(["dashboard.read"], permission)).toBe(false)
    expect(hasRbacPermission(["branch.daily-close.sign"], permission)).toBe(
      false,
    )
  })
})
