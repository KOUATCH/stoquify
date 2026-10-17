import { Prisma } from "@prisma/client";
import { createStockAdjustment, postStockAdjustment } from "../inventory-adjustment.service";

jest.mock("@/prisma/db", () => ({ db: {} }));
jest.mock("@/services/modules/module-inventory-continuation.service", () => ({ assertStockAdjustmentAdmissionInTx: jest.fn() }));
jest.mock("@/services/accounting/periods.service", () => ({ getOpenPeriodForDate: jest.fn(async () => ({ id: "period" })) }));
jest.mock("@/services/accounting/posting.service", () => ({ createLedgerPostingBatch: jest.fn(async () => ({ id: "batch" })) }));
jest.mock("@/services/accounting/posting-rules.service", () => ({ getActivePostingRule: jest.fn(async () => null) }));
jest.mock("../inventory-close-invalidation.service", () => ({ recordInventoryValuationCloseInvalidationInTx: jest.fn() }));
jest.mock("@/services/events/business-event.service", () => ({
  hashBusinessPayload: jest.fn(() => "test-document-hash"),
  recordBusinessEventInTx: jest.fn(async () => ({ event: { id: "event" } })),
  markBusinessEventAppliedInTx: jest.fn(),
}));

const decimal = (value: number) => new Prisma.Decimal(value);
const expiryDate = new Date("2027-03-26T00:00:00Z");
const metadata = { seedSource: "local-fixture", inventoryTraceability: { batchNumber: "SYN-LOT-001", expiryDate: expiryDate.toISOString() } };

it("carries submitted batch/expiry through the source line into the first immutable movement", async () => {
  const sourceLine = {
    id: "line", itemId: "item", adjustedQuantity: decimal(5), systemQuantity: decimal(10), actualQuantity: decimal(15), unitCost: decimal(20), totalCost: decimal(100), metadata,
    item: { id: "item", sku: "JUICE", organizationId: "org", isActive: true, isDiscontinued: false, deletedAt: null, trackInventory: true, costPrice: decimal(20) },
  };
  const adjustment = { id: "adjustment", organizationId: "org", locationId: "location", adjustmentNumber: "ADJ-001", type: "OTHER", status: "DRAFT", createdById: "maker", reason: "Synthetic replenishment", adjustmentDate: new Date("2026-09-27T00:00:00Z"), location: { organizationId: "org", isActive: true, deletedAt: null, allowNegativeStock: false }, lines: [sourceLine] };
  const level = { id: "level", itemId: "item", locationId: "location", quantityOnHand: decimal(10), quantityAvailable: decimal(9), quantityReserved: decimal(1), averageCost: decimal(20), totalValue: decimal(200), version: 1 };
  const tx = {
    location: { findFirst: jest.fn(async () => ({ id: "location" })) },
    item: { findMany: jest.fn(async () => [{ id: "item", costPrice: decimal(20) }]) },
    inventoryLevel: { findMany: jest.fn(async () => [level]), findUnique: jest.fn(async () => level), updateMany: jest.fn(async () => ({ count: 1 })) },
    stockAdjustment: { count: jest.fn(async () => 0), create: jest.fn(async () => adjustment), findFirst: jest.fn(async () => adjustment), update: jest.fn(async () => adjustment) },
    stockAdjustmentLine: { update: jest.fn(async () => sourceLine) },
    inventoryTransaction: { create: jest.fn(async () => ({ id: "movement" })) },
    businessEvent: { findUnique: jest.fn(async () => null) },
    ledgerPostingBatch: { update: jest.fn(async () => ({ id: "batch" })) },
    ledgerAuditEvent: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  await createStockAdjustment({ organizationId: "org", locationId: "location", createdById: "maker", type: "OTHER", reason: "Synthetic replenishment", lines: [{ itemId: "item", adjustedQuantity: "5", batchNumber: "SYN-LOT-001", expiryDate, metadata: { seedSource: "local-fixture" } }] }, tx as never);
  expect(tx.stockAdjustment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lines: { create: [expect.objectContaining({ metadata })] } }) }));
  await postStockAdjustment({ organizationId: "org", adjustmentId: "adjustment", approvedById: "checker" }, tx as never);
  expect(tx.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ batchNumber: "SYN-LOT-001", expiryDate, quantity: decimal(5), totalCost: decimal(100) }) }));
  expect(tx.stockAdjustmentLine.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining(metadata) }) }));
});
