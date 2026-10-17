import "server-only"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { getCustomerAROpenItems } from "@/services/accounting/ar-open-item.service"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { reportDecimal } from "./completed-sales-evidence"
import { salesInsightsScope, type SalesInsightsInput } from "./sales-insights-scope"

// These are receipts, not CREDIT/STORE_CREDIT liabilities or a synthetic MIXED tender.
const cashMethods = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE"] as const
export async function getSalesCollections(input: SalesInsightsInput, options: { includeCreditIssued?: boolean } = {}) {
  return db.$transaction(async tx => {
    const { scope, organization, now, period } = await salesInsightsScope(tx, input)
    // Payment-period scope intentionally ignores order date, status, channel and record search.
    const sale = { organizationId: organization.id, ...(scope.locationId ? { locationId: scope.locationId } : {}) }
    const range = { gte: period.startAt, lt: period.endAt }
    const paymentBase: Prisma.PaymentWhereInput = { organizationId: organization.id, deletedAt: null, purchaseOrderId: null, salesOrder: sale, method: { in: [...cashMethods] }, status: { in: ["PAID", "REFUNDED"] } }
    const payments = await tx.payment.groupBy({ by: ["method"], where: { ...paymentBase, processedAt: range }, _sum: { amount: true } })
    const credit = options.includeCreditIssued === false ? { _sum: { amount: null } } : await tx.payment.aggregate({ where: { organizationId: organization.id, deletedAt: null, purchaseOrderId: null, method: "CREDIT", status: { not: "CANCELLED" }, salesOrder: { ...sale, deletedAt: null, orderDate: range, status: { in: scope.status ? [scope.status] : ["COMPLETED", "DELIVERED"] }, ...(scope.channel ? { channel: scope.channel } : {}) } }, _sum: { amount: true } })
    const refunds = await tx.paymentRefund.aggregate({ where: { organizationId: organization.id, status: "PROCESSED", processedAt: range, payment: { ...paymentBase, status: { in: ["PAID", "REFUNDED"] } } }, _sum: { amount: true } })
    // Settlement posting writes allocations and ledger entries, never Payment rows.
    // Aggregate allocations to attribute split-location receipts without counting the header again.
    const allocationBase: Prisma.CustomerSettlementAllocationWhereInput = { organizationId: organization.id, salesOrder: sale }
    const settlementBase: Prisma.CustomerSettlementWhereInput = { organizationId: organization.id, currency: organization.currency, method: { in: [...cashMethods] }, status: { in: ["POSTED", "REVERSED"] } }
    const settlements = await tx.customerSettlementAllocation.findMany({ where: { ...allocationBase, customerSettlement: { ...settlementBase, OR: [{ settlementDate: range }, { status: "REVERSED", reversalDate: range }] } }, select: { amount: true, customerSettlement: { select: { method: true, settlementDate: true, reversalDate: true, status: true } } }, take: 5001 })
    if (settlements.length > 5000) throw new BusinessRuleError("Collection evidence exceeds the bounded dashboard scope")
    const missingPaymentTimes = await tx.payment.count({ where: { ...paymentBase, processedAt: null } })
    const missingRefundTimes = await tx.paymentRefund.count({ where: { organizationId: organization.id, status: "PROCESSED", processedAt: null, payment: paymentBase } })
    const missingReversalTimes = await tx.customerSettlementAllocation.count({ where: { ...allocationBase, customerSettlement: { ...settlementBase, status: "REVERSED", reversalDate: null } } })
    const methods = new Map<string, Prisma.Decimal>(payments.map(row => [row.method, reportDecimal(row._sum.amount ?? 0)]))
    let reversals = new Prisma.Decimal(0)
    const inPeriod = (date: Date | null) => date !== null && date >= period.startAt && date < period.endAt
    for (const allocation of settlements) {
      const settlement = allocation.customerSettlement, amount = reportDecimal(allocation.amount)
      if (inPeriod(settlement.settlementDate)) methods.set(settlement.method, (methods.get(settlement.method) ?? new Prisma.Decimal(0)).plus(amount))
      if (settlement.status === "REVERSED" && inPeriod(settlement.reversalDate)) reversals = reversals.plus(amount)
    }
    const receipts = [...methods.values()].reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0)), refundAmount = reportDecimal(refunds._sum.amount ?? 0)
    return { currency: organization.currency, timezone: organization.timezone, checkedAt: now.toISOString(), start: period.start, end: period.end,
      receipts: receipts.toFixed(2), creditIssued: reportDecimal(credit._sum.amount ?? 0).toFixed(2), refunds: refundAmount.toFixed(2), reversals: reversals.toFixed(2), net: missingPaymentTimes || missingRefundTimes || missingReversalTimes ? null : receipts.minus(refundAmount).minus(reversals).toFixed(2),
      missingTimes: missingPaymentTimes + missingRefundTimes + missingReversalTimes,
      methods: [...methods].sort(([a], [b]) => a.localeCompare(b)).map(([method, amount]) => ({ method, amount: amount.toFixed(2), percent: receipts.gt(0) ? amount.div(receipts).times(100).toFixed(2) : null })),
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getSalesReceivables(input: SalesInsightsInput) {
  return db.$transaction(async tx => {
    const { scope, organization, now } = await salesInsightsScope(tx, input)
    const report = await getCustomerAROpenItems({ organizationId: organization.id, locationId: scope.locationId, asOf: now, recordedThrough: now, maxDocuments: 1000, includeAllocations: false, client: tx })
    return { timezone: organization.timezone, checkedAt: report.recordedThrough, currencies: report.summariesByCurrency.map(row => {
      const open = report.items.filter(item => item.currency.trim().toUpperCase() === row.currency && ["open", "partial"].includes(item.status))
      const sum = (overdue: boolean) => open.filter(item => !overdue || item.daysPastDue > 0).reduce((total, item) => total.plus(item.openAmount), new Prisma.Decimal(0)).toFixed(2)
      return { currency: row.currency, outstanding: sum(false), overdue: sum(true), count: open.length }
    }), documentCount: report.summary.itemCount }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}
