import { db } from "@/prisma/db"

import { getAnalytics } from "../purchase-order.service"

jest.mock("@/prisma/db", () => ({
  db: {
    purchaseOrder: {
      findMany: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
    },
  },
}))

const mockDb = db as unknown as {
  purchaseOrder: {
    findMany: jest.Mock
  }
  organization: {
    findFirst: jest.Mock
  }
}

function line({
  id,
  sku,
  ordered,
  received,
  unitCost,
}: {
  id: string
  sku: string
  ordered: number
  received: number
  unitCost: number
}) {
  return {
    orderedQuantity: ordered,
    receivedQuantity: received,
    unitCost,
    lineTotal: ordered * unitCost,
    item: {
      id,
      sku,
      nameEn: `Item ${sku}`,
      nameFr: null,
    },
  }
}

describe("purchase-order analytics read model", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-14T12:00:00.000Z"))
    mockDb.organization.findFirst.mockResolvedValue({ currency: "xaf" })
    mockDb.purchaseOrder.findMany.mockResolvedValue([
      {
        id: "po-complete",
        orderNumber: "PO-0001",
        status: "COMPLETED",
        orderDate: new Date("2026-07-01T00:00:00.000Z"),
        expectedDeliveryDate: new Date("2026-07-10T00:00:00.000Z"),
        actualDeliveryDate: new Date("2026-07-09T00:00:00.000Z"),
        createdAt: new Date("2026-07-01T08:00:00.000Z"),
        updatedAt: new Date("2026-07-09T12:00:00.000Z"),
        approvedAt: new Date("2026-07-02T08:00:00.000Z"),
        total: 1000,
        supplier: { id: "supplier-a", name: "Atlas Supply", code: "ATL" },
        location: { id: "location-a", name: "Main warehouse" },
        lines: [line({ id: "item-a", sku: "SKU-A", ordered: 10, received: 10, unitCost: 100 })],
        goodsReceipts: [{
          receiptDate: new Date("2026-07-09T00:00:00.000Z"),
          createdAt: new Date("2026-07-09T00:00:00.000Z"),
          status: "POSTED",
        }],
      },
      {
        id: "po-overdue",
        orderNumber: "PO-0002",
        status: "SUBMITTED",
        orderDate: new Date("2026-07-20T00:00:00.000Z"),
        expectedDeliveryDate: new Date("2026-07-25T00:00:00.000Z"),
        actualDeliveryDate: null,
        createdAt: new Date("2026-07-20T08:00:00.000Z"),
        updatedAt: new Date("2026-07-20T08:00:00.000Z"),
        approvedAt: null,
        total: 600,
        supplier: { id: "supplier-b", name: "Beta Trading", code: "BET" },
        location: { id: "location-a", name: "Main warehouse" },
        lines: [line({ id: "item-b", sku: "SKU-B", ordered: 6, received: 2, unitCost: 100 })],
        goodsReceipts: [],
      },
    ])
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it("derives tenant-scoped purchasing, receipt, delivery, and exception metrics", async () => {
    const result = await getAnalytics({
      organizationId: "org-1",
      from: "2026-07-01",
      to: "2026-08-14",
      topSuppliersLimit: 8,
    })

    expect(mockDb.purchaseOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-1",
        deletedAt: null,
        orderDate: {
          gte: new Date("2026-07-01T00:00:00.000Z"),
          lte: new Date("2026-08-14T23:59:59.999Z"),
        },
      }),
    }))
    expect(result.currency).toBe("XAF")
    expect(result.totals).toEqual(expect.objectContaining({
      orders: 2,
      activeOrders: 2,
      totalSpend: 1600,
      averageOrderValue: 800,
      openCommitmentValue: 400,
      overdueOrders: 1,
      overdueValue: 400,
      orderedUnits: 16,
      receivedUnits: 12,
      receiptRate: 75,
      completionRate: 50,
      onTimeRate: 100,
      onTimeSampleSize: 1,
      supplierConcentrationRate: 62.5,
    }))
    expect(result.totals.approvalCycle).toEqual({
      averageHours: 24,
      medianHours: 24,
      p90Hours: 24,
      sampleSize: 1,
    })
    expect(result.supplierPerformance.map(supplier => supplier.name)).toEqual([
      "Atlas Supply",
      "Beta Trading",
    ])
    expect(result.locationPerformance[0]).toEqual(expect.objectContaining({
      name: "Main warehouse",
      totalSpend: 1600,
      openCommitmentValue: 400,
      receiptRate: 75,
    }))
    expect(result.itemPerformance).toHaveLength(2)
    expect(result.exceptions[0]).toEqual(expect.objectContaining({
      id: "po-overdue",
      issue: "OVERDUE",
      risk: "high",
      openCommitmentValue: 400,
    }))
    expect(result.dataQuality).toEqual({
      expectedDeliveryCoverage: 100,
      approvalEvidenceCoverage: 100,
      deliveryEvidenceCoverage: 100,
      expectedDeliverySampleSize: 2,
      approvalEvidenceSampleSize: 1,
      deliveryEvidenceSampleSize: 1,
    })
  })
})
