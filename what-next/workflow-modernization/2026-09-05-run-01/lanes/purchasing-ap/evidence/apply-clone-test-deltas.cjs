const fs=require("node:fs");
let path="actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts"; let raw=fs.readFileSync(path,"utf8");
raw+=`
describe("purchase-order clone boundary", () => {
  it.each([true, false])("uses current server identity and edit permission %s", async canEdit => {
    mockRequirePermission.mockResolvedValueOnce({ orgId: "org-session", userId: "current-buyer", permissions: ["purchases.orders.create", ...(canEdit ? ["purchases.orders.update"] : [])] })
    ;(clonePurchaseOrderService as jest.Mock).mockResolvedValueOnce({ id: "new-draft", status: "DRAFT", orderNumber: "PO-NEW" })
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "org-session" })
    expect(mockRequirePermission).toHaveBeenCalledWith("purchases.orders.create", expect.objectContaining({ resourceId: "source-order" }))
    expect(clonePurchaseOrderService).toHaveBeenCalledWith({ id: "source-order", organizationId: "org-session" }, "current-buyer")
    expect(result).toMatchObject({ success: true, data: { id: "new-draft", status: "DRAFT" }, canEdit })
  })
  it("does not create after current authorization is denied", async () => {
    mockRequirePermission.mockRejectedValueOnce(new ApplicationError("FORBIDDEN", "Private authority detail", 403, true, { private: "secret-marker" }))
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "org-session" })
    expect(result).toMatchObject({ success: false, failure: "denied", code: "FORBIDDEN" })
    expect(clonePurchaseOrderService).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toMatch(/secret-marker|Private authority detail/)
  })
  it("rejects a forged tenant before the clone service", async () => {
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "foreign-org" })
    expect(result.success).toBe(false)
    expect(clonePurchaseOrderService).not.toHaveBeenCalled()
  })
  it.each([["NOT_FOUND", 404, "unavailable"], ["INTERNAL_ERROR", 500, "unknown"]] as const)("returns only a safe %s presentation outcome", async (code, status, failure) => {
    ;(clonePurchaseOrderService as jest.Mock).mockRejectedValueOnce(new ApplicationError(code, "Private service data", status, true, { private: "secret-marker" }))
    const result = await clonePurchaseOrder({ id: "source-order", organizationId: "org-session" })
    expect(result).toMatchObject({ success: false, failure })
    expect(JSON.stringify(result)).not.toMatch(/secret-marker|Private service data/)
  })
})
`;fs.writeFileSync(path,raw);
path="services/purchase-order/__tests__/purchase-order-clone-scope.service.test.ts";raw=fs.readFileSync(path,"utf8").replace('updatedAt: new Date("2026-09-01"), paymentTerms:', 'updatedAt: new Date("2026-09-01"), notes: "Source delivery instructions", paymentTerms:').replace('status: "DRAFT", shippingCost: 0 })', 'status: "DRAFT", shippingCost: 0, notes: "Source delivery instructions" })');fs.writeFileSync(path,raw);
