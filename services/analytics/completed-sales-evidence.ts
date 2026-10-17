import "server-only"

import { Prisma } from "@prisma/client"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { dailySalesPeriod } from "./daily-sales-period"
import type { AnalyticsReportReadModelInput } from "./financial-reports.service"

export type CostEvidence = { basis: "ORIGINAL_STOCK_ISSUES"; coveredGroups: number; uncoveredGroups: number }
const zero = () => new Prisma.Decimal(0)
export function reportDecimal(value: Prisma.Decimal.Value): Prisma.Decimal {
  const amount = new Prisma.Decimal(value)
  if (!amount.isFinite()) throw new BusinessRuleError("The report contains an invalid recorded amount.")
  return amount
}

export async function completedReportScope(tx: Prisma.TransactionClient, input: AnalyticsReportReadModelInput) {
  if (!(input.startDate instanceof Date) || !(input.endDate instanceof Date) || !Number.isFinite(input.startDate.getTime()) || !Number.isFinite(input.endDate.getTime()) || input.endDate < input.startDate) {
    throw new BusinessRuleError("Choose a valid report date range.")
  }
  const organization = await tx.organization.findFirst({ where: { id: input.organizationId, isActive: true, deletedAt: null }, select: { id: true, currency: true, timezone: true } })
  if (!organization) throw new NotFoundError("Organization not found")
  const locationId = !input.locationId || ["all", "*"].includes(input.locationId) ? null : input.locationId
  if (locationId && !await tx.location.findFirst({ where: { id: locationId, organizationId: organization.id }, select: { id: true } })) throw new NotFoundError("Report location not found")
  const currency = organization.currency.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) throw new BusinessRuleError("A valid report currency is required.")
  const first = dailySalesPeriod(input.startDate, organization.timezone), last = dailySalesPeriod(input.endDate, organization.timezone)
  const calendarDays = (last.calendarDate.getTime() - first.calendarDate.getTime()) / 86_400_000 + 1
  const previousDate = new Date(first.calendarDate.getTime() - calendarDays * 86_400_000).toISOString().slice(0, 10)
  return { organizationId: organization.id, locationId, currency, timezone: organization.timezone, start: first.start, endExclusive: last.endExclusive, end: new Date(last.endExclusive.getTime() - 1), previousStart: dailySalesPeriod(previousDate, organization.timezone).start, calendarDays }
}

type Scope = Awaited<ReturnType<typeof completedReportScope>>
export async function completedReportSales(tx: Prisma.TransactionClient, scope: Scope, start = scope.start, endExclusive = scope.endExclusive) {
  return tx.salesOrder.findMany({
    where: { organizationId: scope.organizationId, ...(scope.locationId ? { locationId: scope.locationId } : {}), deletedAt: null, status: { in: ["COMPLETED", "DELIVERED"] }, orderDate: { gte: start, lt: endExclusive } },
    select: { id: true, locationId: true, orderDate: true, total: true, taxAmount: true,
      lines: { select: { id: true, itemId: true, quantity: true, lineTotal: true, taxAmount: true, item: { select: { nameEn: true, nameFr: true, sku: true } } } },
      payments: { where: { deletedAt: null, status: "PAID" }, select: { method: true, amount: true } },
    },
  })
}
type Sales = Awaited<ReturnType<typeof completedReportSales>>

/** Original sale activity, before subsequent returns/credits. Neither posted profit nor a financial statement.
 * POS references the order; delivery issues reference its lines. Never substitute today's catalogue price. */
