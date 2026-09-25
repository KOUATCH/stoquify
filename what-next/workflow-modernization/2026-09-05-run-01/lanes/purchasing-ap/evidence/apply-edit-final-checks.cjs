const fs=require("node:fs");
function change(path,fn){const a=fs.readFileSync(path,"utf8"),b=fn(a);if(a===b)throw new Error(path);fs.writeFileSync(path,b)}
change("components/purchase-orders/ModernEditPurchaseOrderForm.tsx",text=>text
 .replace('const alertRef = useRef<HTMLDivElement>(null)','const alertRef = useRef<HTMLDivElement>(null)\n  const backRef = useRef<HTMLButtonElement>(null)')
 .replace('new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number.isFinite(amount) ? amount : 0)','Number.isFinite(amount) ? new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount) : "—"')
 .replace('<Button type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 whitespace-normal text-left"', '<Button ref={backRef} type="button" variant="outline" className="dashboard-button-secondary h-auto min-h-10 whitespace-normal text-left"')
 .replace('<DialogContent className="enterprise-floating-surface">','<DialogContent className="enterprise-floating-surface" onCloseAutoFocus={(event) => { event.preventDefault(); backRef.current?.focus() }}>')
);
change("components/purchase-orders/__tests__/ModernEditPurchaseOrderForm.test.tsx",text=>text.replace('.format(0))','.format(0).replace(/\\s/g, " "))'));
change("services/purchase-order/__tests__/purchase-order.service.test.ts",text=>'import { purchaseOrderEditDefaults, purchaseOrderEditPayload } from "@/components/purchase-orders/purchase-order-edit-model"\n'+text+`
describe("purchase order editor financial round trip", () => {
  it("persists unchanged percentage tax, one line discount and original notes through the real update calculation", async () => {
    const sourceLine = purchaseOrderLine({ orderedQuantity: 2, unitCost: 100, taxRate: 19.25, taxAmount: 38.5, discount: 10, lineTotal: 228.5, notes: "Original supplier note" })
    const source = purchaseOrder({ status: "DRAFT", subtotal: 200, taxAmount: 38.5, discount: 10, shippingCost: 15, total: 243.5, lines: [sourceLine] })
    const tx = {
      purchaseOrder: { update: jest.fn().mockResolvedValue(source), findUnique: jest.fn().mockResolvedValue(source) },
      purchaseOrderLine: { findMany: jest.fn().mockResolvedValue([sourceLine]), update: jest.fn().mockResolvedValue(sourceLine), create: jest.fn(), delete: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-roundtrip" }) },
    }
    mockDb.purchaseOrder.findFirst.mockResolvedValue(source)
    mockDb.supplier.findFirst.mockResolvedValue({ id: source.supplier.id })
    mockDb.location.findFirst.mockResolvedValue({ id: source.locationId })
    mockDb.item.findMany.mockResolvedValue([{ id: sourceLine.itemId }])
    mockDb.$transaction.mockImplementation(async (handler) => handler(tx))
    const input = purchaseOrderEditPayload(source as never, "org-1", purchaseOrderEditDefaults(source as never))
    await updatePurchaseOrder({ ...input, updatedById: "editor-1" })
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ subtotal: 200, taxAmount: 38.5, discount: 10, shippingCost: 15, total: 243.5 }) }))
    expect(tx.purchaseOrderLine.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ orderedQuantity: 2, unitCost: 100, taxRate: 19.25, taxAmount: 38.5, discount: 10, lineTotal: 228.5, notes: "Original supplier note" }) }))
  })
})
`);
