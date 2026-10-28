import {
  hrisPermissions,
  permissionCategories,
  posReceiptControlPermissions,
  rolePermissionMap,
} from "@/config/permissions"

describe("permission catalog", () => {
  it("limits POS public receipt revocation to elevated operating roles", () => {
    expect(posReceiptControlPermissions).toEqual(["pos.receipts.revoke"])
    expect(rolePermissionMap.admin).toContain("pos.receipts.revoke")
    expect(rolePermissionMap.manager).toContain("pos.receipts.revoke")
    expect(rolePermissionMap.staff).not.toContain("pos.receipts.revoke")
    expect(rolePermissionMap.cashier).not.toContain("pos.receipts.revoke")
    expect(rolePermissionMap.viewer).not.toContain("pos.receipts.revoke")
  })

  it("keeps receipt revocation in its own permission category", () => {
    expect(permissionCategories["POS Receipt Controls"]).toEqual(posReceiptControlPermissions)
    expect(permissionCategories["POS System"]).not.toContain("pos.receipts.revoke")
  })

  it("separates low-scope employee self-service from elevated HRIS people access", () => {
    expect(hrisPermissions).toEqual([
      "hris.self_service.read",
      "hris.self_service.request",
      "hris.people.read",
      "hris.people.manage",
    ])
    expect(permissionCategories["HRIS People Core"]).toEqual(hrisPermissions)
    expect(permissionCategories["Payroll & Presence"]).not.toContain("hris.people.read")

    expect(rolePermissionMap.admin).toEqual(expect.arrayContaining([
      "hris.self_service.read",
      "hris.self_service.request",
      "hris.people.read",
      "hris.people.manage",
    ]))
    expect(rolePermissionMap.manager).toEqual(expect.arrayContaining([
      "hris.self_service.read",
      "hris.self_service.request",
      "hris.people.read",
    ]))
    expect(rolePermissionMap.manager).not.toContain("hris.people.manage")
    for (const role of ["staff", "cashier", "viewer"] as const) {
      expect(rolePermissionMap[role]).toEqual(expect.arrayContaining([
        "hris.self_service.read",
        "hris.self_service.request",
        "payroll.payslips.self.read",
      ]))
      expect(rolePermissionMap[role]).not.toContain("hris.people.read")
    }
  })
})