export async function completedSalesEvidence(tx: Prisma.TransactionClient, organizationId: string, orders: Sales, options: { requireOrderTieOut?: boolean; readCostEvidence?: boolean; maxMovements?: number } = {}) {
  const groups = new Map<string, { orderId: string; itemId: string; locationId: string; quantity: Prisma.Decimal; revenue: Prisma.Decimal; net: Prisma.Decimal; cost: Prisma.Decimal; issued: Prisma.Decimal; valid: boolean; name: string; nameFr: string | null; sku: string }>()
  const lineGroups = new Map<string, string>()
  let revenue = zero(), net = zero(), quantity = zero()
  for (const order of orders) {
    let lineTotal = zero(), lineTax = zero()
    for (const line of order.lines) {
      const key = JSON.stringify([order.id, line.itemId]), qty = reportDecimal(line.quantity), gross = reportDecimal(line.lineTotal), tax = reportDecimal(line.taxAmount)
      if (qty.lte(0) || gross.lt(0) || tax.lt(0) || tax.gt(gross)) throw new BusinessRuleError("Recorded sale lines need review before reporting.")
      const group = groups.get(key) ?? { orderId: order.id, itemId: line.itemId, locationId: order.locationId, quantity: zero(), revenue: zero(), net: zero(), cost: zero(), issued: zero(), valid: true, name: line.item.nameEn, nameFr: line.item.nameFr, sku: line.item.sku }
      group.quantity = group.quantity.plus(qty); group.revenue = group.revenue.plus(gross); group.net = group.net.plus(gross.minus(tax))
      groups.set(key, group); lineGroups.set(line.id, key); lineTotal = lineTotal.plus(gross); lineTax = lineTax.plus(tax)
    }
    if (!order.lines.length || (options.requireOrderTieOut !== false && (!lineTotal.eq(reportDecimal(order.total)) || !lineTax.eq(reportDecimal(order.taxAmount))))) throw new BusinessRuleError("Recorded sale totals do not match their lines. Review the source record.")
    revenue = revenue.plus(lineTotal); net = net.plus(lineTotal.minus(lineTax))
  }
  const refs = [...orders.map(order => order.id), ...lineGroups.keys()]
  const movements = refs.length && options.readCostEvidence !== false ? await tx.inventoryTransaction.findMany({
    where: { organizationId, type: "SALE", referenceType: "SALES_ORDER", referenceId: { in: refs } },
    select: { referenceId: true, itemId: true, locationId: true, quantity: true, unitCost: true, totalCost: true, timeProvenance: true },
    ...(options.maxMovements ? { take: options.maxMovements + 1 } : {}),
  }) : []
  if (options.maxMovements && movements.length > options.maxMovements) throw new BusinessRuleError("Choose a narrower cost evidence scope.")
  for (const movement of movements) {
    const key = lineGroups.get(movement.referenceId!) ?? JSON.stringify([movement.referenceId, movement.itemId]), group = groups.get(key)
    if (!group) {
      // An extra item issued against an order makes that order's cost incomplete.
      for (const candidate of groups.values()) if (candidate.orderId === movement.referenceId) candidate.valid = false
      continue
    }
    const issued = reportDecimal(movement.quantity), unitCost = reportDecimal(movement.unitCost), cost = reportDecimal(movement.totalCost)
    if (movement.itemId !== group.itemId || movement.locationId !== group.locationId || issued.gte(0) || cost.lt(0) || unitCost.lt(0) || !issued.abs().times(unitCost).toDecimalPlaces(2).eq(cost) || movement.timeProvenance !== "EXPLICIT_SOURCE_TIME") group.valid = false
    group.issued = group.issued.plus(issued.abs()); group.cost = group.cost.plus(cost)
  }
  const costEvidence: CostEvidence = { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 0, uncoveredGroups: 0 }
  const items = new Map<string, { name: string; nameFr: string | null; sku: string; quantity: Prisma.Decimal; revenue: Prisma.Decimal; net: Prisma.Decimal; cost: Prisma.Decimal | null; costEvidence: CostEvidence }>()
  let totalCost = zero()
  for (const group of groups.values()) {
    const covered = group.valid && group.issued.eq(group.quantity)
    const coverage = covered ? "coveredGroups" : "uncoveredGroups"
    costEvidence[coverage] += 1; totalCost = totalCost.plus(group.cost); quantity = quantity.plus(group.quantity)
    const item = items.get(group.itemId) ?? { name: group.name, nameFr: group.nameFr, sku: group.sku, quantity: zero(), revenue: zero(), net: zero(), cost: zero(), costEvidence: { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 0, uncoveredGroups: 0 } }
    item.quantity = item.quantity.plus(group.quantity); item.revenue = item.revenue.plus(group.revenue); item.net = item.net.plus(group.net)
    item.cost = covered && item.cost !== null ? item.cost.plus(group.cost) : null; item.costEvidence[coverage] += 1
    items.set(group.itemId, item)
  }
  const cost = costEvidence.uncoveredGroups ? null : totalCost
  return { revenue, net, quantity, cost, profit: cost === null ? null : net.minus(cost), costEvidence, items }
}

export function reportGrowth(current: Prisma.Decimal | null, previous: Prisma.Decimal | null) {
  return current !== null && previous !== null && previous.gt(0) ? current.minus(previous).div(previous).times(100).toNumber() : null
}
