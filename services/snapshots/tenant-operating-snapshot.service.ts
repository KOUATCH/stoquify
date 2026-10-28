import "server-only"

import {
  JournalEntryStatus,
  PaymentStatus,
  PayrollEmployeeBalanceCaseStatus,
  PayrollEmployeeBalanceEventType,
  PayrollRunStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
  WorkflowAssuranceIncidentStatus,
  WorkflowAssuranceSeverity,
  WorkflowAssuranceWorkflow,
} from "@prisma/client"

import { db } from "@/prisma/db"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import { getPayrollFinanceForecast, payrollForecastBlockers, type PayrollFinanceForecastResult } from "@/services/payroll/payroll-finance-forecast.service"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  NormalizedSnapshotScope,
  PaymentTruthMetrics,
  PayrollFinanceForecastMetrics,
  SnapshotBlocker,
  TenantOperatingCommandBlockerState,
  TenantOperatingCommandCard,
  SnapshotResult,
  SnapshotScopeInput,
  TenantOperatingMetrics,
} from "./snapshot-contracts"
import { getCloseReadinessSnapshot } from "./close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "./inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "./payment-truth-snapshot.service"
import {
  blocker,
  buildSnapshotResult,
  createFreshness,
  maxDate,
  normalizeSnapshotScope,
  toNumber,
  weakestEvidenceGrade,
} from "./snapshot-utils"

const COMPLETED_SALES_STATUSES = [
  SalesOrderStatus.COMPLETED,
  SalesOrderStatus.DELIVERED,
]
const CASH_COLLECTED_STATUSES = [PaymentStatus.PAID, PaymentStatus.PARTIAL]
const PENDING_PURCHASE_STATUSES = [
  PurchaseOrderStatus.SUBMITTED,
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
]
const APPROVED_OR_PAID_PAYROLL_STATUSES = [
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.EMITTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.POSTED,
  PayrollRunStatus.ARCHIVED,
]
const ACTIVE_EMPLOYEE_BALANCE_CASE_STATUSES = [
  PayrollEmployeeBalanceCaseStatus.OPEN,
  PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
]
const EMPLOYEE_BALANCE_SETTLEMENT_EVENT_TYPES = [
  PayrollEmployeeBalanceEventType.SETTLE_CASH,
  PayrollEmployeeBalanceEventType.SETTLE_BANK,
  PayrollEmployeeBalanceEventType.SETTLE_MOBILE_MONEY,
  PayrollEmployeeBalanceEventType.SETTLE_DEDUCTION,
  PayrollEmployeeBalanceEventType.REFUND_PAYMENT,
]
const LEDGER_TRUST_INCIDENT_STATUSES: WorkflowAssuranceIncidentStatus[] = [
  WorkflowAssuranceIncidentStatus.OPEN,
  WorkflowAssuranceIncidentStatus.ACKNOWLEDGED,
  WorkflowAssuranceIncidentStatus.ASSIGNED,
  WorkflowAssuranceIncidentStatus.IN_PROGRESS,
  WorkflowAssuranceIncidentStatus.REOPENED,
]
const LEDGER_TRUST_INCIDENT_SEVERITIES: WorkflowAssuranceSeverity[] = [
  WorkflowAssuranceSeverity.HIGH,
  WorkflowAssuranceSeverity.BLOCKING,
  WorkflowAssuranceSeverity.COMPLIANCE_CRITICAL,
]
const LEDGER_TRUST_INCIDENT_WORKFLOWS: WorkflowAssuranceWorkflow[] = [
  WorkflowAssuranceWorkflow.LEDGER,
  WorkflowAssuranceWorkflow.BUSINESS_EVENT,
  WorkflowAssuranceWorkflow.COMPLIANCE,
]
export async function getTenantOperatingSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<TenantOperatingMetrics>> {
  const scope = normalizeSnapshotScope(input)
  if (scope.locationId) {
    return buildLocationScopeUnsupportedSnapshot(scope)
  }

  const [paymentTruth, inventoryCash, closeReadiness] = await Promise.all([
    getPaymentTruthSnapshot(scope),
    getInventoryCashSnapshot(scope),
    getCloseReadinessSnapshot(scope),
  ])

  return buildTenantOperatingSnapshot({
    scope,
    paymentTruth,
    inventoryCash,
    closeReadiness,
  })
}

