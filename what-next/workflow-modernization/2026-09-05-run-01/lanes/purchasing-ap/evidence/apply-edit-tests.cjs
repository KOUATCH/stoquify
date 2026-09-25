const fs = require("node:fs");
function change(path, fn) { const a=fs.readFileSync(path,"utf8"),b=fn(a); if(a===b)throw new Error(path);fs.writeFileSync(path,b); }
change("hooks/__tests__/useRecentPurchaseOrderQueries.boundary.test.tsx", text=>text.replace("  useUpdatePurchaseOrder,","  useUpdatePurchaseOrder,\n  purchaseOrderKeys,")+`
describe("purchase order edit confirmed-result cache behavior", () => {
  it("keeps an authoritative cached order unchanged after an explicit rejected result", async () => {
    const client = createQueryClient()
    const cached = { id: "po-1", notes: "Saved notes", total: 243.5, capabilities: { canEdit: false } }
    client.setQueryData(purchaseOrderKeys.detail("po-1"), cached)
    const invalidate = jest.spyOn(client, "invalidateQueries")
    mockUpdatePurchaseOrder.mockResolvedValue({ success: false, data: null, error: "No access" })
    const { result } = renderHook(() => useUpdatePurchaseOrder(), { wrapper: createWrapper(client) })
    await act(async () => { await result.current.mutateAsync({ id: "po-1", organizationId: "org-1", notes: "Unsaved" }) })
    expect(client.getQueryData(purchaseOrderKeys.detail("po-1"))).toEqual(cached)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("refreshes detail, lists and tenant summary only after a confirmed save", async () => {
    const client = createQueryClient()
    const invalidate = jest.spyOn(client, "invalidateQueries")
    mockUpdatePurchaseOrder.mockResolvedValue({ success: true, data: { id: "po-1" } })
    const { result } = renderHook(() => useUpdatePurchaseOrder(), { wrapper: createWrapper(client) })
    await act(async () => { await result.current.mutateAsync({ id: "po-1", organizationId: "org-1", notes: "Saved" }) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: purchaseOrderKeys.detail("po-1") })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: purchaseOrderKeys.lists() })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: purchaseOrderKeys.summary("org-1") })
  })
})
`);
change("actions/purchaseOrderWorkflow/__tests__/purchaseOrderSystemAction.test.ts",text=>text
 .replace("  approvePurchaseOrder,","  approvePurchaseOrder,\n  updatePurchaseOrder,")
 .replace("  approvePurchaseOrder as approvePurchaseOrderService,","  approvePurchaseOrder as approvePurchaseOrderService,\n  updatePurchaseOrder as updatePurchaseOrderService,")
 +`
describe("purchase order edit partial payload", () => {
  it.each([undefined, 0, 15])("preserves shippingCost %s and derives editor identity from session", async (shippingCost) => {
    ;(updatePurchaseOrderService as jest.Mock).mockResolvedValue({ id: "po-1", orderNumber: "PO-1" })
    const result = await updatePurchaseOrder({ id: "po-1", organizationId: "org-session", notes: "Changed notes", ...(shippingCost === undefined ? {} : { shippingCost }) })
    expect(result.success).toBe(true)
    expect(updatePurchaseOrderService).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", updatedById: "actor-session", notes: "Changed notes" }))
    expect((updatePurchaseOrderService as jest.Mock).mock.calls[0][0].shippingCost).toBe(shippingCost)
  })
})
`);
change("app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/__tests__/page.test.tsx",text=>text
 .replace('  getPurchaseOrderFormOptions,','  getPurchaseOrderFormOptions,\n  getPurchaseOrderCurrency,')
 .replace('  getPurchaseOrderFormOptions: jest.fn(),','  getPurchaseOrderFormOptions: jest.fn(),\n  getPurchaseOrderCurrency: jest.fn(),')
 .replace('    mockGetPurchaseOrderById.mockResolvedValue({ id: "po-1", status: "DRAFT" })','    ;(getPurchaseOrderCurrency as jest.Mock).mockResolvedValue("XAF")\n    mockGetPurchaseOrderById.mockResolvedValue({ id: "po-1", status: "DRAFT" })')
 +`
it("propagates a failed purchase order query instead of displaying not found", async () => {
  jest.clearAllMocks()
  mockRequirePermission.mockResolvedValue({ orgId: "org-1", userId: "user-1", permissions: ["purchases.orders.update"] })
  mockObserveModuleAccess.mockResolvedValue({ allowed: true })
  mockGetPurchaseOrderById.mockRejectedValue(new Error("Database unavailable"))
  await expect(PurchaseOrderEditPage({ params: params() })).rejects.toThrow("Database unavailable")
  expect(mockNotFound).not.toHaveBeenCalled()
})
`);
