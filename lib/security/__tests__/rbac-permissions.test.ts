import {
  expandPermissions,
  hasAllRbacPermissions,
  hasAnyRbacPermission,
  hasRbacPermission,
  permissionCandidates,
  permissionRisk,
} from "@/lib/security/rbac-permissions"

describe("rbac permission compatibility", () => {
  it("allows old uppercase role permissions to satisfy canonical dot-style checks", () => {
    expect(hasRbacPermission(["READ_ROLES"], "roles.read")).toBe(true)
    expect(hasRbacPermission(["CREATE_USERS"], "users.create")).toBe(true)
    expect(hasRbacPermission(["READ_SUPPLIERS"], "purchases.suppliers.read")).toBe(true)
  })

  it("allows canonical dot-style permissions to satisfy older uppercase checks", () => {
    expect(hasRbacPermission(["roles.update"], "UPDATE_ROLES")).toBe(true)
    expect(hasRbacPermission(["customers.read"], "READ_CUSTOMERS")).toBe(true)
  })

  it("preserves wildcard semantics", () => {
    expect(hasRbacPermission(["*"], "roles.permissions.assign")).toBe(true)
    expect(hasAnyRbacPermission(["*"], ["users.delete", "roles.delete"])).toBe(true)
    expect(hasAllRbacPermissions(["*"], ["users.delete", "roles.delete"])).toBe(true)
  })

  it("expands stored permissions into effective permission candidates", () => {
    expect(expandPermissions(["ASSIGN_ROLES"])).toEqual(
      expect.arrayContaining(["ASSIGN_ROLES", "roles.permissions.assign"]),
    )
    expect(permissionCandidates("roles.read")).toEqual(
      expect.arrayContaining(["roles.read", "READ_ROLES"]),
    )
  })

  it("keeps accounting permissions compatible with legacy finance grants", () => {
    expect(hasRbacPermission(["POST_JOURNAL_ENTRIES"], "accounting.journal.post")).toBe(true)
    expect(hasRbacPermission(["accounting.reports.read"], "VIEW_FINANCIAL_REPORTS")).toBe(true)
  })

  it("classifies role mutation permissions as critical", () => {
    expect(permissionRisk("roles.permissions.assign")).toBe("crit")
  })
})
