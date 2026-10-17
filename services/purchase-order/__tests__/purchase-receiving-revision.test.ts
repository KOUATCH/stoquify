import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { receiveItems, resolveGoodsReceiptInspection } from "../purchase-order.service"
import { confirmPurchaseReceiving, getPurchaseReceivingWorkbench, previewPurchaseReceiving } from "../purchase-receiving-workbench.service"
import type { PurchaseReceivingDraft } from "../purchase-receiving-contracts"
import { readReceiptRecognitionEvidence, readReceiptRecognitionSource } from "../receipt-recognition-source"

jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
jest.mock("../purchase-order.service", () => ({ receiveItems: jest.fn(), resolveGoodsReceiptInspection: jest.fn() }))
jest.mock("../receipt-recognition-source", () => ({ readReceiptRecognitionEvidence: jest.fn(), readReceiptRecognitionSource: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn().mockResolvedValue({ allowed: true }) }))
jest.mock("../purchase-receiving-authority", () => ({
  ...jest.requireActual("../purchase-receiving-authority"),
  purchaseReceivingAuthority: jest.fn().mockResolvedValue({ fresh: true, canReceive: true, canReviewAccounting: true }),
}))

const scope = { organizationId: "org", actorId: "receiver", sessionId: "session", sessionToken: "session-token" }
const draft: PurchaseReceivingDraft = { kind: "receive", orderId: "order", inspectionOutcome: "PASSED", items: [{ lineId: "line", receivedQuantity: 1 }] }
const at = new Date("2026-09-30T09:00:00.000Z")
const decimal = (value: number) => new Prisma.Decimal(value)

function fixture() {
  const item = { id: "item", organizationId: "org", nameEn: "Goods", nameFr: "Marchandises", isActive: true, deletedAt: null, trackInventory: true, trackBatches: false, trackSerialNumbers: false, trackExpiry: false }
  const location = { id: "location", name: "Warehouse", isActive: true, deletedAt: null, updatedAt: at }
  const order = {
    id: "order", organizationId: "org", orderNumber: "PO-1", status: "APPROVED", orderDate: at, expectedDeliveryDate: null,
    supplierId: "supplier", supplier: { id: "supplier", name: "Supplier" }, locationId: "location", location,
    organization: { currency: "XAF" }, paymentTerms: null, notes: null, shippingCost: decimal(0), subtotal: decimal(100), taxAmount: decimal(0), discount: decimal(0), total: decimal(100), updatedAt: at, deletedAt: null,
    lines: [{ id: "line", itemId: "item", item, orderedQuantity: decimal(10), receivedQuantity: decimal(0), unitCost: decimal(10), discount: decimal(0), taxRate: decimal(0), taxAmount: decimal(0), lineTotal: decimal(100), notes: null }],
  }
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    purchaseOrder: { findFirst: jest.fn().mockResolvedValue(order) },
    goodsReceiptLine: { groupBy: jest.fn().mockResolvedValue([]) },
    location: { findFirst: jest.fn().mockResolvedValue(location) },
    businessEvent: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    inventoryTransaction: { findMany: jest.fn().mockResolvedValue([]) },
    ledgerPostingBatch: { findMany: jest.fn().mockResolvedValue([]) },
    goodsReceipt: { findMany: jest.fn().mockResolvedValue([]) },
  }
  ;(db.$transaction as jest.Mock).mockImplementation((fn: (value: typeof tx) => unknown) => fn(tx))
  return { tx, item, order }
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue(null)
})

it("invalidates a reviewed receipt when inventory tracking changes, before receiving effects", async () => {
  const { item } = fixture()
  const reviewed = await previewPurchaseReceiving(draft, scope)
  item.trackInventory = false
  const current = await previewPurchaseReceiving(draft, scope)
  expect(current.revision).not.toBe(reviewed.revision)
  await expect(confirmPurchaseReceiving({ draft, expectedRevision: reviewed.revision, idempotencyKey: "tracking-change-1" }, scope))
    .rejects.toThrow("The reviewed receiving information changed")
  expect(receiveItems).not.toHaveBeenCalled()
  expect(resolveGoodsReceiptInspection).not.toHaveBeenCalled()
})

it("takes the supplier lock before the order lock even when a stale confirmation is rejected", async () => {
  const { tx } = fixture()
  await expect(confirmPurchaseReceiving({ draft, expectedRevision: "a".repeat(64), idempotencyKey: "stale-order-lock-1" }, scope))
    .rejects.toThrow("The reviewed receiving information changed")
  const queries = tx.$queryRaw.mock.calls.map(([query]) => (query as TemplateStringsArray).join("?"))
  expect(queries[0]).toContain("FROM suppliers s JOIN purchase_orders")
  expect(queries[1]).toContain("SELECT id FROM purchase_orders")
  expect(receiveItems).not.toHaveBeenCalled()
})

it("invalidates a receipt preview when its currency changes before confirmation", async () => {
  const { order } = fixture()
  const reviewed = await previewPurchaseReceiving(draft, scope)
  order.organization.currency = "EUR"
  await expect(confirmPurchaseReceiving({ draft, expectedRevision: reviewed.revision, idempotencyKey: "currency-change-1" }, scope))
    .rejects.toThrow("The reviewed receiving information changed")
  expect(receiveItems).not.toHaveBeenCalled()
})

it.each(["USD", null])("binds history currency to retained source evidence (%s), without substituting current currency", async retainedCurrency => {
  const { tx, order } = fixture()
  order.organization.currency = "EUR"
  tx.goodsReceipt.findMany.mockResolvedValue([{
    id: "receipt", receiptNumber: "GR-1", receiptDate: at, status: "RECEIVED", locationId: "location", location: { name: "Warehouse" },
    receivedBy: { name: "Receiver", firstName: null, lastName: null }, inspection: null, inspectionResolution: null, inventoryPostedAt: at,
    lines: [{ itemId: "item", receivedQuantity: decimal(1), unitCost: decimal(10), lineTotal: decimal(10), batchNumber: null, expiryDate: null, serialNumbers: [] }],
  }])
  if (retainedCurrency) {
    ;(readReceiptRecognitionSource as jest.Mock).mockResolvedValue({ manifest: { currency: retainedCurrency, lines: [{ stockTracked: true }] } })
    ;(readReceiptRecognitionEvidence as jest.Mock).mockResolvedValue({ stockVerified: true, accountingStatus: "POSTED" })
  }
  const result = await getPurchaseReceivingWorkbench("order", scope)
  expect(result.currency).toBe("EUR")
  expect(result.receipts[0].currency).toBe(retainedCurrency)
  expect(result.receipts[0].accountingStatus).toBe(retainedCurrency ? "posted" : "unverified")
})
