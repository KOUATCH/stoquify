import {
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
})