export async function getTenantOperatingSnapshotFromRelated(
  input: SnapshotScopeInput,
  related: {
    paymentTruth: SnapshotResult<PaymentTruthMetrics>
    inventoryCash: SnapshotResult<InventoryCashMetrics>
    closeReadiness: SnapshotResult<CloseReadinessMetrics>
  },
): Promise<SnapshotResult<TenantOperatingMetrics>> {
  const scope = normalizeSnapshotScope(input)
  if (scope.locationId) {
    return buildLocationScopeUnsupportedSnapshot(scope)
  }

  return buildTenantOperatingSnapshot({
    scope,
    ...related,
  })
}

function buildLocationScopeUnsupportedSnapshot(
  scope: NormalizedSnapshotScope,
): SnapshotResult<TenantOperatingMetrics> {
  const reasonCode = "TENANT_OPERATING_LOCATION_SCOPE_UNSUPPORTED"

  return buildSnapshotResult({
    kind: "tenant.operating",
    scope,
    status: "blocked",
    evidenceGrade: "blocked",
    sourceModules: [
      "dashboard",
      "sales",
      "payments",
      "inventory",
      "purchasing",
      "hris",
      "payroll",
      "accounting",
      "close",
      "compliance",
    ],
    metrics: {
      activeLocationCount: 0,
      completedSalesCount: 0,
      completedSalesRevenue: 0,
      cashCollected: 0,
      pendingPurchaseOrderCount: 0,
      overduePurchaseOrderCount: null,
      approvedOrPaidPayrollRunCount: 0,
      activeEmployeeBalanceCaseCount: 0,
      openEmployeeBalanceCaseCount: 0,
      partiallySettledEmployeeBalanceCaseCount: 0,
      employeeBalanceOutstandingAmount: 0,
      periodEmployeeBalanceSettlementCount: 0,
      periodEmployeeBalanceSettlementAmount: 0,
      postedJournalEntryCount: 0,
      sourceLinkCount: 0,
      payrollFinanceForecast: {
        status: "NON_AUTHORITATIVE",
        authoritative: false,
        reasonCode,
        message:
          "Tenant operating truth is not available for a location-scoped request.",
        horizonStart: scope.periodStart.toISOString(),
        horizonEnd: scope.periodEnd.toISOString(),
        upcomingNetPayAmount: null,
        upcomingStatutoryLiabilityAmount: null,
        totalUpcomingAmount: null,
        payrollPeriodCount: 0,
        payrollRunCount: 0,
        paymentBatchCount: 0,
        declarationCount: 0,
        sourceLinkCount: 0,
        evidenceHashCount: 0,
        certifiedInputRunCount: 0,
        certifiedInputProofHashCount: 0,
        registerToLedgerRunCount: 0,
        nextPayDate: null,
        nextDeclarationDueDate: null,
        personLevelAmountsRedacted: true,
        blockerCodes: [reasonCode],
      },
      paymentTruth: {
        providerAccountCount: 0,
        activeProviderAccountCount: 0,
        recentRunCount: 0,
        readyForSignoffCount: 0,
        signedRunCount: 0,
        openExceptionCount: 0,
        criticalExceptionCount: 0,
        openSuspenseCount: 0,
        openSuspenseAmount: 0,
        pendingTransactionCount: 0,
      },
      inventoryCash: {
        trackedItemCount: 0,
        inventoryLevelCount: 0,
        quantityOnHand: 0,
        quantityAvailable: 0,
        quantityReserved: 0,
        quantityInTransit: 0,
        quantityOnOrder: 0,
        inventoryValue: 0,
        zeroStockLevelCount: 0,
        negativeStockLevelCount: 0,
        periodTransactionCount: 0,
        periodAdjustmentCount: 0,
        periodTransferCount: 0,
      },
      closeReadiness: {
        accountingPeriodCount: 0,
        openPeriodCount: 0,
        recentCloseRunCount: 0,
        certifiedCloseRunCount: 0,
        blockedCloseRunCount: 0,
        averageReadinessScore: null,
        openFindingCount: 0,
        criticalOpenFindingCount: 0,
        unavailableEvidenceCount: 0,
      },
    },
    blockers: [
      blocker({
        id: "tenant-operating-location-scope-unsupported",
        severity: "high",
        gate: "tenant_operating_scope",
        title: "Location-scoped tenant operating truth is unavailable",
        detail:
          "Tenant operating sources cannot yet prove a complete location allocation, so no tenant-wide values are returned for this location.",
        sourceTables: [
          "locations",
          "sales_orders",
          "payments",
          "purchase_orders",
          "payroll_runs",
          "journal_entries",
          "accounting_source_links",
          "workflow_assurance_incidents",
        ],
        nextAction:
          "Use branch operating truth until every tenant operating source supports location allocation.",
      }),
    ],
    redactions: [],
    sourceMaxUpdatedAt: null,
    sourceHashParts: {
      scopeSupport: "TENANT_ONLY",
      reasonCode,
    },
  })
}

