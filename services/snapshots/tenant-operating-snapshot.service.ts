import "server-only"

import {
  AccountingSourceType,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentStatus,
  Prisma,
  PayrollEmployeeBalanceCaseStatus,
  PayrollEmployeeBalanceEventType,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollRunStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
  WorkflowAssuranceIncidentStatus,
  WorkflowAssuranceSeverity,
  WorkflowAssuranceWorkflow,
} from "@prisma/client"

import { db } from "@/prisma/db"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type {
  CloseReadinessMetrics,
  InventoryCashMetrics,
  NormalizedSnapshotScope,
  PaymentTruthMetrics,
  PayrollFinanceForecastMetrics,
  SnapshotBlocker,
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
  maxDate,
  normalizeSnapshotScope,
  toNumber,
  weakestEvidenceGrade,
} from "./snapshot-utils"

const COMPLETED_SALES_STATUSES = [SalesOrderStatus.COMPLETED, SalesOrderStatus.DELIVERED]
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
const PAYROLL_FINANCE_FORECAST_HORIZON_DAYS = 30
const PAYROLL_FINANCE_FORECAST_RUN_STATUSES: PayrollRunStatus[] = [PayrollRunStatus.POSTED, PayrollRunStatus.PAID, PayrollRunStatus.ARCHIVED]
const PAYROLL_FINANCE_FORECAST_PAYMENT_STATUSES: PayrollPaymentBatchStatus[] = [
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
]
const PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES: PayrollDeclarationStatus[] = [
  PayrollDeclarationStatus.PREPARED,
  PayrollDeclarationStatus.SUBMITTED,
  PayrollDeclarationStatus.ACCEPTED,
  PayrollDeclarationStatus.PAYMENT_DUE,
]
const PAYROLL_FINANCE_FORECAST_DECLARATION_BLOCKED_STATUSES: PayrollDeclarationStatus[] = [PayrollDeclarationStatus.REJECTED]

