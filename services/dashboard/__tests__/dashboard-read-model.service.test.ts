jest.mock('@/prisma/db', () => ({
  db: {
    organization: { findFirst: jest.fn() },
    salesOrder: { aggregate: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    payment: { aggregate: jest.fn() },
    customer: { count: jest.fn() },
    location: { count: jest.fn(), findMany: jest.fn() },
    pOSSession: { count: jest.fn() },
    purchaseOrder: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn() },
    item: { count: jest.fn(), findMany: jest.fn() },
    salesOrderLine: { groupBy: jest.fn() },
    inventoryTransaction: { findMany: jest.fn() },
  },
}))

import { db } from '@/prisma/db'
import {
  LocationType,
  PurchaseOrderStatus,
  SalesOrderStatus,
  TransactionType,
} from '@prisma/client'
import { getAllDashboardData, getDashboardMetrics, type DashboardReadModelContext } from '../dashboard-read-model.service'

const mockDb = db as unknown as {
  organization: { findFirst: jest.Mock }
  salesOrder: { aggregate: jest.Mock; count: jest.Mock; findMany: jest.Mock }
  payment: { aggregate: jest.Mock }
  customer: { count: jest.Mock }
  location: { count: jest.Mock; findMany: jest.Mock }
  pOSSession: { count: jest.Mock }
  purchaseOrder: { count: jest.Mock; aggregate: jest.Mock; findMany: jest.Mock }
  item: { count: jest.Mock; findMany: jest.Mock }
  salesOrderLine: { groupBy: jest.Mock }
  inventoryTransaction: { findMany: jest.Mock }
}

const context: DashboardReadModelContext = {
  organizationId: 'org-1',
  actorId: 'user-1',
  actorPermissions: ['dashboard.read'],
  isSuperUser: false,
}

function decimal(value: number) {
  return { toNumber: () => value }
}

function seedDashboardQueries(options: { empty?: boolean } = {}) {
  const empty = options.empty ?? false

  mockDb.organization.findFirst.mockResolvedValue({ id: 'org-1', name: 'Tenant One', currency: 'XAF' })
  mockDb.salesOrder.aggregate
    .mockResolvedValueOnce({ _sum: { total: decimal(empty ? 0 : 1000) }, _count: empty ? 0 : 4 })
    .mockResolvedValueOnce({ _sum: { total: decimal(empty ? 0 : 500) }, _count: empty ? 0 : 2 })
  mockDb.payment.aggregate
    .mockResolvedValueOnce({ _sum: { amount: decimal(empty ? 0 : 800) }, _count: empty ? 0 : 4 })
    .mockResolvedValueOnce({ _sum: { amount: decimal(empty ? 0 : 400) }, _count: empty ? 0 : 2 })
  mockDb.customer.count
    .mockResolvedValueOnce(empty ? 0 : 10)
    .mockResolvedValueOnce(empty ? 0 : 8)
    .mockResolvedValueOnce(empty ? 0 : 2)
  mockDb.location.count.mockResolvedValue(empty ? 0 : 1)
  mockDb.pOSSession.count.mockResolvedValue(empty ? 0 : 1)
  mockDb.salesOrder.count.mockResolvedValue(empty ? 0 : 2)
  mockDb.purchaseOrder.count.mockResolvedValue(empty ? 0 : 1)
  mockDb.purchaseOrder.aggregate.mockResolvedValue({ _sum: { total: decimal(empty ? 0 : 250) } })
  mockDb.item.count.mockResolvedValue(empty ? 0 : 2)
  mockDb.item.findMany
    .mockResolvedValueOnce(
      empty
        ? []
        : [
            {
              id: 'item-1',
              sku: 'SKU-1',
              nameEn: 'Coffee',
              nameFr: 'Cafe',
              minStockLevel: decimal(10),
              maxStockLevel: decimal(100),
              reorderLevel: decimal(8),
              inventoryLevels: [
                {
                  quantityOnHand: decimal(5),
                  quantityReserved: decimal(1),
                  quantityAvailable: decimal(4),
                  totalValue: decimal(75),
                },
              ],
            },
          ],
    )
    .mockResolvedValueOnce(
      empty
        ? []
        : [
            {
              id: 'item-1',
              sku: 'SKU-1',
              nameEn: 'Coffee',
              category: { titleEn: 'Beverages' },
              inventoryLevels: [{ quantityOnHand: decimal(5) }],
            },
          ],
    )
  mockDb.salesOrder.findMany
    .mockResolvedValueOnce(
      empty
        ? []
        : [
            {
              orderDate: new Date('2026-06-18T09:00:00.000Z'),
              total: decimal(1000),
            },
          ],
    )
    .mockResolvedValueOnce(
      empty
        ? []
        : [
            {
              id: 'sale-1',
              orderNumber: 'SO-001',
              status: SalesOrderStatus.COMPLETED,
              total: decimal(1000),
              orderDate: new Date('2026-06-18T09:00:00.000Z'),
              customer: { name: 'Customer One' },
            },
          ],
    )
  mockDb.salesOrderLine.groupBy.mockResolvedValue(
    empty
      ? []
      : [
          {
            itemId: 'item-1',
            _sum: { quantity: decimal(3), lineTotal: decimal(300) },
          },
        ],
  )
  mockDb.location.findMany.mockResolvedValue(
    empty
      ? []
      : [
          {
            id: 'loc-1',
            name: 'Main Store',
            type: LocationType.STORE,
            salesOrders: [{ status: SalesOrderStatus.COMPLETED, total: decimal(1000) }],
            inventoryLevels: [{ totalValue: decimal(75) }],
          },
        ],
  )
  mockDb.purchaseOrder.findMany.mockResolvedValue(
    empty
      ? []
      : [
          {
            id: 'po-1',
            orderNumber: 'PO-001',
            status: PurchaseOrderStatus.SUBMITTED,
            total: decimal(250),
            orderDate: new Date('2026-06-18T08:00:00.000Z'),
            supplier: { name: 'Supplier One' },
          },
        ],
  )
  mockDb.inventoryTransaction.findMany.mockResolvedValue(
    empty
      ? []
      : [
          {
            id: 'txn-1',
            type: TransactionType.SALE,
            quantity: decimal(3),
            createdAt: new Date('2026-06-18T10:00:00.000Z'),
            item: { nameEn: 'Coffee', nameFr: 'Cafe' },
            location: { name: 'Main Store' },
          },
        ],
  )
}