async function buildTenantOperatingSnapshot(input: {
  scope: NormalizedSnapshotScope
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
  inventoryCash: SnapshotResult<InventoryCashMetrics>
  closeReadiness: SnapshotResult<CloseReadinessMetrics>
}): Promise<SnapshotResult<TenantOperatingMetrics>> {
  const { scope, paymentTruth, inventoryCash, closeReadiness } = input
  const periodWhere = { gte: scope.periodStart, lte: scope.periodEnd }
  const organization = await db.organization.findFirst({ where: { id: scope.organizationId }, select: { currency: true } })
  if (!organization) throw new Error("Organization is unavailable for tenant operating snapshot")

  const [
    activeLocationCount,
    salesTotals,
    completedSalesCount,
    cashCollected,
    pendingPurchaseOrderCount,
    overduePurchaseOrderCount,
    approvedOrPaidPayrollRunCount,
    activeEmployeeBalanceCaseCount,
    openEmployeeBalanceCaseCount,
    partiallySettledEmployeeBalanceCaseCount,
    employeeBalanceOutstanding,
    periodEmployeeBalanceSettlementCount,
    periodEmployeeBalanceSettlement,
    postedJournalEntryCount,
    sourceLinkCount,
    payrollFinanceForecast,
    latestLocation,
    latestSale,
    latestPayment,
    latestPurchaseOrder,
    latestPayrollRun,
    latestEmployeeBalanceCase,
    latestEmployeeBalanceEvent,
    latestJournalEntry,
    latestSourceLink,
    ledgerTrustIncidentCount,
    latestLedgerTrustIncident,
  ] = await Promise.all([
    db.location.count({
      where: {
        organizationId: scope.organizationId,
        isActive: true,
        deletedAt: null,
      },
    }),
    db.salesOrder.aggregate({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        status: { in: COMPLETED_SALES_STATUSES },
        orderDate: periodWhere,
      },
      _sum: { total: true },
    }),
    db.salesOrder.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        status: { in: COMPLETED_SALES_STATUSES },
        orderDate: periodWhere,
      },
    }),
    db.payment.aggregate({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        status: { in: CASH_COLLECTED_STATUSES },
        createdAt: periodWhere,
      },
      _sum: { amount: true },
    }),
    db.purchaseOrder.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        status: { in: PENDING_PURCHASE_STATUSES },
      },
    }),
    db.purchaseOrder.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        status: { in: PENDING_PURCHASE_STATUSES },
        expectedDeliveryDate: { lt: scope.now },
      },
    }),
    db.payrollRun.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        status: { in: APPROVED_OR_PAID_PAYROLL_STATUSES },
        createdAt: periodWhere,
      },
    }),
    db.payrollEmployeeBalanceCase.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: ACTIVE_EMPLOYEE_BALANCE_CASE_STATUSES },
      },
    }),
    db.payrollEmployeeBalanceCase.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollEmployeeBalanceCaseStatus.OPEN,
      },
    }),
    db.payrollEmployeeBalanceCase.count({
      where: {
        organizationId: scope.organizationId,
        status: PayrollEmployeeBalanceCaseStatus.PARTIALLY_SETTLED,
      },
    }),
    db.payrollEmployeeBalanceCase.groupBy({
      by: ["currency"],
      orderBy: { currency: "asc" },
      where: {
        organizationId: scope.organizationId,
        status: { in: ACTIVE_EMPLOYEE_BALANCE_CASE_STATUSES },
      },
      _sum: { outstandingAmount: true },
      _count: { _all: true },
    }),
    db.payrollEmployeeBalanceEvent.count({
      where: {
        organizationId: scope.organizationId,
        eventType: { in: EMPLOYEE_BALANCE_SETTLEMENT_EVENT_TYPES },
        eventDate: periodWhere,
      },
    }),
    db.payrollEmployeeBalanceEvent.groupBy({
      by: ["currency"],
      orderBy: { currency: "asc" },
      where: {
        organizationId: scope.organizationId,
        eventType: { in: EMPLOYEE_BALANCE_SETTLEMENT_EVENT_TYPES },
        eventDate: periodWhere,
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.journalEntry.count({
      where: {
        organizationId: scope.organizationId,
        status: JournalEntryStatus.POSTED,
        entryDate: periodWhere,
      },
    }),
    db.accountingSourceLink.count({
      where: {
        organizationId: scope.organizationId,
        sourceDate: periodWhere,
      },
    }),
    getPayrollFinanceForecast({ scope, paymentTruth, currency: organization.currency }),
    db.location.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.salesOrder.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.payment.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.purchaseOrder.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.payrollRun.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.payrollEmployeeBalanceCase.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.payrollEmployeeBalanceEvent.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.journalEntry.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    db.accountingSourceLink.findFirst({
      where: { organizationId: scope.organizationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    db.workflowAssuranceIncident.count({
      where: {
        organizationId: scope.organizationId,
        status: { in: LEDGER_TRUST_INCIDENT_STATUSES },
        severity: { in: LEDGER_TRUST_INCIDENT_SEVERITIES },
        workflow: { in: LEDGER_TRUST_INCIDENT_WORKFLOWS },
      },
    }),
    db.workflowAssuranceIncident.findFirst({
      where: {
        organizationId: scope.organizationId,
        status: { in: LEDGER_TRUST_INCIDENT_STATUSES },
        severity: { in: LEDGER_TRUST_INCIDENT_SEVERITIES },
        workflow: { in: LEDGER_TRUST_INCIDENT_WORKFLOWS },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        checkKey: true,
        title: true,
        severity: true,
        status: true,
        actionRoute: true,
        updatedAt: true,
      },
    }),
  ])

  const employeeBalanceOutstandingByCurrency = employeeBalanceOutstanding.map(group => ({ currencyCode: group.currency, amount: toNumber(group._sum.outstandingAmount), count: group._count._all }))
  const periodEmployeeBalanceSettlementByCurrency = periodEmployeeBalanceSettlement.map(group => ({ currencyCode: group.currency, amount: toNumber(group._sum.amount), count: group._count._all }))
  const outstandingCurrencyMismatch = employeeBalanceOutstandingByCurrency.some(group => group.currencyCode !== organization.currency)
  const settlementCurrencyMismatch = periodEmployeeBalanceSettlementByCurrency.some(group => group.currencyCode !== organization.currency)
  const metricsBase: Omit<TenantOperatingMetrics, "commandCards"> = {
    activeLocationCount,
    completedSalesCount,
    completedSalesRevenue: toNumber(salesTotals._sum.total),
    cashCollected: toNumber(cashCollected._sum.amount),
    pendingPurchaseOrderCount,
    overduePurchaseOrderCount,
    approvedOrPaidPayrollRunCount,
    activeEmployeeBalanceCaseCount,
    openEmployeeBalanceCaseCount,
    partiallySettledEmployeeBalanceCaseCount,
    employeeBalanceOutstandingAmount: outstandingCurrencyMismatch ? null : employeeBalanceOutstandingByCurrency[0]?.amount ?? 0,
    employeeBalanceCurrencyCode: organization.currency,
    employeeBalanceOutstandingByCurrency,
    periodEmployeeBalanceSettlementCount,
    periodEmployeeBalanceSettlementAmount: settlementCurrencyMismatch ? null : periodEmployeeBalanceSettlementByCurrency[0]?.amount ?? 0,
    periodEmployeeBalanceSettlementByCurrency,
    postedJournalEntryCount,
    sourceLinkCount,
    payrollFinanceForecast: payrollFinanceForecast.metrics,
    paymentTruth: paymentTruth.metrics,
    inventoryCash: inventoryCash.metrics,
    closeReadiness: closeReadiness.metrics,
  }

  const blockers = [
    ...paymentTruth.blockers,
    ...inventoryCash.blockers,
    ...closeReadiness.blockers,
    ...payrollForecastBlockers(payrollFinanceForecast.metrics),
    ...([
      { mismatch: outstandingCurrencyMismatch, id: "tenant-payroll-balance-currency-mismatch", title: "Employee balance currencies cannot be combined", groups: employeeBalanceOutstandingByCurrency, table: "payroll_employee_balance_cases" },
      { mismatch: settlementCurrencyMismatch, id: "tenant-payroll-settlement-currency-mismatch", title: "Employee settlement currencies cannot be combined", groups: periodEmployeeBalanceSettlementByCurrency, table: "payroll_employee_balance_events" },
    ].filter(value => value.mismatch).map(value => blocker({
      id: value.id, gate: "payroll_employee_balance", severity: "high", title: value.title,
      detail: `Amounts by currency: ${value.groups.map(group => `${group.amount.toFixed(2)} ${group.currencyCode}`).join("; ")}. No conversion evidence establishes a total in ${organization.currency}.`,
      sourceTables: [value.table], nextAction: "Review payroll balances and settlements by currency; do not treat them as one converted total.",
    }))),
    ...(activeLocationCount === 0
      ? [
          blocker({
            id: "tenant-active-location-missing",
            severity: "medium",
            gate: "tenant_operating_snapshot",
            title: "No active location is configured",
            detail:
              "Tenant operating truth is partial until at least one active branch or warehouse exists.",
            sourceTables: ["locations"],
            nextAction: "Create or reactivate a location.",
          }),
        ]
      : []),
    ...(postedJournalEntryCount > 0 && sourceLinkCount === 0
      ? [
          blocker({
            id: "tenant-ledger-source-link-gap",
            severity: "high",
            gate: "ledger_evidence",
            title: "Posted ledger activity lacks source links",
            detail:
              "Posted entries exist in the period, but source-link evidence coverage is zero.",
            sourceTables: ["journal_entries", "accounting_source_links"],
            nextAction:
              "Backfill or repair accounting source links for posted entries.",
          }),
        ]
      : []),
    ...(ledgerTrustIncidentCount > 0
      ? [
          blocker({
            id: "tenant-ledger-trust-assurance-incidents",
            severity: "critical",
            gate: "workflow_assurance",
            title: "Ledger assurance incidents are open",
            detail: `${ledgerTrustIncidentCount} unresolved ledger, business-event, or compliance assurance incident(s) are blocking trusted operating intelligence.`,
            sourceTables: [
              "workflow_assurance_incidents",
              "workflow_assurance_check_runs",
            ],
            nextAction:
              "Open Manager Action Center and resolve the blocking assurance incidents before relying on BI snapshots.",
          }),
        ]
      : []),
    ...(activeEmployeeBalanceCaseCount > 0
      ? [
          blocker({
            id: "tenant-payroll-employee-balance-open",
            severity: "high",
            gate: "payroll_employee_balance",
            title: "Employee balance recovery cases are open",
            detail: metricsBase.employeeBalanceOutstandingAmount === null
              ? `${activeEmployeeBalanceCaseCount} active employee balance case(s) remain open; a combined currency total is unavailable.`
              : `${activeEmployeeBalanceCaseCount} active employee balance case(s) have ${metricsBase.employeeBalanceOutstandingAmount.toFixed(2)} ${organization.currency} outstanding.`,
            sourceTables: [
              "payroll_employee_balance_cases",
              "payroll_employee_balance_events",
            ],
            nextAction:
              "Open payroll payments and settle, refund, or review employee balance recovery cases.",
          }),
        ]
      : []),
  ]

  const metrics: TenantOperatingMetrics = {
    ...metricsBase,
    commandCards: buildTenantOperatingCommandCards({
      scope,
      metrics: metricsBase,
      paymentTruth,
      inventoryCash,
      closeReadiness,
      payrollFinanceForecast,
      ledgerTrustIncidentCount,
      activeEmployeeBalanceCaseCount,
    }),
  }

  const redactions = [...paymentTruth.redactions]
  const status =
    completedSalesCount === 0 &&
    postedJournalEntryCount === 0 &&
    activeLocationCount === 0
      ? "empty"
      : [
            paymentTruth.status,
            inventoryCash.status,
            closeReadiness.status,
          ].includes("blocked") ||
          blockers.some(
            (item) => item.severity === "critical" || item.severity === "high",
          )
        ? "blocked"
        : [
              paymentTruth.status,
              inventoryCash.status,
              closeReadiness.status,
            ].some((status) => ["partial", "empty"].includes(status)) ||
            blockers.length > 0
          ? "partial"
          : "fresh"

  return buildSnapshotResult({
    kind: "tenant.operating",
    scope,
    status,
    evidenceGrade: tenantEvidenceGrade([
      paymentTruth.evidenceGrade,
      inventoryCash.evidenceGrade,
      closeReadiness.evidenceGrade,
      ledgerTrustIncidentCount > 0 || activeEmployeeBalanceCaseCount > 0 ||
      outstandingCurrencyMismatch || settlementCurrencyMismatch
        ? "blocked"
        : postedJournalEntryCount > 0
          ? "posted"
          : "raw",
      payrollFinanceForecast.metrics.authoritative ? "posted" : "blocked",
    ]),
    sourceModules: [
      "dashboard",
      "sales",
      "payments",
      "inventory",
      "purchasing",
      "hris",
      "payroll",
      "accounting",
      "close",
      "compliance",
    ],
    metrics,
    blockers,
    redactions,
    sourceMaxUpdatedAt: maxDate([
      paymentTruth.freshness.sourceMaxUpdatedAt,
      inventoryCash.freshness.sourceMaxUpdatedAt,
      closeReadiness.freshness.sourceMaxUpdatedAt,
      latestLocation?.updatedAt,
      latestSale?.updatedAt,
      latestPayment?.updatedAt,
      latestPurchaseOrder?.updatedAt,
      latestPayrollRun?.updatedAt,
      latestEmployeeBalanceCase?.updatedAt,
      latestEmployeeBalanceEvent?.createdAt,
      latestJournalEntry?.updatedAt,
      latestSourceLink?.createdAt,
      payrollFinanceForecast.sourceMaxUpdatedAt,
      latestLedgerTrustIncident?.updatedAt,
    ]),
    sourceHashParts: {
      paymentTruth: paymentTruth.sourceHash,
      inventoryCash: inventoryCash.sourceHash,
      closeReadiness: closeReadiness.sourceHash,
      ledgerTrustIncidentCount,
      latestLedgerTrustIncidentId: latestLedgerTrustIncident?.id ?? null,
      latestLedgerTrustIncidentCheckKey:
        latestLedgerTrustIncident?.checkKey ?? null,
      activeEmployeeBalanceCaseCount,
      openEmployeeBalanceCaseCount,
      partiallySettledEmployeeBalanceCaseCount,
      employeeBalanceOutstandingAmount:
        metrics.employeeBalanceOutstandingAmount,
      employeeBalanceCurrencyCode: organization.currency,
      employeeBalanceOutstandingByCurrency,
      periodEmployeeBalanceSettlementCount,
      periodEmployeeBalanceSettlementAmount:
        metrics.periodEmployeeBalanceSettlementAmount,
      periodEmployeeBalanceSettlementByCurrency,
      payrollFinanceForecast: payrollFinanceForecast.metrics,
      payrollFinanceForecastSourceEvidenceHash: payrollFinanceForecast.sourceEvidenceHash,
      latestEmployeeBalanceCaseUpdatedAt:
        latestEmployeeBalanceCase?.updatedAt ?? null,
      latestEmployeeBalanceEventCreatedAt:
        latestEmployeeBalanceEvent?.createdAt ?? null,
    },
  })
}

type TenantOperatingBaseMetrics = Omit<TenantOperatingMetrics, "commandCards">

type TenantOperatingCommandCardInput = Omit<TenantOperatingCommandCard, "freshness"> & {
  sourceMaxUpdatedAt?: Date | string | null
}

function buildTenantOperatingCommandCards(input: {
  scope: NormalizedSnapshotScope
  metrics: TenantOperatingBaseMetrics
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
  inventoryCash: SnapshotResult<InventoryCashMetrics>
  closeReadiness: SnapshotResult<CloseReadinessMetrics>
  payrollFinanceForecast: PayrollFinanceForecastResult
  ledgerTrustIncidentCount: number
  activeEmployeeBalanceCaseCount: number
}): TenantOperatingCommandCard[] {
  const { scope, metrics, paymentTruth, inventoryCash, closeReadiness, payrollFinanceForecast } = input
  const paymentIssueCount =
    metrics.paymentTruth.criticalExceptionCount +
    metrics.paymentTruth.openExceptionCount +
    metrics.paymentTruth.openSuspenseCount
  const internalCollectedAmount = metrics.paymentTruth.internalCollectedAmount ?? metrics.cashCollected
  const externalMatchedAmount = metrics.paymentTruth.externalMatchedAmount ?? 0
  const cashVarianceAmount = metrics.paymentTruth.cashVarianceAmount ?? internalCollectedAmount - externalMatchedAmount
  const stockIssueCount = metrics.inventoryCash.zeroStockLevelCount + metrics.inventoryCash.negativeStockLevelCount
  const closeIssueCount =
    closeReadiness.blockers.length +
    toNumber(metrics.closeReadiness.blockedCloseRunCount) +
    toNumber(metrics.closeReadiness.criticalOpenFindingCount) +
    toNumber(metrics.closeReadiness.unavailableEvidenceCount)
  const payrollUiState: TenantOperatingCommandCard["uiState"] =
    metrics.payrollFinanceForecast.blockerCodes.length > 0
      ? "blocked"
      : metrics.payrollFinanceForecast.authoritative
        ? "fresh"
        : "partial"
  const complianceUiState: TenantOperatingCommandCard["uiState"] = metrics.payrollFinanceForecast.blockerCodes.some((code) =>
    code.includes("DECLARATION"),
  )
    ? "blocked"
    : metrics.payrollFinanceForecast.declarationCount > 0
      ? "partial"
      : "module_unavailable"
  const securityUiState: TenantOperatingCommandCard["uiState"] = input.ledgerTrustIncidentCount > 0 ? "blocked" : "module_unavailable"

  return [
    commandCard(scope, {
      id: "payment",
      label: "Cash truth",
      detail: `Internal collected ${internalCollectedAmount.toFixed(2)}, external matched ${externalMatchedAmount.toFixed(
        2,
      )}, variance ${cashVarianceAmount.toFixed(2)}, suspense ${(metrics.paymentTruth.openSuspenseAmount === null ? "unavailable across currencies" : metrics.paymentTruth.openSuspenseAmount.toFixed(2))}, issues ${paymentIssueCount}.`,
      metricLabel: "External matched",
      value: externalMatchedAmount,
      valueFormat: "currency",
      scope: "tenant_period",
      uiState: snapshotUiState(paymentTruth),
      evidenceGrade: paymentTruth.evidenceGrade,
      blockerState: snapshotBlockerState(paymentTruth),
      blockerCount: paymentTruth.blockers.length,
      actionRoute: "/dashboard/finance/reconciliation",
      proofRoute: "/dashboard/finance/reconciliation",
      requiredPermission: "payments.reconciliation.read",
      sourceModules: ["payments", "finance"],
      sourceMaxUpdatedAt: paymentTruth.freshness.sourceMaxUpdatedAt,
    }),
    commandCard(scope, {
      id: "ap",
      label: "AP exposure",
      detail: "Purchase-order exposure is visible; invoice, match, and payment proof remain a Phase 3 source.",
      metricLabel: "Pending purchase orders",
      value: metrics.pendingPurchaseOrderCount,
      valueFormat: "number",
      scope: "tenant_period",
      uiState: "partial",
      evidenceGrade: "operational",
      blockerState: "partial",
      blockerCount: metrics.pendingPurchaseOrderCount,
      actionRoute: "/dashboard/purchases/payables",
      proofRoute: "/dashboard/purchases/payables",
      requiredPermission: "finance.payables.read",
      sourceModules: ["purchasing", "finance"],
      sourceMaxUpdatedAt: null,
    }),
    commandCard(scope, {
      id: "close",
      label: "Close confidence",
      detail: "Close runs, findings, unavailable evidence, and source-link readiness.",
      metricLabel: "Close blockers",
      value: closeIssueCount,
      valueFormat: "number",
      scope: "tenant_period",
      uiState: snapshotUiState(closeReadiness),
      evidenceGrade: closeReadiness.evidenceGrade,
      blockerState: snapshotBlockerState(closeReadiness),
      blockerCount: closeReadiness.blockers.length,
      actionRoute: "/dashboard/accounting/close",
      proofRoute: "/dashboard/accounting/close",
      requiredPermission: "accounting.close.read",
      sourceModules: ["accounting", "close"],
      sourceMaxUpdatedAt: closeReadiness.freshness.sourceMaxUpdatedAt,
    }),
    commandCard(scope, {
      id: "stock",
      label: "Stock-to-cash",
      detail: "Stock exception count tied to inventory-cash readiness; physical count proof arrives later.",
      metricLabel: "Stock exceptions",
      value: stockIssueCount,
      valueFormat: "number",
      scope: "tenant_period",
      uiState: snapshotUiState(inventoryCash),
      evidenceGrade: inventoryCash.evidenceGrade,
      blockerState: snapshotBlockerState(inventoryCash),
      blockerCount: inventoryCash.blockers.length,
      actionRoute: "/dashboard/finance/stock-to-cash",
      proofRoute: "/dashboard/finance/stock-to-cash",
      requiredPermission: "finance.read",
      sourceModules: ["inventory", "payments", "finance"],
      sourceMaxUpdatedAt: inventoryCash.freshness.sourceMaxUpdatedAt,
    }),
    commandCard(scope, {
      id: "compliance",
      label: "Compliance pressure",
      detail: "Compact statutory pressure from declaration evidence; country-pack operations stay on compliance pages.",
      metricLabel: "Upcoming declarations",
      value: metrics.payrollFinanceForecast.declarationCount || null,
      valueFormat: "number",
      scope: "tenant_period",
      uiState: complianceUiState,
      evidenceGrade: complianceUiState === "blocked" ? "blocked" : metrics.payrollFinanceForecast.declarationCount > 0 ? "operational" : "raw",
      blockerState: complianceUiState === "blocked" ? "blocked" : complianceUiState === "partial" ? "partial" : "unavailable",
      blockerCount: metrics.payrollFinanceForecast.blockerCodes.filter((code) => code.includes("DECLARATION")).length,
      actionRoute: "/dashboard/compliance",
      proofRoute: "/dashboard/compliance",
      requiredPermission: "compliance.documents.read",
      sourceModules: ["compliance", "payroll"],
      sourceMaxUpdatedAt: payrollFinanceForecast.sourceMaxUpdatedAt,
    }),
    commandCard(scope, {
      id: "payroll",
      label: "Payroll pressure",
      detail: metrics.payrollFinanceForecast.message,
      metricLabel: "Upcoming payroll cash",
      value: metrics.payrollFinanceForecast.authoritative ? metrics.payrollFinanceForecast.totalUpcomingAmount : null,
      valueFormat: "currency",
      scope: "tenant_period",
      uiState: payrollUiState,
      evidenceGrade: metrics.payrollFinanceForecast.authoritative ? "posted" : "blocked",
      blockerState: payrollUiState === "blocked" ? "blocked" : payrollUiState === "partial" ? "partial" : "none",
      blockerCount: metrics.payrollFinanceForecast.blockerCodes.length + input.activeEmployeeBalanceCaseCount,
      actionRoute: "/dashboard/payroll",
      proofRoute: "/dashboard/payroll/payments",
      requiredPermission: "payroll.command.read",
      sourceModules: ["payroll", "payments", "accounting"],
      sourceMaxUpdatedAt: payrollFinanceForecast.sourceMaxUpdatedAt,
    }),
    commandCard(scope, {
      id: "security",
      label: "Security posture",
      detail: input.ledgerTrustIncidentCount > 0
        ? "Assurance incidents are blocking trusted operating intelligence."
        : "Security posture mini-brief is not connected yet; use settings security for operator controls.",
      metricLabel: "Blocking assurance incidents",
      value: input.ledgerTrustIncidentCount > 0 ? input.ledgerTrustIncidentCount : null,
      valueFormat: "number",
      scope: "tenant",
      uiState: securityUiState,
      evidenceGrade: input.ledgerTrustIncidentCount > 0 ? "blocked" : "raw",
      blockerState: input.ledgerTrustIncidentCount > 0 ? "blocked" : "unavailable",
      blockerCount: input.ledgerTrustIncidentCount,
      actionRoute: "/dashboard/settings/security",
      proofRoute: "/dashboard/assurance/control-tower",
      requiredPermission: "PASSWORD_READ",
      sourceModules: ["dashboard", "security"],
      sourceMaxUpdatedAt: null,
    }),
  ]
}

function commandCard(
  scope: NormalizedSnapshotScope,
  input: TenantOperatingCommandCardInput,
): TenantOperatingCommandCard {
  const { sourceMaxUpdatedAt, ...card } = input

  return {
    ...card,
    freshness: createFreshness({
      generatedAt: scope.now,
      sourceMaxUpdatedAt: maxDate([sourceMaxUpdatedAt]),
      maxAgeMinutes: scope.maxAgeMinutes,
    }),
  }
}

function snapshotUiState(snapshot: SnapshotResult<unknown>): TenantOperatingCommandCard["uiState"] {
  return snapshot.uiState ?? snapshot.status
}

function snapshotBlockerState(snapshot: SnapshotResult<unknown>): TenantOperatingCommandBlockerState {
  if (snapshot.status === "blocked" || snapshot.blockers.some((item) => item.severity === "critical" || item.severity === "high")) {
    return "blocked"
  }
  if (snapshot.status === "failed" || snapshot.status === "building") return "unavailable"
  if (["empty", "partial", "stale"].includes(snapshot.status) || snapshot.blockers.length > 0) return "partial"
  return "none"
}
function tenantEvidenceGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  return weakestEvidenceGrade(grades)
}