export async function getTenantOperatingSnapshot(
  input: SnapshotScopeInput,
): Promise<SnapshotResult<TenantOperatingMetrics>> {
  const scope = normalizeSnapshotScope(input)
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
  return buildTenantOperatingSnapshot({
    scope: normalizeSnapshotScope(input),
    ...related,
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

  const [
    activeLocationCount,
    salesTotals,
    completedSalesCount,
    cashCollected,
    pendingPurchaseOrderCount,
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
    db.payrollEmployeeBalanceCase.aggregate({
      where: {
        organizationId: scope.organizationId,
        status: { in: ACTIVE_EMPLOYEE_BALANCE_CASE_STATUSES },
      },
      _sum: { outstandingAmount: true },
    }),
    db.payrollEmployeeBalanceEvent.count({
      where: {
        organizationId: scope.organizationId,
        eventType: { in: EMPLOYEE_BALANCE_SETTLEMENT_EVENT_TYPES },
        eventDate: periodWhere,
      },
    }),
    db.payrollEmployeeBalanceEvent.aggregate({
      where: {
        organizationId: scope.organizationId,
        eventType: { in: EMPLOYEE_BALANCE_SETTLEMENT_EVENT_TYPES },
        eventDate: periodWhere,
      },
      _sum: { amount: true },
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
    getPayrollFinanceForecast({ scope, paymentTruth }),
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

  const metrics: TenantOperatingMetrics = {
    activeLocationCount,
    completedSalesCount,
    completedSalesRevenue: toNumber(salesTotals._sum.total),
    cashCollected: toNumber(cashCollected._sum.amount),
    pendingPurchaseOrderCount,
    approvedOrPaidPayrollRunCount,
    activeEmployeeBalanceCaseCount,
    openEmployeeBalanceCaseCount,
    partiallySettledEmployeeBalanceCaseCount,
    employeeBalanceOutstandingAmount: toNumber(employeeBalanceOutstanding._sum.outstandingAmount),
    periodEmployeeBalanceSettlementCount,
    periodEmployeeBalanceSettlementAmount: toNumber(periodEmployeeBalanceSettlement._sum.amount),
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
    ...(activeLocationCount === 0
      ? [
          blocker({
            id: "tenant-active-location-missing",
            severity: "medium",
            gate: "tenant_operating_snapshot",
            title: "No active location is configured",
            detail: "Tenant operating truth is partial until at least one active branch or warehouse exists.",
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
            detail: "Posted entries exist in the period, but source-link evidence coverage is zero.",
            sourceTables: ["journal_entries", "accounting_source_links"],
            nextAction: "Backfill or repair accounting source links for posted entries.",
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
            sourceTables: ["workflow_assurance_incidents", "workflow_assurance_check_runs"],
            nextAction: "Open Manager Action Center and resolve the blocking assurance incidents before relying on BI snapshots.",
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
            detail: `${activeEmployeeBalanceCaseCount} active employee balance case(s) have ${metrics.employeeBalanceOutstandingAmount.toFixed(
              2,
            )} outstanding.`,
            sourceTables: ["payroll_employee_balance_cases", "payroll_employee_balance_events"],
            nextAction: "Open payroll payments and settle, refund, or review employee balance recovery cases.",
          }),
        ]
      : []),
  ]

  const redactions = [...paymentTruth.redactions]
  const status =
    completedSalesCount === 0 && postedJournalEntryCount === 0 && activeLocationCount === 0
      ? "empty"
      : [paymentTruth.status, inventoryCash.status, closeReadiness.status].includes("blocked") ||
          blockers.some((item) => item.severity === "critical" || item.severity === "high")
        ? "blocked"
        : [paymentTruth.status, inventoryCash.status, closeReadiness.status].some((status) =>
              ["partial", "empty"].includes(status),
            ) || blockers.length > 0
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
      ledgerTrustIncidentCount > 0 || activeEmployeeBalanceCaseCount > 0
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
      latestLedgerTrustIncidentCheckKey: latestLedgerTrustIncident?.checkKey ?? null,
      activeEmployeeBalanceCaseCount,
      openEmployeeBalanceCaseCount,
      partiallySettledEmployeeBalanceCaseCount,
      employeeBalanceOutstandingAmount: metrics.employeeBalanceOutstandingAmount,
      periodEmployeeBalanceSettlementCount,
      periodEmployeeBalanceSettlementAmount: metrics.periodEmployeeBalanceSettlementAmount,
      payrollFinanceForecast: payrollFinanceForecast.metrics,
      latestEmployeeBalanceCaseUpdatedAt: latestEmployeeBalanceCase?.updatedAt ?? null,
      latestEmployeeBalanceEventCreatedAt: latestEmployeeBalanceEvent?.createdAt ?? null,
    },
  })
}

type PayrollFinanceForecastResult = {
  metrics: PayrollFinanceForecastMetrics
  sourceMaxUpdatedAt: Date | null
}

async function getPayrollFinanceForecast(input: {
  scope: NormalizedSnapshotScope
  paymentTruth: SnapshotResult<PaymentTruthMetrics>
}): Promise<PayrollFinanceForecastResult> {
  const horizon = payrollForecastHorizon(input.scope)
  const runInclude = PAYROLL_FORECAST_RUN_INCLUDE
  const periods: PayrollForecastPeriod[] = await db.payrollPeriod.findMany({
    where: {
      organizationId: input.scope.organizationId,
      payDate: { gte: horizon.start, lte: horizon.end },
    },
    include: {
      runs: {
        where: {
          organizationId: input.scope.organizationId,
          deletedAt: null,
          status: { in: PAYROLL_FINANCE_FORECAST_RUN_STATUSES },
        },
        include: runInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { payDate: "asc" },
  })
  const declarationRuns: PayrollForecastRun[] = await db.payrollRun.findMany({
    where: {
      organizationId: input.scope.organizationId,
      deletedAt: null,
      status: { in: PAYROLL_FINANCE_FORECAST_RUN_STATUSES },
      declarations: {
        some: {
          dueDate: { gte: horizon.start, lte: horizon.end },
          status: {
            in: [
              ...PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES,
              ...PAYROLL_FINANCE_FORECAST_DECLARATION_BLOCKED_STATUSES,
            ],
          },
        },
      },
    },
    include: runInclude,
    orderBy: { updatedAt: "desc" },
  })

  const runsById = new Map<string, PayrollForecastRun>()
  for (const period of periods) {
    if (period.runs.length === 0) continue
    for (const run of period.runs) runsById.set(run.id, run)
  }
  for (const run of declarationRuns) runsById.set(run.id, run)

  const runs = Array.from(runsById.values())
  const blockers = new Set<string>()

  for (const period of periods) {
    if (period.runs.length === 0) blockers.add("PAYROLL_FORECAST_POSTED_RUN_MISSING")
    if (period.runs.length > 1) blockers.add("PAYROLL_FORECAST_MULTIPLE_POSTED_RUNS")
  }

  if (periods.length === 0 && runs.length === 0) {
    return {
      metrics: payrollFinanceForecastMetrics({
        status: "AUTHORITATIVE",
        reasonCode: "PAYROLL_FORECAST_NO_UPCOMING_PERIODS",
        message: "No upcoming payroll periods, payment batches, or statutory declaration due dates are visible in the forecast horizon.",
        horizon,
      }),
      sourceMaxUpdatedAt: null,
    }
  }

  const paymentBatchIds = Array.from(new Set(runs.flatMap((run) => run.paymentBatches.map((batch) => batch.id))))
  const sourceLinks = await db.accountingSourceLink.findMany({
    where: {
      organizationId: input.scope.organizationId,
      OR: [
        ...(runs.length
          ? [{ sourceType: AccountingSourceType.PAYROLL_RUN, sourceId: { in: runs.map((run) => run.id) } }]
          : []),
        ...(paymentBatchIds.length
          ? [{ sourceType: AccountingSourceType.PAYROLL_PAYMENT, sourceId: { in: paymentBatchIds } }]
          : []),
      ],
    },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      createdAt: true,
      postingBatch: { select: { status: true } },
    },
  })
  const postedSourceLinksByKey = new Set<string>()
  for (const link of sourceLinks) {
    if (link.postingBatch.status === LedgerPostingBatchStatus.POSTED) {
      postedSourceLinksByKey.add(payrollSourceLinkKey(link.sourceType, link.sourceId))
    }
  }

  const paymentBatches = runs.flatMap((run) =>
    run.paymentBatches.filter((batch) => isDateInRange(batch.paymentDate, horizon.start, horizon.end)).map((batch) => ({ run, batch })),
  )
  const declarations = runs.flatMap((run) =>
    run.declarations
      .filter((declaration) => declaration.dueDate && isDateInRange(declaration.dueDate, horizon.start, horizon.end))
      .map((declaration) => ({ run, declaration })),
  )
  const evidenceHashes = new Set<string>()

  if (paymentBatches.length > 0) {
    const providerProofReady =
      input.paymentTruth.status !== "blocked" &&
      input.paymentTruth.metrics.providerAccountCount > 0 &&
      input.paymentTruth.metrics.activeProviderAccountCount > 0
    if (!providerProofReady) blockers.add("PAYROLL_FORECAST_PROVIDER_PROOF_MISSING")
  }

  for (const run of runs) {
    const runSourceKey = payrollSourceLinkKey(AccountingSourceType.PAYROLL_RUN, run.id)
    if (!run.ledgerPostingBatchId || !run.postedBusinessEventId || !postedSourceLinksByKey.has(runSourceKey)) {
      blockers.add("PAYROLL_FORECAST_LEDGER_PROOF_MISSING")
    }

    const runPayDateInHorizon = isDateInRange(run.payrollPeriod.payDate, horizon.start, horizon.end)
    const runPaymentBatches = paymentBatches.filter((item) => item.run.id === run.id)
    if (runPayDateInHorizon && toNumber(run.netPayableAmount) > 0 && runPaymentBatches.length === 0) {
      blockers.add("PAYROLL_FORECAST_PAYMENT_BATCH_MISSING")
    }
    if (toNumber(run.employerChargeAmount) > 0 && run.declarations.length === 0) {
      blockers.add("PAYROLL_FORECAST_DECLARATION_MISSING")
    }
  }

  for (const { batch } of paymentBatches) {
    if (batch.evidenceHash) evidenceHashes.add(batch.evidenceHash)
    if (batch.bankFileHash) evidenceHashes.add(batch.bankFileHash)
    if (batch.documentHash) evidenceHashes.add(batch.documentHash)
    const paymentSourceKey = payrollSourceLinkKey(AccountingSourceType.PAYROLL_PAYMENT, batch.id)
    if (
      !PAYROLL_FINANCE_FORECAST_PAYMENT_STATUSES.includes(batch.status) ||
      !batch.evidenceHash ||
      !batch.ledgerPostingBatchId ||
      !batch.postedBusinessEventId ||
      !postedSourceLinksByKey.has(paymentSourceKey)
    ) {
      blockers.add("PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING")
    }
  }

  for (const { declaration } of declarations) {
    const latestEvidence = declaration.evidenceItems[0] ?? null
    if (declaration.status === PayrollDeclarationStatus.REJECTED) blockers.add("PAYROLL_FORECAST_DECLARATION_REJECTED")
    if (!PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES.includes(declaration.status)) continue
    if (latestEvidence?.evidenceHash) evidenceHashes.add(latestEvidence.evidenceHash)
    if (latestEvidence?.sourceRegisterHash) evidenceHashes.add(latestEvidence.sourceRegisterHash)
    if (latestEvidence?.authorityResponseHash) evidenceHashes.add(latestEvidence.authorityResponseHash)
    if (latestEvidence?.portalReceiptHash) evidenceHashes.add(latestEvidence.portalReceiptHash)
    if (latestEvidence?.supportingFileHash) evidenceHashes.add(latestEvidence.supportingFileHash)
    if (
      !declaration.dueDate ||
      !declaration.payloadHash ||
      !declaration.countryPackResolutionHash ||
      !latestEvidence?.evidenceHash ||
      !latestEvidence.sourceRegisterHash ||
      latestEvidence.countryPackResolutionHash !== declaration.countryPackResolutionHash
    ) {
      blockers.add("PAYROLL_FORECAST_DECLARATION_PROOF_MISSING")
    }
  }

  const sourceMaxUpdatedAt = maxDate([
    input.paymentTruth.freshness.sourceMaxUpdatedAt,
    ...periods.map((period) => period.updatedAt),
    ...runs.map((run) => run.updatedAt),
    ...paymentBatches.map(({ batch }) => batch.updatedAt),
    ...declarations.map(({ declaration }) => declaration.updatedAt),
    ...declarations.flatMap(({ declaration }) => declaration.evidenceItems.map((item) => item.createdAt)),
    ...sourceLinks.map((link) => link.createdAt),
  ])
  const blockerCodes = Array.from(blockers).sort()
  const authoritative = blockerCodes.length === 0
  const upcomingNetPayAmount = authoritative
    ? paymentBatches.reduce((sum, { batch }) => sum + toNumber(batch.amount), 0)
    : 0
  const upcomingStatutoryLiabilityAmount = authoritative
    ? declarations
        .filter(({ declaration }) => PAYROLL_FINANCE_FORECAST_DECLARATION_STATUSES.includes(declaration.status))
        .reduce((sum, { declaration }) => sum + toNumber(declaration.amount), 0)
    : 0

  return {
    metrics: payrollFinanceForecastMetrics({
      status: authoritative ? "AUTHORITATIVE" : "NON_AUTHORITATIVE",
      reasonCode: authoritative
        ? "PAYROLL_FORECAST_SOURCE_LINKED"
        : "PAYROLL_FORECAST_PROOF_INCOMPLETE",
      message: authoritative
        ? "Upcoming payroll net-pay and statutory-liability forecasts are sourced from payroll periods, payment batches, declarations, and posted source-link evidence."
        : "Upcoming payroll finance forecasts are withheld because provider, declaration, payment, or ledger proof is incomplete.",
      horizon,
      upcomingNetPayAmount,
      upcomingStatutoryLiabilityAmount,
      payrollPeriodCount: periods.length,
      payrollRunCount: runs.length,
      paymentBatchCount: paymentBatches.length,
      declarationCount: declarations.length,
      sourceLinkCount: sourceLinks.length,
      evidenceHashCount: evidenceHashes.size,
      nextPayDate: minDateString([...periods.map((period) => period.payDate), ...paymentBatches.map(({ batch }) => batch.paymentDate)]),
      nextDeclarationDueDate: minDateString(declarations.map(({ declaration }) => declaration.dueDate)),
      blockerCodes,
    }),
    sourceMaxUpdatedAt,
  }
}

const PAYROLL_FORECAST_RUN_INCLUDE = Prisma.validator<Prisma.PayrollRunInclude>()({
  payrollPeriod: {
    select: {
      id: true,
      name: true,
      periodStart: true,
      periodEnd: true,
      payDate: true,
      updatedAt: true,
    },
  },
  paymentBatches: {
    select: {
      id: true,
      status: true,
      amount: true,
      paymentDate: true,
      evidenceHash: true,
      bankFileHash: true,
      documentHash: true,
      ledgerPostingBatchId: true,
      postedBusinessEventId: true,
      updatedAt: true,
    },
  },
  declarations: {
    select: {
      id: true,
      status: true,
      amount: true,
      dueDate: true,
      payloadHash: true,
      countryPackResolutionHash: true,
      updatedAt: true,
      evidenceItems: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          evidenceHash: true,
          sourceRegisterHash: true,
          countryPackResolutionHash: true,
          authorityResponseHash: true,
          portalReceiptHash: true,
          supportingFileHash: true,
          createdAt: true,
        },
      },
    },
  },
})

type PayrollForecastRun = Prisma.PayrollRunGetPayload<{ include: typeof PAYROLL_FORECAST_RUN_INCLUDE }>
type PayrollForecastPeriod = Prisma.PayrollPeriodGetPayload<{
  include: {
    runs: {
      include: typeof PAYROLL_FORECAST_RUN_INCLUDE
    }
  }
}>
function payrollFinanceForecastMetrics(input: {
  status: PayrollFinanceForecastMetrics["status"]
  reasonCode: string
  message: string
  horizon: { start: Date; end: Date }
  upcomingNetPayAmount?: number
  upcomingStatutoryLiabilityAmount?: number
  payrollPeriodCount?: number
  payrollRunCount?: number
  paymentBatchCount?: number
  declarationCount?: number
  sourceLinkCount?: number
  evidenceHashCount?: number
  nextPayDate?: string | null
  nextDeclarationDueDate?: string | null
  blockerCodes?: string[]
}): PayrollFinanceForecastMetrics {
  const upcomingNetPayAmount = input.upcomingNetPayAmount ?? 0
  const upcomingStatutoryLiabilityAmount = input.upcomingStatutoryLiabilityAmount ?? 0
  return {
    status: input.status,
    authoritative: input.status === "AUTHORITATIVE",
    reasonCode: input.reasonCode,
    message: input.message,
    horizonStart: input.horizon.start.toISOString(),
    horizonEnd: input.horizon.end.toISOString(),
    upcomingNetPayAmount,
    upcomingStatutoryLiabilityAmount,
    totalUpcomingAmount: upcomingNetPayAmount + upcomingStatutoryLiabilityAmount,
    payrollPeriodCount: input.payrollPeriodCount ?? 0,
    payrollRunCount: input.payrollRunCount ?? 0,
    paymentBatchCount: input.paymentBatchCount ?? 0,
    declarationCount: input.declarationCount ?? 0,
    sourceLinkCount: input.sourceLinkCount ?? 0,
    evidenceHashCount: input.evidenceHashCount ?? 0,
    nextPayDate: input.nextPayDate ?? null,
    nextDeclarationDueDate: input.nextDeclarationDueDate ?? null,
    personLevelAmountsRedacted: true,
    blockerCodes: input.blockerCodes ?? [],
  }
}

function payrollForecastBlockers(metrics: PayrollFinanceForecastMetrics): SnapshotBlocker[] {
  return metrics.blockerCodes.map((code) => {
    const copy = payrollForecastBlockerCopy(code)
    return blocker({
      id: `tenant-payroll-finance-forecast-${code.toLowerCase().replace(/_/g, "-")}`,
      severity: copy.severity,
      gate: "payroll_finance_forecast",
      title: copy.title,
      detail: copy.detail,
      sourceTables: [
        "payroll_periods",
        "payroll_runs",
        "payroll_payment_batches",
        "payroll_declarations",
        "payroll_declaration_evidence",
        "payment_provider_accounts",
        "accounting_source_links",
        "ledger_posting_batches",
      ],
      nextAction: copy.nextAction,
    })
  })
}

function payrollForecastBlockerCopy(code: string): {
  severity: SnapshotBlocker["severity"]
  title: string
  detail: string
  nextAction: string
} {
  switch (code) {
    case "PAYROLL_FORECAST_PROVIDER_PROOF_MISSING":
      return {
        severity: "high",
        title: "Payroll provider proof is missing",
        detail: "Upcoming payroll net-pay is withheld until an active payment provider evidence path is visible.",
        nextAction: "Open payment provider evidence and payroll payment batches before relying on payroll cash forecasts.",
      }
    case "PAYROLL_FORECAST_DECLARATION_PROOF_MISSING":
    case "PAYROLL_FORECAST_DECLARATION_MISSING":
      return {
        severity: "high",
        title: "Payroll declaration proof is missing",
        detail: "Upcoming statutory liability is withheld until declaration payload, due date, country-pack, and lifecycle evidence are complete.",
        nextAction: "Open payroll declarations and attach source-register-backed declaration evidence.",
      }
    case "PAYROLL_FORECAST_LEDGER_PROOF_MISSING":
      return {
        severity: "high",
        title: "Payroll ledger proof is missing",
        detail: "Payroll forecast amounts are withheld until payroll run and payment source links point to posted ledger batches.",
        nextAction: "Repair payroll posting and accounting source links before using the cash forecast.",
      }
    case "PAYROLL_FORECAST_PAYMENT_EVIDENCE_MISSING":
    case "PAYROLL_FORECAST_PAYMENT_BATCH_MISSING":
      return {
        severity: "high",
        title: "Payroll payment proof is missing",
        detail: "Upcoming net-pay forecast is withheld until released payment batches include immutable payment and ledger evidence.",
        nextAction: "Open payroll payments and complete payment release evidence.",
      }
    default:
      return {
        severity: "high",
        title: "Payroll finance forecast is blocked",
        detail: `Payroll forecast proof failed closed with blocker ${code}.`,
        nextAction: "Open payroll finance evidence and clear the forecast blocker.",
      }
  }
}

function payrollForecastHorizon(scope: NormalizedSnapshotScope) {
  const start = startOfUtcDay(scope.periodStart > scope.now ? scope.periodStart : scope.now)
  const requestedEnd = scope.periodEnd > start ? scope.periodEnd : null
  const fallbackEnd = endOfUtcDay(addUtcDays(start, PAYROLL_FINANCE_FORECAST_HORIZON_DAYS))
  return { start, end: requestedEnd && requestedEnd > start ? requestedEnd : fallbackEnd }
}

function payrollSourceLinkKey(sourceType: AccountingSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`
}

function isDateInRange(value: Date | string | null | undefined, start: Date, end: Date) {
  if (!value) return false
  const date = value instanceof Date ? value : new Date(value)
  return !Number.isNaN(date.getTime()) && date >= start && date <= end
}

function minDateString(values: Array<Date | string | null | undefined>) {
  let earliest: Date | null = null
  for (const value of values) {
    if (!value) continue
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) continue
    if (!earliest || date < earliest) earliest = date
  }
  return earliest?.toISOString() ?? null
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfUtcDay(date: Date) {
  const next = new Date(date)
  next.setUTCHours(0, 0, 0, 0)
  return next
}

function endOfUtcDay(date: Date) {
  const next = startOfUtcDay(date)
  next.setUTCDate(next.getUTCDate() + 1)
  next.setUTCMilliseconds(next.getUTCMilliseconds() - 1)
  return next
}
function tenantEvidenceGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  return weakestEvidenceGrade(grades)
}