describe('dashboard read-model service', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-18T12:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('builds the dashboard DTO from tenant-scoped service-owned queries', async () => {
    seedDashboardQueries()

    const result = await getAllDashboardData({
      context,
      filters: { period: '7d', locationId: 'loc-1' },
    })

    expect(mockDb.organization.findFirst).toHaveBeenCalledWith({
      where: { id: 'org-1', deletedAt: null, isActive: true },
      select: { id: true, name: true, currency: true },
    })
    expect(mockDb.salesOrder.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', locationId: 'loc-1' }),
      }),
    )
    expect(mockDb.item.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', deletedAt: null, isActive: true }),
        select: expect.objectContaining({
          inventoryLevels: expect.objectContaining({ where: { locationId: 'loc-1' } }),
        }),
      }),
    )
    expect(mockDb.item.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: { in: ['item-1'] }, organizationId: 'org-1' },
      }),
    )
    expect(result).toMatchObject({
      organization: { id: 'org-1', name: 'Tenant One', currency: 'XAF' },
      period: { key: '7d' },
      filters: { locationId: 'loc-1' },
      generatedAt: '2026-06-18T12:00:00.000Z',
      kpis: {
        revenue: { current: 1000, previous: 500, change: 100 },
        orders: { current: 4, previous: 2, change: 100 },
        customers: { current: 10, previous: 8, change: 25 },
        averageOrderValue: { current: 250, previous: 250, change: 0 },
        cashCollected: { current: 800, previous: 400, change: 100 },
      },
      stockHealth: {
        trackedItems: 1,
        lowStock: 1,
        availableUnits: 4,
        reservedUnits: 1,
      },
      topProducts: [
        {
          id: 'item-1',
          name: 'Coffee',
          sku: 'SKU-1',
          category: 'Beverages',
          quantitySold: 3,
          revenue: 300,
          stockOnHand: 5,
        },
      ],
      locations: [
        {
          id: 'loc-1',
          name: 'Main Store',
          revenue: 1000,
          orders: 1,
          inventoryValue: 75,
        },
      ],
      counts: {
        activeLocations: 1,
        activeSessions: 1,
        pendingPurchaseOrders: 1,
        openSalesOrders: 2,
        totalCustomers: 10,
        totalItems: 2,
      },
    })
    expect(result.activities[0]).toEqual(expect.objectContaining({
      id: 'inventory-txn-1',
      timestamp: '2026-06-18T10:00:00.000Z',
    }))
  })

  it('returns a stable empty dashboard DTO without leaking Prisma values', async () => {
    seedDashboardQueries({ empty: true })

    const result = await getAllDashboardData({ context, filters: { period: '30d' } })

    expect(result.kpis.revenue).toEqual({ current: 0, previous: 0, change: 0 })
    expect(result.stockHealth).toEqual({
      trackedItems: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      overstock: 0,
      reorderCandidates: 0,
      availableUnits: 0,
      reservedUnits: 0,
    })
    expect(result.topProducts).toEqual([])
    expect(result.locations).toEqual([])
    expect(result.activities).toEqual([])
    expect(result.generatedAt).toBe('2026-06-18T12:00:00.000Z')
  })

  it('derives legacy dashboard metrics from the same verified read model', async () => {
    seedDashboardQueries()

    const result = await getDashboardMetrics({ context })

    expect(result.revenue).toEqual({ current: 1000, previous: 500, change: 100, target: 1100 })
    expect(result.inventory).toEqual({ current: 75, previous: 75, change: 0, target: 75 })
    expect(mockDb.organization.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'org-1' }) }),
    )
  })
})
