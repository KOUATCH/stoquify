const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../..');
const file=path.join(root,'services/analytics/financial-reports.service.ts');let source=fs.readFileSync(file,'utf8');
if(source.includes('completedSalesEvidence'))throw Error('Already patched');
source=source.replace('import { db }', 'import { completedReportScope, completedReportSales, completedSalesEvidence, reportDecimal, reportGrowth, type CostEvidence } from "./completed-sales-evidence"\n\nimport { db }');
const a=source.indexOf('export interface FinancialSummaryReport'),b=source.indexOf('export interface CashierPerformanceReport');
let contract=source.slice(a,b).replace('  totalCost: number','  netRevenue: number\n  costEvidence: CostEvidence\n  timezone: string\n  totalCost: number | null').replace('grossProfit: number','grossProfit: number | null').replace('grossMargin: number','grossMargin: number | null').replace(/(revenueChange|transactionChange|profitChange): number/g,'$1: number | null').replace('    profit: number','    profit: number | null\n    itemNameFr: string | null');source=source.slice(0,a)+contract+source.slice(b);
const ia=source.indexOf('export interface ItemPerformanceReport'),ib=source.indexOf('export interface CashFlowReport');contract=source.slice(ia,ib).replace('  totalCost: number','  netRevenue: number\n  itemNameFr: string | null\n  costEvidence: CostEvidence\n  totalCost: number | null').replace('grossProfit: number','grossProfit: number | null').replace('profitMargin: number','profitMargin: number | null').replace('daysOfStock: number','daysOfStock: number | null').replace('daysOfAvailableStock: number','daysOfAvailableStock: number | null').replace('salesTrend: "increasing" | "decreasing" | "stable"','salesTrend: "increasing" | "decreasing" | "stable" | "unavailable"').replace(/(revenueChange|quantityChange): number/g,'$1: number | null');source=source.slice(0,ia)+contract+source.slice(ib);
const begin=source.indexOf('async function getSalesOrders('),end=source.indexOf('export async function getCashierPerformanceReportReadModel');
if(begin<0||end<begin)throw Error('Missing financial report boundary');
source=source.slice(0,begin)+`export async function getFinancialSummaryReportReadModel(input: AnalyticsReportReadModelInput): Promise<FinancialSummaryReport> {
  return db.$transaction(async tx => {
    const scope = await completedReportScope(tx, input)
    const sales = await completedReportSales(tx, scope)
    const previousSales = await completedReportSales(tx, scope, scope.previousStart, scope.start)
    const current = await completedSalesEvidence(tx, scope.organizationId, sales)
    const previous = await completedSalesEvidence(tx, scope.organizationId, previousSales)
    const payments = sales.flatMap(order => order.payments)
    const tender = (methods: string[]) => payments.filter(payment => methods.includes(payment.method)).reduce((sum, payment) => sum.plus(reportDecimal(payment.amount)), new Prisma.Decimal(0)).toNumber()
    const hours = new Map(Array.from({ length: 24 }, (_, hour) => [hour, { revenue: new Prisma.Decimal(0), transactions: 0 }]))
    const hourFormatter = new Intl.DateTimeFormat("en", { timeZone: scope.timezone, hour: "2-digit", hourCycle: "h23" })
    for (const order of sales) {
      const bucket = hours.get(Number(hourFormatter.format(order.orderDate)))!
      bucket.revenue = bucket.revenue.plus(reportDecimal(order.total)); bucket.transactions += 1
    }
    return {
      period: periodLabel(scope.start, scope.end), timezone: scope.timezone,
      provenance: buildReportProvenance({ ...scope, sourceTables: ["salesOrder", "salesOrderLine", "payment", "inventoryTransaction", "item"], rowCount: sales.length }),
      totalRevenue: current.revenue.toNumber(), netRevenue: current.net.toNumber(), totalCost: current.cost?.toNumber() ?? null,
      grossProfit: current.profit?.toNumber() ?? null, grossMargin: current.profit !== null && current.net.gt(0) ? current.profit.div(current.net).times(100).toNumber() : null,
      costEvidence: current.costEvidence, totalTransactions: sales.length, totalItemsSold: current.quantity.toNumber(),
      averageTransactionValue: sales.length ? current.revenue.div(sales.length).toNumber() : 0,
      cashSales: tender(["CASH"]), cardSales: tender(["CARD"]), digitalSales: tender(["MOBILE_MONEY", "BANK_TRANSFER", "STORE_CREDIT"]),
      revenueChange: reportGrowth(current.revenue, previous.revenue), transactionChange: reportGrowth(new Prisma.Decimal(sales.length), new Prisma.Decimal(previousSales.length)), profitChange: reportGrowth(current.profit, previous.profit),
      topSellingItems: Array.from(current.items.entries()).map(([itemId, item]) => ({ itemId, itemName: item.name, itemNameFr: item.nameFr, itemSku: item.sku, quantitySold: item.quantity.toNumber(), revenue: item.revenue.toNumber(), profit: item.cost === null ? null : item.net.minus(item.cost).toNumber() })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      hourlyBreakdown: Array.from(hours.entries()).map(([hour, bucket]) => ({ hour, revenue: bucket.revenue.toNumber(), transactions: bucket.transactions })),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

`+source.slice(end);
const itemBegin=source.indexOf('export async function getItemPerformanceReportReadModel'),itemEnd=source.indexOf('export async function getCashFlowReportReadModel');
source=source.slice(0,itemBegin)+`export async function getItemPerformanceReportReadModel(input: AnalyticsReportReadModelInput): Promise<ItemPerformanceReport[]> {
  return db.$transaction(async tx => {
    const scope = await completedReportScope(tx, input)
    const current = await completedSalesEvidence(tx, scope.organizationId, await completedReportSales(tx, scope))
    const previous = await completedSalesEvidence(tx, scope.organizationId, await completedReportSales(tx, scope, scope.previousStart, scope.start))
    const items = await tx.item.findMany({
      where: { organizationId: scope.organizationId, OR: [{ deletedAt: null, isActive: true }, { id: { in: [...current.items.keys()] } }] },
      include: { category: { select: { titleEn: true } }, brand: { select: { nameEn: true } }, inventoryLevels: { where: scope.locationId ? { locationId: scope.locationId } : undefined, select: { quantityOnHand: true, quantityAvailable: true, quantityReserved: true, totalValue: true } } },
    })
    const provenance = buildReportProvenance({ ...scope, sourceTables: ["item", "inventoryLevel", "salesOrderLine", "salesOrder", "inventoryTransaction"], rowCount: items.length })
    return items.map(item => {
      const sale = current.items.get(item.id), prior = previous.items.get(item.id), zero = new Prisma.Decimal(0)
      const revenue = sale?.revenue ?? zero, net = sale?.net ?? zero, quantity = sale?.quantity ?? zero, cost = sale ? sale.cost : zero
      const profit = cost === null ? null : net.minus(cost)
      const stock = (field: "quantityOnHand" | "quantityAvailable" | "quantityReserved" | "totalValue") => item.inventoryLevels.reduce((sum, level) => sum.plus(reportDecimal(level[field])), zero).toNumber()
      const currentStock = stock("quantityOnHand"), availableToSell = stock("quantityAvailable"), quantitySold = quantity.toNumber()
      const revenueChange = reportGrowth(revenue, prior?.revenue ?? zero), quantityChange = reportGrowth(quantity, prior?.quantity ?? zero)
      return {
        provenance, itemId: item.id, itemName: item.nameEn, itemNameFr: item.nameFr, itemSku: item.sku, category: item.category?.titleEn || "Uncategorized", brand: item.brand?.nameEn || "Unbranded",
        quantitySold, totalRevenue: revenue.toNumber(), netRevenue: net.toNumber(), totalCost: cost?.toNumber() ?? null, grossProfit: profit?.toNumber() ?? null, profitMargin: profit !== null && net.gt(0) ? profit.div(net).times(100).toNumber() : null,
        costEvidence: sale?.costEvidence ?? { basis: "ORIGINAL_STOCK_ISSUES", coveredGroups: 0, uncoveredGroups: 0 },
        averageSellingPrice: quantity.gt(0) ? revenue.div(quantity).toNumber() : toNumber(item.sellingPrice),
        currentStock, availableToSell, reservedStock: stock("quantityReserved"), stockValue: stock("totalValue"),
        turnoverRate: currentStock > 0 ? quantitySold / currentStock : quantitySold > 0 ? quantitySold : 0,
        daysOfStock: quantitySold > 0 ? currentStock / quantitySold * scope.calendarDays : null, daysOfAvailableStock: quantitySold > 0 ? availableToSell / quantitySold * scope.calendarDays : null,
        stockScope: scope.locationId ? "location" : "organization", stockScopeLabel: scope.locationId ? "Selected report location" : "Organization-wide stock",
        stockStatus: availableToSell <= 0 ? "out_of_stock" : availableToSell <= toNumber(item.minStockLevel) ? "low_stock" : "in_stock",
        salesTrend: quantityChange === null ? "unavailable" : quantityChange > 0 ? "increasing" : quantityChange < 0 ? "decreasing" : "stable", revenueChange, quantityChange,
      }
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

`+source.slice(itemEnd);
fs.writeFileSync(file,source);
