import {
  approveTransfer,
  createLocationTransfer,
  getInventoryTransactionsMovement,
  getStockMovementSummary,
  getTransfers,
} from "../inventoryMovementActions"
import { requirePermission } from "@/lib/security/rbac"
import {
  getStockMovementSummary as readStockMovementSummary,
  listInventoryTransactionMovements,
  listStockTransfers,
} from "@/services/inventory/inventory-read.service"
import { createStockTransfer, postStockTransfer } from "@/services/inventory/inventory-transfer.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

jest.mock("@/lib/error-handling", () => ({
  inventoryAction: (handler: unknown) => handler,
}))

jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-transfer.service", () => ({
  createStockTransfer: jest.fn(),
  postStockTransfer: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-read.service", () => ({
  getStockMovementSummary: jest.fn(),
  listInventoryTransactionMovements: jest.fn(),
  listStockTransfers: jest.fn(),
  toLocationTransferDTO: jest.fn((value: unknown) => value),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/inventory/inventory-stock-event.service", () => ({
  postInventoryReservation: jest.fn(),
}))

jest.mock("@/lib/auth-server", () => ({
  getAuthenticatedUser: jest.fn(),
}))

jest.mock("@/prisma/db", () => ({
  db: {
    stockTransfer: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    inventoryTransaction: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

const mockRequirePermission = requirePermission as jest.Mock
const mockCreateStockTransfer = createStockTransfer as jest.Mock
const mockPostStockTransfer = postStockTransfer as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockListStockTransfers = listStockTransfers as jest.Mock
const mockListInventoryTransactionMovements = listInventoryTransactionMovements as jest.Mock
const mockReadStockMovementSummary = readStockMovementSummary as jest.Mock

const transfer = {
  id: "transfer-1",
  transferNumber: "TR-000001",
  status: "DRAFT",
  transferDate: new Date("2026-06-16T10:00:00Z"),
  expectedDate: null,
  actualDate: null,
  approvedAt: null,
  notes: "",
  organizationId: "org-session",
  fromLocationId: "loc-source",
  toLocationId: "loc-dest",
  createdById: "user-session",
  approvedById: null,
  createdBy: null,
  approvedBy: null,
  fromLocation: { id: "loc-source", name: "Warehouse" },
  toLocation: { id: "loc-dest", name: "Shop" },
  lines: [
    {
      id: "line-1",
      itemId: "item-1",
      requestedQuantity: 5,
      shippedQuantity: 0,
      receivedQuantity: 0,
      unitCost: 100,
      item: {
        id: "item-1",
        sku: "SKU-1",
        nameEn: "Item 1",
        nameFr: null,
        descriptionEn: null,
        costPrice: 100,
        trackSerialNumbers: false,
        trackBatches: false,
        trackExpiry: false,
      },
    },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequirePermission.mockResolvedValue({
    orgId: "org-session",
    userId: "user-session",
    permissions: ["inventory.stock.transfer"],
  })
  mockCreateStockTransfer.mockResolvedValue({ transfer })
  mockPostStockTransfer.mockResolvedValue({
    transfer: {
      ...transfer,
      status: "COMPLETED",
      approvedById: "user-session",
    },
    replayed: false,
  })
  mockObserveModuleAccess.mockResolvedValue({ allowed: true })
  mockListStockTransfers.mockResolvedValue([])
  mockListInventoryTransactionMovements.mockResolvedValue([])
  mockReadStockMovementSummary.mockResolvedValue({ transactionCount: 0 })
})

describe("inventory movement transfer actions", () => {
  it("creates transfers through the service using the RBAC tenant and actor", async () => {
    const result = await createLocationTransfer({
      data: {
        organizationId: "client-org",
        createdById: "client-user",
        fromLocationId: "loc-source",
        toLocationId: "loc-dest",
        notes: "Move stock",
        lines: [{ itemId: "item-1", requestedQuantity: 5 }],
      },
    })

    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.stock.transfer", {
      resource: "StockTransfer",
      auditAllowed: true,
    })
    expect(mockCreateStockTransfer).toHaveBeenCalledWith({
      organizationId: "org-session",
      createdById: "user-session",
      fromLocationId: "loc-source",
      toLocationId: "loc-dest",
      requestedDate: undefined,
      notes: "Move stock",
      lines: [{ itemId: "item-1", requestedQuantity: 5 }],
    })
    expect(result.success).toBe(true)
    expect(result.data.transfer.organizationId).toBe("org-session")
  })

  it("approves transfers through the posting service using the RBAC tenant and approver", async () => {
    const result = await approveTransfer({
      transferId: "transfer-1",
      organizationId: "client-org",
      approvedById: "client-user",
    })

    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.stock.transfer", {
      resource: "StockTransfer",
      resourceId: "transfer-1",
      auditAllowed: true,
    })
    expect(mockPostStockTransfer).toHaveBeenCalledWith({
      transferId: "transfer-1",
      organizationId: "org-session",
      approvedById: "user-session",
    })
    expect(result.success).toBe(true)
    expect(result.data.message).toContain("approved and completed")
  })
})

describe("inventory history read authorization", () => {
  it("uses RBAC tenant scope and enforced inventory entitlement for every history read", async () => {
    await getTransfers({ organizationId: "org-session" })
    await getInventoryTransactionsMovement({ organizationId: "org-session" })
    await getStockMovementSummary({ organizationId: "org-session" })

    expect(mockRequirePermission).toHaveBeenNthCalledWith(1, "inventory.levels.read", {
      resource: "StockTransferHistory",
      auditAllowed: true,
    })
    expect(mockRequirePermission).toHaveBeenNthCalledWith(2, "inventory.levels.read", {
      resource: "InventoryTransactionHistory",
      auditAllowed: true,
    })
    expect(mockRequirePermission).toHaveBeenNthCalledWith(3, "inventory.levels.read", {
      resource: "InventoryTransactionHistorySummary",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledTimes(3)
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        moduleSlug: "inventory",
        mode: "enforce",
        accessIntent: "read",
      }),
    )
    expect(mockListStockTransfers).toHaveBeenCalledWith({
      organizationId: "org-session",
      filters: undefined,
    })
    expect(mockListInventoryTransactionMovements).toHaveBeenCalledWith({
      organizationId: "org-session",
      filters: undefined,
    })
    expect(mockReadStockMovementSummary).toHaveBeenCalledWith({
      organizationId: "org-session",
      filters: {
        itemId: undefined,
        locationId: undefined,
        dateFrom: undefined,
        dateTo: undefined,
      },
    })
  })

  it("does not call history services when permission is denied", async () => {
    mockRequirePermission.mockRejectedValueOnce(new Error("permission denied"))

    await expect(getInventoryTransactionsMovement({ organizationId: "org-session" })).rejects.toThrow(
      "permission denied",
    )

    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListInventoryTransactionMovements).not.toHaveBeenCalled()
  })

  it("rejects caller organization mismatch before reading history", async () => {
    await expect(getInventoryTransactionsMovement({ organizationId: "other-org" })).rejects.toThrow(
      "Organization mismatch",
    )

    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListInventoryTransactionMovements).not.toHaveBeenCalled()
  })

  it("does not call history services when the inventory module is unavailable", async () => {
    mockObserveModuleAccess.mockResolvedValueOnce({ allowed: false })

    await expect(getInventoryTransactionsMovement({ organizationId: "org-session" })).rejects.toThrow(
      "Inventory module is not available",
    )

    expect(mockListInventoryTransactionMovements).not.toHaveBeenCalled()
  })
})
