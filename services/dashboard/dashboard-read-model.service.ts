import 'server-only'

import { db } from '@/prisma/db'
import { NotFoundError } from '@/services/_shared/action-errors'
import {
  LocationType,
  POSSessionStatus,
  PaymentStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
  TransactionType,
} from '@prisma/client'
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from 'date-fns'

export type DashboardPeriod = '7d' | '30d' | '90d' | 'mtd'

export interface DashboardFilters {
  period?: DashboardPeriod
  locationId?: string
}

export interface DashboardReadModelContext {
  organizationId: string
  actorId: string
  actorPermissions: readonly string[]
  isSuperUser: boolean
}

export interface DashboardReadModelInput {
  context: DashboardReadModelContext
  filters?: DashboardFilters
}

export interface DashboardMetric {
  current: number
  previous: number
  change: number
}

export interface DashboardKpis {
  revenue: DashboardMetric
  orders: DashboardMetric
  customers: DashboardMetric
  inventoryValue: DashboardMetric
  averageOrderValue: DashboardMetric
  cashCollected: DashboardMetric
}

export interface DashboardTrendPoint {
  label: string
  date: string
  revenue: number
  orders: number
}

export interface DashboardTopProduct {
  id: string
  name: string
  sku: string
  category: string
  quantitySold: number
  revenue: number
  stockOnHand: number
  href: string
}

export interface DashboardLocationPerformance {
  id: string
  name: string
  type: LocationType
  revenue: number
  orders: number
  inventoryValue: number
  href: string
}

export interface DashboardAlert {
  id: string
  type: 'critical' | 'warning' | 'info' | 'success'
  title: string
  description: string
  href?: string
}

export interface DashboardActivity {
  id: string
  type: 'sale' | 'purchase' | 'inventory'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'info'
  href?: string
}

export interface DashboardPendingAction {
  id: string
  label: string
  count: number
  href: string
  severity: 'critical' | 'warning' | 'info'
}

export interface DashboardStockHealth {
  trackedItems: number
  inStock: number
  lowStock: number
  outOfStock: number
  overstock: number
  reorderCandidates: number
  availableUnits: number
  reservedUnits: number
}

export interface DashboardData {
  organization: {
    id: string
    name: string
    currency: string
  }
  period: {
    key: DashboardPeriod
    from: string
    to: string
    previousFrom: string
    previousTo: string
  }
  filters: {
    locationId?: string
  }
  generatedAt: string
  kpis: DashboardKpis
  stockHealth: DashboardStockHealth
  salesTrend: DashboardTrendPoint[]
  topProducts: DashboardTopProduct[]
  locations: DashboardLocationPerformance[]
  alerts: DashboardAlert[]
  activities: DashboardActivity[]
  pendingActions: DashboardPendingAction[]
  counts: {
    activeLocations: number
    activeSessions: number
    pendingPurchaseOrders: number
    openSalesOrders: number
    totalCustomers: number
    totalItems: number
  }
}

interface LegacyDashboardMetrics {
  revenue: DashboardMetric & { target: number }
  orders: DashboardMetric & { target: number }
  customers: DashboardMetric & { target: number }
  inventory: DashboardMetric & { target: number }
  conversionRate: DashboardMetric & { target: number }
  avgOrderValue: DashboardMetric & { target: number }
}

const COMPLETED_SALES_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.COMPLETED,
  SalesOrderStatus.DELIVERED,
]

const OPEN_SALES_STATUSES: SalesOrderStatus[] = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.PROCESSING,
  SalesOrderStatus.SHIPPED,
]

const PENDING_PURCHASE_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.SUBMITTED,
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'object') {
    const decimalLike = value as { toNumber?: () => number }
    if (typeof decimalLike.toNumber === 'function') {
      return decimalLike.toNumber()
    }
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function getPeriodRange(period: DashboardPeriod = '30d') {
  const today = endOfDay(new Date())
  const startOfMonth = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1))
  const from =
    period === '7d'
      ? startOfDay(subDays(today, 6))
      : period === '90d'
        ? startOfDay(subDays(today, 89))
        : period === 'mtd'
          ? startOfMonth
          : startOfDay(subDays(today, 29))

  const days = differenceInCalendarDays(today, from) + 1
  const previousTo = endOfDay(subDays(from, 1))
  const previousFrom = startOfDay(subDays(previousTo, days - 1))

  return {
    from,
    to: today,
    previousFrom,
    previousTo,
  }
}

