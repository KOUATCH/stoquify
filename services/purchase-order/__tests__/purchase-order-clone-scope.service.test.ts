import { clonePurchaseOrder, createPurchaseOrderInTx } from "../purchase-order.service"
import { db } from "@/prisma/db"

jest.mock("@/prisma/db", () => ({ db: { purchaseOrder: { findFirst: jest.fn() }, $transaction: jest.fn() } }))
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }))
jest.mock("@/services/modules/module-admission.service", () => ({ assertModuleNewWorkInTx: jest.fn() }))
jest.mock("../purchase-document-number.service", () => ({
  allocatePurchaseDocumentNumber: jest.fn().mockResolvedValue("PO-CLONED-1"),
  PURCHASE_DOCUMENT_TYPE: { PURCHASE_ORDER: "PURCHASE_ORDER" },
}))
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(), markBusinessEventAppliedInTx: jest.fn(), recordBusinessEventInTx: jest.fn(),
}))
jest.mock("@/services/inventory/inventory-stock-event.service", () => ({ postGoodsReceiptStock: jest.fn() }))
import { allocatePurchaseDocumentNumber } from "../purchase-document-number.service"

const source = {
  id: "source-po", organizationId: "org-1", orderNumber: "PO-SOURCE", status: "APPROVED",
  supplierId: "supplier-1", locationId: "location-1", supplier: { id: "supplier-1", name: "Supplier" },
  location: { id: "location-1", name: "Store" }, organization: { id: "org-1" },
  orderDate: new Date("2026-09-01"), expectedDeliveryDate: new Date("2026-10-01"), createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"), notes: "Source delivery instructions", paymentTerms: "Net 30", shippingCost: 15,
  subtotal: 200, taxAmount: 38.5, discount: 10, total: 243.5,
  lines: [{ id: "line-1", itemId: "item-1", orderedQuantity: 2, receivedQuantity: 1, unitCost: 100, taxRate: 19.25, taxAmount: 38.5, discount: 10, lineTotal: 228.5, notes: "Retained quoted note", item: { id: "item-1", nameEn: "Widget", sku: "W1" } }],
}
const clone = { ...source, id: "cloned-po", orderNumber: "PO-CLONED-1", status: "DRAFT" }
function transaction() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([]),
    supplier: { findFirst: jest.fn().mockResolvedValue({ id: "supplier-1" }) },
    location: { findFirst: jest.fn().mockResolvedValue({ id: "location-1" }) },
    item: { findMany: jest.fn().mockResolvedValue([{ id: "item-1" }]) },
    purchaseOrder: { create: jest.fn().mockResolvedValue(clone), update: jest.fn().mockResolvedValue(clone), findUnique: jest.fn().mockResolvedValue(clone) },
    purchaseOrderLine: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue(source.lines) },
  }
}
let tx: ReturnType<typeof transaction>
beforeEach(() => {
  jest.clearAllMocks()
  tx = transaction()
  ;(db.purchaseOrder.findFirst as jest.Mock).mockResolvedValue(source)
  ;(db.$transaction as jest.Mock).mockImplementation((handler) => handler(tx))
})

describe("purchase-order creation inside the durable receipt transaction", () => {
  const input = { organizationId: "org-1", createdById: "buyer-1", supplierId: "supplier-1", locationId: "location-1", date: "2026-10-04", expectedDeliveryDate: "2026-10-05", orderLines: [{ itemId: "item-1", quantity: 2, unitPrice: 10 }] }
  it.each(["supplier", "location"] as const)("requires a current active tenant %s before allocating a number", async kind => {
    tx[kind].findFirst.mockResolvedValue(null)
    await expect(createPurchaseOrderInTx(tx as never, input)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx[kind].findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", isActive: true, deletedAt: null }) }))
    expect(allocatePurchaseDocumentNumber).not.toHaveBeenCalled(); expect(tx.purchaseOrder.create).not.toHaveBeenCalled()
  })
  it("rejects unavailable items before numbering and creating the order", async () => {
    tx.item.findMany.mockResolvedValue([])
    await expect(createPurchaseOrderInTx(tx as never, input)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx.item.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", isActive: true, deletedAt: null }) }))
    expect(allocatePurchaseDocumentNumber).not.toHaveBeenCalled()
  })
  it("keeps reference locks, numbering and creation in the caller's transaction", async () => {
    await createPurchaseOrderInTx(tx as never, input)
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(tx.$queryRaw).toHaveBeenCalledTimes(3)
    expect(allocatePurchaseDocumentNumber).toHaveBeenCalledWith(tx, { organizationId: "org-1", documentType: "PURCHASE_ORDER" })
    expect(tx.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT", createdById: "buyer-1" }) }))
  })
})
describe("clone purchase-order current tenant references", () => {
  it.each([
    ["supplier", { supplierId: "foreign-supplier" }],
    ["location", { locationId: "foreign-location" }],
  ] as const)("rejects a foreign %s override before numbering or order writes", async (kind, overrides) => {
    tx[kind].findFirst.mockResolvedValue(null)
    await expect(clonePurchaseOrder({ id: source.id, organizationId: "org-1", overrides }, "buyer-1")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(allocatePurchaseDocumentNumber).not.toHaveBeenCalled()
    expect(tx.purchaseOrder.create).not.toHaveBeenCalled()
    expect(tx.purchaseOrderLine.createMany).not.toHaveBeenCalled()
  })

  it.each(["supplier", "location"] as const)("revalidates an inherited %s against active nondeleted tenant records", async (kind) => {
    tx[kind].findFirst.mockResolvedValue(null)
    await expect(clonePurchaseOrder({ id: source.id, organizationId: "org-1" }, "buyer-1")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx[kind].findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: kind === "supplier" ? "supplier-1" : "location-1", organizationId: "org-1", isActive: true, deletedAt: null } }))
    expect(tx.purchaseOrder.create).not.toHaveBeenCalled()
  })

  it("rejects copied items unavailable in the tenant active catalogue before creating the clone", async () => {
    tx.item.findMany.mockResolvedValue([])
    await expect(clonePurchaseOrder({ id: source.id, organizationId: "org-1" }, "buyer-1")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(tx.item.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["item-1"] }, organizationId: "org-1", isActive: true, deletedAt: null } }))
    expect(tx.purchaseOrder.create).not.toHaveBeenCalled()
  })

  it("clones allowed current references with intact quoted amounts and zero received quantities", async () => {
    await clonePurchaseOrder({ id: source.id, organizationId: "org-1", overrides: { shippingCost: 0 } }, "buyer-1")
    expect(tx.supplier.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "supplier-1", organizationId: "org-1", isActive: true, deletedAt: null } }))
    expect(tx.location.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "location-1", organizationId: "org-1", isActive: true, deletedAt: null } }))
    expect(tx.purchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "org-1", supplierId: "supplier-1", locationId: "location-1", createdById: "buyer-1", status: "DRAFT", shippingCost: 0, notes: "Source delivery instructions" }) }))
    expect(tx.purchaseOrderLine.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ purchaseOrderId: "cloned-po", taxRate: 19.25, taxAmount: 38.5, discount: 10, notes: "Retained quoted note", receivedQuantity: 0 })] })
  })
})
