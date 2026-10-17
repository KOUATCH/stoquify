import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { completedSalesEvidence, reportDecimal } from "./completed-sales-evidence"
import { performanceComparison } from "./sales-performance.service"
import { salesInsightsScope, type SalesInsightsInput } from "./sales-insights-scope"

export async function getSalesProducts(input: SalesInsightsInput, access: { stock: boolean; margin: boolean }) {
  return db.$transaction(async tx => {
    const { scope, organization, now, period, locations } = await salesInsightsScope(tx, input)
    const read = async (start: Date, end: Date, cost: boolean) => {
      const orders = await tx.salesOrder.findMany({ where: { organizationId: organization.id, deletedAt: null, status: { in: scope.status ? [scope.status] : ["COMPLETED", "DELIVERED"] }, orderDate: { gte: start, lt: end }, ...(scope.locationId ? { locationId: scope.locationId } : {}), ...(scope.channel ? { channel: scope.channel } : {}) },
        select: { id: true, locationId: true, orderDate: true, total: true, taxAmount: true, lines: { take: 501, select: { id: true, itemId: true, quantity: true, lineTotal: true, taxAmount: true, item: { select: { organizationId: true, nameEn: true, nameFr: true, sku: true } } } } }, take: 501 })
      if (orders.length > 500 || orders.some(order => order.lines.length > 500) || orders.reduce((sum, order) => sum + order.lines.length, 0) > 5000) throw new BusinessRuleError("Choose a narrower product performance period or location.")
      if (orders.some(order => order.lines.some(line => line.item.organizationId !== organization.id))) throw new BusinessRuleError("Product evidence needs review.")
      // Reuse the item report's original-stock-issue coverage rules. Order-level charges
      // are reconciled separately; they must not be silently allocated to product margin.
      const evidence = await completedSalesEvidence(tx, organization.id, orders.map(order => ({ ...order, payments: [] })), { requireOrderTieOut: false, readCostEvidence: cost, maxMovements: 20000 })
      return { ...evidence, orderValue: orders.reduce((sum, order) => sum.plus(reportDecimal(order.total)), new Prisma.Decimal(0)) }
    }
    const current = await read(period.startAt, period.endAt, access.margin)
    const previous = period.previousEndAt ? await read(period.previousStartAt, period.previousEndAt, false) : null
    const ids = [...new Set([...current.items.keys(), ...(previous?.items.keys() ?? [])])]
    if (ids.length > 2000) throw new BusinessRuleError("Choose a narrower product performance scope.")
    const items = ids.length ? await tx.item.findMany({ where: { organizationId: organization.id, id: { in: ids } }, select: { id: true, nameEn: true, nameFr: true, sku: true, isActive: true, deletedAt: true, unit: { select: { id: true, symbol: true, organizationId: true } },
      ...(access.stock ? { trackInventory: true, minStockLevel: true } : {}) } }) : []
    const locationIds = scope.locationId ? [scope.locationId] : locations.map(row => row.id)
    const levels = access.stock && ids.length ? await tx.inventoryLevel.findMany({ where: { itemId: { in: ids }, item: { organizationId: organization.id }, locationId: { in: locationIds }, location: { organizationId: organization.id } }, select: { itemId: true, locationId: true, quantityOnHand: true, quantityReserved: true, quantityAvailable: true } }) : []
    const rows = items.map(item => {
      const zero = new Prisma.Decimal(0), sale = current.items.get(item.id), prior = previous?.items.get(item.id)
      const value = sale?.revenue ?? zero, net = sale?.net ?? zero, quantity = sale?.quantity ?? zero
      const stock = levels.filter(level => level.itemId === item.id)
      const stockKnown = access.stock && item.trackInventory && locationIds.length > 0 && stock.length === locationIds.length && stock.every(level => reportDecimal(level.quantityOnHand).minus(level.quantityReserved).eq(level.quantityAvailable) && reportDecimal(level.quantityReserved).gte(0))
      const available = stockKnown ? stock.reduce((sum, level) => sum.plus(level.quantityAvailable), zero) : null
      const profit = access.margin && sale?.cost != null ? net.minus(sale.cost) : null
      const unit = item.unit?.organizationId === organization.id ? { id: item.unit.id, symbol: item.unit.symbol } : null
      return { id: item.id, name: item.nameEn, nameFr: item.nameFr, sku: item.sku, active: item.isActive && !item.deletedAt, unit,
        value: value.toFixed(2), quantity: quantity.toFixed(3), change: performanceComparison(value.toFixed(2), previous ? (prior?.revenue ?? zero).toFixed(2) : null),
        available: available?.toFixed(3) ?? null, stockStatus: available === null ? "unknown" as const : available.lte(0) ? "out" as const : available.lte(item.minStockLevel) ? "low" as const : "in" as const,
        contribution: profit?.toFixed(2) ?? null, margin: profit !== null && net.gt(0) ? profit.div(net).times(100).toFixed(2) : null,
        uncoveredCosts: access.margin ? sale?.costEvidence.uncoveredGroups ?? 0 : null }
    })
    return { currency: organization.currency, timezone: organization.timezone, checkedAt: now.toISOString(), stockCheckedAt: access.stock ? now.toISOString() : null, canReadStock: access.stock, canReadMargin: access.margin,
      lineValue: current.revenue.toFixed(2), orderValue: current.orderValue.toFixed(2), orderDifference: current.orderValue.minus(current.revenue).toFixed(2), rows }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