function buildSalesWhere(organizationId: string, from: Date, to: Date, locationId?: string) {
  return {
    organizationId,
    deletedAt: null,
    status: { in: COMPLETED_SALES_STATUSES },
    orderDate: {
      gte: from,
      lte: to,
    },
    ...(locationId ? { locationId } : {}),
  }
}

function buildAllSalesWhere(organizationId: string, from: Date, to: Date, locationId?: string) {
  return {
    organizationId,
    deletedAt: null,
    orderDate: {
      gte: from,
      lte: to,
    },
    ...(locationId ? { locationId } : {}),
  }
}

export async function getAllDashboardData(input: DashboardReadModelInput): Promise<DashboardData> {
  const organizationId = input.context.organizationId
  const filters = input.filters ?? {}

  const period = filters.period || '30d'
  const { from, to, previousFrom, previousTo } = getPeriodRange(period)
  const locationId = filters.locationId || undefined
  const salesWhere = buildSalesWhere(organizationId, from, to, locationId)
  const previousSalesWhere = buildSalesWhere(organizationId, previousFrom, previousTo, locationId)
  const allSalesWhere = buildAllSalesWhere(organizationId, from, to, locationId)

  const [
    organization,
    currentSales,
    previousSales,
    currentPayments,
    previousPayments,
    customersTotal,
    previousCustomersTotal,
    _newCustomers,
    activeLocations,
    activeSessions,
    openSalesOrders,
    pendingPurchaseOrders,
    _pendingPurchaseValue,
    totalItems,
    inventoryItems,
    salesOrdersForTrend,
    topSalesLines,
    locations,
    recentSalesOrders,
    recentPurchaseOrders,
    recentInventoryTransactions,
  ] = await Promise.all([
    db.organization.findFirst({
      where: { id: organizationId, deletedAt: null, isActive: true },
      select: { id: true, name: true, currency: true },
    }),
    db.salesOrder.aggregate({
      where: salesWhere,
      _sum: { total: true },
      _count: true,
    }),
    db.salesOrder.aggregate({
      where: previousSalesWhere,
      _sum: { total: true },
      _count: true,
    }),
    db.payment.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        status: PaymentStatus.PAID,
        createdAt: { gte: from, lte: to },
        ...(locationId ? { salesOrder: { is: { locationId } } } : {}),
      },
      _sum: { amount: true },
      _count: true,
    }),
    db.payment.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        status: PaymentStatus.PAID,
        createdAt: { gte: previousFrom, lte: previousTo },
        ...(locationId ? { salesOrder: { is: { locationId } } } : {}),
      },
      _sum: { amount: true },
      _count: true,
    }),
    db.customer.count({ where: { organizationId, deletedAt: null } }),
    db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { lt: from } } }),
    db.customer.count({ where: { organizationId, deletedAt: null, createdAt: { gte: from, lte: to } } }),
    db.location.count({ where: { organizationId, isActive: true } }),
    db.pOSSession.count({
      where: {
        organizationId,
        status: POSSessionStatus.ACTIVE,
        ...(locationId ? { locationId } : {}),
      },
    }),
    db.salesOrder.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: OPEN_SALES_STATUSES },
        ...(locationId ? { locationId } : {}),
      },
    }),
    db.purchaseOrder.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: PENDING_PURCHASE_STATUSES },
        ...(locationId ? { locationId } : {}),
      },
    }),
    db.purchaseOrder.aggregate({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: PENDING_PURCHASE_STATUSES },
        ...(locationId ? { locationId } : {}),
      },
      _sum: { total: true },
    }),
    db.item.count({
      where: { organizationId, deletedAt: null, isActive: true },
    }),
    db.item.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        trackInventory: true,
      },
      select: {
        id: true,
        sku: true,
        nameEn: true,
        nameFr: true,
        minStockLevel: true,
        maxStockLevel: true,
        reorderLevel: true,
        inventoryLevels: {
          where: locationId ? { locationId } : undefined,
          select: {
            quantityOnHand: true,
            quantityReserved: true,
            quantityAvailable: true,
            totalValue: true,
          },
        },
      },
    }),
    db.salesOrder.findMany({
      where: salesWhere,
      select: { orderDate: true, total: true },
      orderBy: { orderDate: 'asc' },
    }),
    db.salesOrderLine.groupBy({
      by: ['itemId'],
      where: {
        salesOrder: salesWhere,
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: {
          lineTotal: 'desc',
        },
      },
      take: 6,
    }),
    db.location.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(locationId ? { id: locationId } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        salesOrders: {
          where: allSalesWhere,
          select: { total: true, status: true },
        },
        inventoryLevels: {
          select: { totalValue: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
    db.salesOrder.findMany({
      where: allSalesWhere,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        orderDate: true,
        customer: { select: { name: true } },
      },
      orderBy: { orderDate: 'desc' },
      take: 6,
    }),
    db.purchaseOrder.findMany({
      where: {
        organizationId,
        deletedAt: null,
        orderDate: { gte: from, lte: to },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        orderDate: true,
        supplier: { select: { name: true } },
      },
      orderBy: { orderDate: 'desc' },
      take: 6,
    }),
    db.inventoryTransaction.findMany({
      where: {
        organizationId,
        createdAt: { gte: from, lte: to },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        id: true,
        type: true,
        quantity: true,
        createdAt: true,
        item: { select: { nameEn: true, nameFr: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ])

  if (!organization) {
    throw new NotFoundError('Organization not found.')
  }

  const inventorySummary = inventoryItems.reduce(
    (summary, item) => {
      const stock = item.inventoryLevels.reduce((total, level) => total + toNumber(level.quantityOnHand), 0)
      const available = item.inventoryLevels.reduce((total, level) => total + toNumber(level.quantityAvailable), 0)
      const reserved = item.inventoryLevels.reduce((total, level) => total + toNumber(level.quantityReserved), 0)
      const value = item.inventoryLevels.reduce((total, level) => total + toNumber(level.totalValue), 0)
      const minStock = toNumber(item.minStockLevel)
      const maxStock = toNumber(item.maxStockLevel)
      const reorderLevel = toNumber(item.reorderLevel)

      summary.inventoryValue += value
      summary.availableUnits += available
      summary.reservedUnits += reserved

      if (stock <= 0) summary.outOfStock += 1
      else if (stock <= Math.max(minStock, reorderLevel)) summary.lowStock += 1
      else if (maxStock > 0 && stock >= maxStock) summary.overstock += 1
      else summary.inStock += 1

      if (stock <= Math.max(minStock, reorderLevel)) {
        summary.reorderCandidates.push({
          id: item.id,
          name: item.nameEn,
          stock,
          minStock: Math.max(minStock, reorderLevel),
        })
      }

      return summary
    },
    {
      inventoryValue: 0,
      availableUnits: 0,
      reservedUnits: 0,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      overstock: 0,
      reorderCandidates: [] as { id: string; name: string; stock: number; minStock: number }[],
    }
  )

  const previousInventoryValue = inventorySummary.inventoryValue
  const revenueCurrent = toNumber(currentSales._sum.total)
  const revenuePrevious = toNumber(previousSales._sum.total)
  const ordersCurrent = currentSales._count
  const ordersPrevious = previousSales._count
  const cashCurrent = toNumber(currentPayments._sum.amount)
  const cashPrevious = toNumber(previousPayments._sum.amount)
  const avgOrderCurrent = ordersCurrent > 0 ? revenueCurrent / ordersCurrent : 0
  const avgOrderPrevious = ordersPrevious > 0 ? revenuePrevious / ordersPrevious : 0

  const trendByDate = new Map<string, DashboardTrendPoint>()
  eachDayOfInterval({ start: from, end: to }).forEach((date) => {
    const key = format(date, 'yyyy-MM-dd')
    trendByDate.set(key, {
      label: format(date, 'MMM d'),
      date: key,
      revenue: 0,
      orders: 0,
    })
  })

  salesOrdersForTrend.forEach((order) => {
    const key = format(order.orderDate, 'yyyy-MM-dd')
    const point = trendByDate.get(key)
    if (point) {
      point.revenue += toNumber(order.total)
      point.orders += 1
    }
  })

  const productIds = topSalesLines.map((line) => line.itemId)
  const productDetails = productIds.length
    ? await db.item.findMany({
        where: { id: { in: productIds }, organizationId },
        select: {
          id: true,
          sku: true,
          nameEn: true,
          category: { select: { titleEn: true } },
          inventoryLevels: {
            where: locationId ? { locationId } : undefined,
            select: { quantityOnHand: true },
          },
        },
      })
    : []
  const productById = new Map(productDetails.map((item) => [item.id, item]))

  const topProducts = topSalesLines.map((line) => {
    const item = productById.get(line.itemId)
    const stockOnHand = item?.inventoryLevels.reduce((total, level) => total + toNumber(level.quantityOnHand), 0) || 0

    return {
      id: line.itemId,
      name: item?.nameEn || 'Unknown item',
      sku: item?.sku || 'N/A',
      category: item?.category?.titleEn || 'Uncategorized',
      quantitySold: toNumber(line._sum.quantity),
      revenue: toNumber(line._sum.lineTotal),
      stockOnHand,
      href: `/dashboard/analytics/reports?report=items&itemId=${encodeURIComponent(line.itemId)}&period=${period}&locationId=${encodeURIComponent(locationId || 'all')}`,
    }
  })

  const locationPerformance = locations.map((location) => {
    const completedOrders = location.salesOrders.filter((order) =>
      COMPLETED_SALES_STATUSES.includes(order.status)
    )
    return {
      id: location.id,
      name: location.name,
      type: location.type,
      revenue: completedOrders.reduce((total, order) => total + toNumber(order.total), 0),
      orders: completedOrders.length,
      inventoryValue: location.inventoryLevels.reduce((total, level) => total + toNumber(level.totalValue), 0),
      href: `/dashboard/settings/locations/${location.id}/edit`,
    }
  })

  const alerts: DashboardAlert[] = [
    ...(inventorySummary.outOfStock > 0
      ? [{
          id: 'out-of-stock',
          type: 'critical' as const,
          title: 'Out of stock items',
          description: `${inventorySummary.outOfStock} tracked item${inventorySummary.outOfStock === 1 ? '' : 's'} have no available stock.`,
          href: '/dashboard/inventory/items?stock=out-of-stock',
        }]
      : []),
    ...(inventorySummary.lowStock > 0
      ? [{
          id: 'low-stock',
          type: 'warning' as const,
          title: 'Low stock needs attention',
          description: `${inventorySummary.lowStock} item${inventorySummary.lowStock === 1 ? '' : 's'} are at or below reorder levels.`,
          href: '/dashboard/inventory/items?stock=low-stock',
        }]
      : []),
    ...(pendingPurchaseOrders > 0
      ? [{
          id: 'pending-purchase-orders',
          type: 'info' as const,
          title: 'Purchasing queue',
          description: `${pendingPurchaseOrders} purchase order${pendingPurchaseOrders === 1 ? '' : 's'} are waiting for approval or receipt.`,
          href: '/dashboard/purchase-orders?status=pending',
        }]
      : []),
    ...(activeSessions > 0
      ? [{
          id: 'active-pos-sessions',
          type: 'success' as const,
          title: 'POS sessions active',
          description: `${activeSessions} POS session${activeSessions === 1 ? '' : 's'} are currently open.`,
          href: '/dashboard/pos',
        }]
      : []),
  ]

  const activities: DashboardActivity[] = [
    ...recentSalesOrders.map((order) => ({
      id: `sale-${order.id}`,
      type: 'sale' as const,
      title: `Sales order ${order.orderNumber}`,
      description: `${order.customer.name} - ${toNumber(order.total).toFixed(2)} (${order.status.toLowerCase()})`,
      timestamp: order.orderDate.toISOString(),
      status: COMPLETED_SALES_STATUSES.includes(order.status) ? 'success' as const : 'info' as const,
      href: `/dashboard/sales?orderId=${encodeURIComponent(order.id)}`,
    })),
    ...recentPurchaseOrders.map((order) => ({
      id: `purchase-${order.id}`,
      type: 'purchase' as const,
      title: `Purchase order ${order.orderNumber}`,
      description: `${order.supplier.name} - ${toNumber(order.total).toFixed(2)} (${order.status.toLowerCase()})`,
      timestamp: order.orderDate.toISOString(),
      status: PENDING_PURCHASE_STATUSES.includes(order.status) ? 'warning' as const : 'success' as const,
      href: `/dashboard/purchase-orders/${order.id}`,
    })),
    ...recentInventoryTransactions.map((transaction) => ({
      id: `inventory-${transaction.id}`,
      type: 'inventory' as const,
      title: transaction.type.replaceAll('_', ' ').toLowerCase(),
      description: `${transaction.item.nameEn} at ${transaction.location.name} - ${toNumber(transaction.quantity)} units`,
      timestamp: transaction.createdAt.toISOString(),
      status: transaction.type === TransactionType.SALE ? 'info' as const : 'success' as const,
      href: `/dashboard/inventory/movements?transactionId=${encodeURIComponent(transaction.id)}`,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  const pendingActions: DashboardPendingAction[] = [
    {
      id: 'reorder',
      label: 'Reorder candidates',
      count: inventorySummary.reorderCandidates.length,
      href: '/dashboard/inventory/items?stock=reorder',
      severity: inventorySummary.outOfStock > 0 ? 'critical' : 'warning',
    },
    {
      id: 'open-sales',
      label: 'Open sales orders',
      count: openSalesOrders,
      href: '/dashboard/sales?status=open',
      severity: openSalesOrders > 0 ? 'info' : 'warning',
    },
    {
      id: 'pending-purchases',
      label: 'Purchase orders to finish',
      count: pendingPurchaseOrders,
      href: '/dashboard/purchase-orders?status=pending',
      severity: pendingPurchaseOrders > 0 ? 'warning' : 'info',
    },
  ]

  return {
    organization,
    period: {
      key: period,
      from: from.toISOString(),
      to: to.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
    },
    filters: { locationId },
    generatedAt: new Date().toISOString(),
    kpis: {
      revenue: {
        current: revenueCurrent,
        previous: revenuePrevious,
        change: getChange(revenueCurrent, revenuePrevious),
      },
      orders: {
        current: ordersCurrent,
        previous: ordersPrevious,
        change: getChange(ordersCurrent, ordersPrevious),
      },
      customers: {
        current: customersTotal,
        previous: previousCustomersTotal,
        change: getChange(customersTotal, previousCustomersTotal),
      },
      inventoryValue: {
        current: inventorySummary.inventoryValue,
        previous: previousInventoryValue,
        change: getChange(inventorySummary.inventoryValue, previousInventoryValue),
      },
      averageOrderValue: {
        current: avgOrderCurrent,
        previous: avgOrderPrevious,
        change: getChange(avgOrderCurrent, avgOrderPrevious),
      },
      cashCollected: {
        current: cashCurrent,
        previous: cashPrevious,
        change: getChange(cashCurrent, cashPrevious),
      },
    },
    stockHealth: {
      trackedItems: inventoryItems.length,
      inStock: inventorySummary.inStock,
      lowStock: inventorySummary.lowStock,
      outOfStock: inventorySummary.outOfStock,
      overstock: inventorySummary.overstock,
      reorderCandidates: inventorySummary.reorderCandidates.length,
      availableUnits: inventorySummary.availableUnits,
      reservedUnits: inventorySummary.reservedUnits,
    },
    salesTrend: Array.from(trendByDate.values()),
    topProducts,
    locations: locationPerformance,
    alerts,
    activities,
    pendingActions,
    counts: {
      activeLocations,
      activeSessions,
      pendingPurchaseOrders,
      openSalesOrders,
      totalCustomers: customersTotal,
      totalItems,
    },
  }
}

export async function getDashboardMetrics(input: { context: DashboardReadModelContext }): Promise<LegacyDashboardMetrics> {
  const data = await getAllDashboardData({ context: input.context })
  const averageOrderTarget = data.kpis.averageOrderValue.current * 1.05

  return {
    revenue: { ...data.kpis.revenue, target: data.kpis.revenue.current * 1.1 },
    orders: { ...data.kpis.orders, target: data.kpis.orders.current * 1.1 },
    customers: { ...data.kpis.customers, target: data.kpis.customers.current * 1.05 },
    inventory: { ...data.kpis.inventoryValue, target: data.kpis.inventoryValue.current },
    conversionRate: { current: 0, previous: 0, change: 0, target: 0 },
    avgOrderValue: {
      ...data.kpis.averageOrderValue,
      target: averageOrderTarget > 0 ? averageOrderTarget : 0,
    },
  }
}
