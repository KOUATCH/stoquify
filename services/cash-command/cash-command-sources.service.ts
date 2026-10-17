import "server-only"

import { PaymentStatus, PayrollEmployeeBalanceCaseStatus, PurchaseOrderStatus } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"
import { observeModuleReadAccessBatch } from "@/services/modules/module-access-batch.service"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { getPayrollFinanceForecast, payrollForecastBlockers } from "@/services/payroll/payroll-finance-forecast.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { createFreshness, createSnapshotSourceHash, maxDate, normalizeSnapshotScope, toNumber } from "@/services/snapshots/snapshot-utils"
import type { SnapshotResult, SnapshotScopeInput, SnapshotBlocker, SnapshotSourceModule, PayrollFinanceForecastMetrics } from "@/services/snapshots/snapshot-contracts"
import { createBusinessSignalFromFact } from "@/services/signals/business-signal-rules.service"
import type { BusinessSignal } from "@/services/signals/business-signal-contracts"

export type CashSource<T> = Omit<SnapshotResult<T>, "kind"> & { kind: string }
export type CashOperatingMetrics = {
  cashCollected: number | null
  activeEmployeeBalanceCaseCount: number | null
  employeeBalanceOutstandingAmount: number | null
  payrollFinanceForecast: PayrollFinanceForecastMetrics | null
}

type Input = SnapshotScopeInput & { actorId: string; actorPermissions: readonly string[]; currency: string }

/** Internal read model: the caller first establishes current tenant-wide authority. */
export async function getCashCommandSources(input: Input) {
  const scope = normalizeSnapshotScope(input)
  const sourcePermissions: readonly (readonly [CommercialModuleSlug, string])[] = [
    ["finance", "finance.read"], ["payment_reconciliation", "payments.reconciliation.read"],
    ["inventory", "inventory.read"], ["close_assurance", "accounting.close.read"],
    ["payroll", "payroll.payments.reconcile"], ["payroll", "payroll.declarations.manage"],
    ["purchasing", "purchases.orders.read"],
  ]
  const permitted = sourcePermissions.map(([, permission]) => hasRbacPermission(input.actorPermissions, permission))
  const moduleSlugs = sourcePermissions.filter((_, index) => permitted[index]).map(([slug]) => slug)
  const decisions = moduleSlugs.length ? await observeModuleReadAccessBatch({
    organizationId: scope.organizationId, userId: input.actorId, actorPermissions: input.actorPermissions,
    moduleSlugs, surfaceType: "report", surface: "cash-command.source", audit: true, now: scope.now,
  }) : new Map()
  const [finance, reconciliation, inventory, close, payrollPayments, payrollDeclarations, purchasing] =
    sourcePermissions.map(([slug], index) => permitted[index] && decisions.get(slug)?.allowed === true)
  function source<T>(kind: string, metrics: T, modules: SnapshotSourceModule[], updatedAt: Date | null,
    blockers: SnapshotBlocker[] = [], empty = false, evidenceHash: string | null = null): CashSource<T> {
    const freshness = createFreshness({ generatedAt: scope.now, sourceMaxUpdatedAt: updatedAt, maxAgeMinutes: scope.maxAgeMinutes })
    const blocked = blockers.some(item => item.severity === "high" || item.severity === "critical")
    const status = blocked ? "blocked" : empty ? "empty" : freshness.stale ? "stale" : "fresh"
    return { kind, organizationId: scope.organizationId, locationId: null, periodStart: scope.periodStart.toISOString(),
      periodEnd: scope.periodEnd.toISOString(), generatedAt: scope.now.toISOString(), metrics, sourceModules: modules,
      status, uiState: status, evidenceGrade: blocked ? "blocked" : "operational", freshness, blockers, redactions: [],
      sourceHash: createSnapshotSourceHash({ kind, organizationId: scope.organizationId, periodStart: scope.periodStart,
        periodEnd: scope.periodEnd, metrics, updatedAt, blockers, evidenceHash }) }
  }
  const period = { gte: scope.periodStart, lte: scope.periodEnd }
  const [paymentTruth, inventoryCash, closeReadiness, cash, balance, purchase] = await Promise.all([
    reconciliation ? getPaymentTruthSnapshot(scope) : null,
    inventory ? getInventoryCashSnapshot(scope) : null,
    close ? getCloseReadinessSnapshot(scope) : null,
    finance ? db.payment.aggregate({ where: { organizationId: scope.organizationId, deletedAt: null,
      status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIAL] }, createdAt: period },
      _sum: { amount: true }, _max: { updatedAt: true }, _count: { _all: true } }) : null,
    payrollPayments ? db.payrollEmployeeBalanceCase.groupBy({ by: ["currency"], orderBy: { currency: "asc" },
      where: { organizationId: scope.organizationId, status: { in: [PayrollEmployeeBalanceCaseStatus.OPEN, PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED] } },
      _sum: { outstandingAmount: true }, _count: { _all: true }, _max: { updatedAt: true } }) : null,
    purchasing ? db.purchaseOrder.groupBy({ by: ["expectedDeliveryDate"],
      where: { organizationId: scope.organizationId, deletedAt: null, status: { in: [PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED] } },
      _count: { _all: true }, _max: { updatedAt: true } }) : null,
  ])
  const cashCollected = cash ? source("cash.collected", { cashCollected: toNumber(cash._sum.amount) }, ["finance"], cash._max.updatedAt, [], cash._count._all === 0) : null
  const balanceGroups = balance?.map(row => ({ currencyCode: row.currency, amount: toNumber(row._sum.outstandingAmount), count: row._count._all }))
  const balanceMismatch = balanceGroups?.some(row => row.currencyCode !== input.currency) ?? false
  const balanceCount = balanceGroups?.reduce((sum, row) => sum + row.count, 0) ?? null
  const balanceAmount = balanceGroups ? balanceMismatch ? null : balanceGroups[0]?.amount ?? 0 : null
  const balanceBlockers: SnapshotBlocker[] = balanceMismatch ? [{ id: "cash-payroll-balance-currency-mismatch", gate: "payroll_employee_balance", severity: "high",
    title: "Employee balance currencies cannot be combined", detail: `Amounts by currency: ${balanceGroups!.map(row => `${row.amount.toFixed(2)} ${row.currencyCode}`).join("; ")}. No conversion evidence establishes a total in ${input.currency}.`,
    sourceTables: ["payroll_employee_balance_cases"], nextAction: "Review payroll balances by currency." }] : []
  if (balanceCount !== null && balanceCount > 0) balanceBlockers.push({ id: "cash-payroll-balance-open", gate: "payroll_employee_balance", severity: "high",
    title: "Employee balance recovery cases are open", detail: `${balanceCount} active employee balance case(s) remain open.`,
    sourceTables: ["payroll_employee_balance_cases"], nextAction: "Open payroll payments and review recovery cases." })
  const payrollBalance = balance ? source("payroll.balance", { activeEmployeeBalanceCaseCount: balanceCount!, employeeBalanceOutstandingAmount: balanceAmount,
    currencyCode: input.currency, balancesByCurrency: balanceGroups! }, ["payroll"], maxDate(balance.map(row => row._max.updatedAt)), balanceBlockers, balanceCount === 0) : null

  // Forecast proof is a payroll-owned operation. An unavailable payment source
  // cannot silently stand in for provider evidence or an empty successful query.
  const forecast = payrollPayments || payrollDeclarations
    ? await getPayrollFinanceForecast({ scope, paymentTruth, currency: input.currency }) : null
  const payrollForecast = forecast ? source("payroll.forecast", forecast.metrics, ["payroll"], forecast.sourceMaxUpdatedAt, payrollForecastBlockers(forecast.metrics), forecast.metrics.reasonCode === "PAYROLL_FORECAST_NO_UPCOMING_PERIODS", forecast.sourceEvidenceHash) : null
  if (payrollForecast) {
    if (!payrollForecast.metrics.authoritative || payrollForecast.metrics.blockerCodes.length > 0) {
      payrollForecast.status = payrollForecast.uiState = "blocked"
      payrollForecast.evidenceGrade = "blocked"
    } else if (payrollForecast.metrics.reasonCode === "PAYROLL_FORECAST_SOURCE_LINKED") {
      payrollForecast.evidenceGrade = "posted"
    }
  }
  const operating = source<CashOperatingMetrics>("cash.command", { cashCollected: cashCollected?.metrics.cashCollected ?? null,
    activeEmployeeBalanceCaseCount: balanceCount, employeeBalanceOutstandingAmount: balanceAmount,
    payrollFinanceForecast: payrollForecast?.metrics ?? null }, [], null)
  const signals: BusinessSignal[] = []
  if (purchase) {
    const pending = purchase.reduce((sum, row) => sum + row._count._all, 0)
    const overdue = purchase.filter(row => row.expectedDeliveryDate && row.expectedDeliveryDate < scope.now).reduce((sum, row) => sum + row._count._all, 0)
    if (overdue > 0) signals.push(createBusinessSignalFromFact({ organizationId: scope.organizationId, moduleSlug: "purchasing", sourceModule: "purchasing",
      signalType: "purchase_order_receiving_delay", subjectType: "purchase.order", subjectId: "pending-receiving", severity: overdue >= 5 ? "high" : "medium",
      detail: `${overdue} pending purchase order(s) have passed their recorded expected delivery time.`, generatedAt: scope.now,
      freshness: createFreshness({ generatedAt: scope.now, sourceMaxUpdatedAt: maxDate(purchase.map(row => row._max.updatedAt)), maxAgeMinutes: scope.maxAgeMinutes }),
      payload: { pendingPurchaseOrderCount: pending, overduePurchaseOrderCount: overdue } }, scope.now))
  }
  if (payrollBalance && balanceCount! > 0) signals.push(createBusinessSignalFromFact({ organizationId: scope.organizationId, moduleSlug: "payroll", sourceModule: "payroll",
    signalType: "payroll_exposure", subjectType: "payroll.employee_balance", subjectId: "active-employee-balance", severity: (balanceAmount ?? 0) >= 500_000 || balanceCount! >= 3 ? "high" : "medium",
    actionPath: "/dashboard/payroll/payments", requiredPermission: "payments.reconciliation.read", additionalRequiredPermissions: ["payroll.payments.reconcile"],
    generatedAt: scope.now, freshness: payrollBalance.freshness, blockers: payrollBalance.blockers,
    suggestedAction: "Review employee balance recovery evidence before payment and close claims are trusted.",
    payload: { activeEmployeeBalanceCaseCount: balanceCount, employeeBalanceOutstandingAmount: balanceAmount, personLevelAmounts: "hidden" } }, scope.now))
  if (payrollPayments && payrollDeclarations && payrollForecast && payrollForecast.blockers.length > 0) signals.push(createBusinessSignalFromFact({ organizationId: scope.organizationId, moduleSlug: "payroll", sourceModule: "payroll",
    signalType: "payroll_exposure", subjectType: "payroll.forecast", subjectId: "payroll-finance-forecast", title: "Payroll forecast proof is blocked", detail: payrollForecast.metrics.message,
    severity: "high", severityScore: 85, generatedAt: scope.now, freshness: payrollForecast.freshness, blockers: payrollForecast.blockers,
    actionPath: payrollPayments ? "/dashboard/payroll/payments" : "/dashboard/payroll/declarations", requiredPermission: payrollPayments ? "payments.reconciliation.read" : "payroll.command.read",
    additionalRequiredPermissions: [payrollPayments ? "payroll.payments.reconcile" : "payroll.declarations.manage"],
    payload: { personLevelAmounts: "hidden" } }, scope.now))
  const denied = (id: string, title: string, permission: string) => ({ id, title,
    reason: hasRbacPermission(input.actorPermissions, permission) ? "module_unavailable" as const : "permission_denied" as const })
  return { operating, paymentTruth, inventoryCash, closeReadiness, cashCollected, payrollBalance, payrollForecast, signals,
    restrictions: [
      ...(!finance ? [denied("cash_collected", "Cash collected", "finance.read")] : []),
      ...(!reconciliation ? [denied("unreconciled_cash", "Unreconciled cash", "payments.reconciliation.read")] : []),
      ...(!inventory ? [denied("stock_cash_buffer", "Stock cash buffer", "inventory.read")] : []),
      ...(!payrollPayments ? [denied("employee_balance_recovery", "Employee balance recovery", "payroll.payments.reconcile")] : []),
      ...(!payrollPayments ? [denied("upcoming_payroll_net_pay", "Upcoming net pay", "payroll.payments.reconcile")] : []),
      ...(!payrollDeclarations ? [denied("upcoming_statutory_liability", "Upcoming statutory liability", "payroll.declarations.manage")] : []),
      ...(!close ? [denied("close_readiness", "Close readiness", "accounting.close.read")] : []),
      ...(!purchasing ? [denied("purchase_receiving", "Purchase receiving", "purchases.orders.read")] : []),
    ] }
}
