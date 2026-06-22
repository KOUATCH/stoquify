import "server-only"

import {
  JournalEntryStatus,
  PaymentStatus,
  PayrollRunStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
  WorkflowAssuranceIncidentStatus,
  WorkflowAssuranceSeverity,
  WorkflowAssuranceWorkflow,
} from "@prisma/client"

import { db } from "@/prisma/db"
import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { SnapshotResult, SnapshotScopeInput, TenantOperatingMetrics } from "./snapshot-contracts"
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
  const periodWhere = { gte: scope.periodStart, lte: scope.periodEnd }

  const [paymentTruth, inventoryCash, closeReadiness] = await Promise.all([
    getPaymentTruthSnapshot(scope),
    getInventoryCashSnapshot(scope),
    getCloseReadinessSnapshot(scope),
  ])

  const [
    activeLocationCount,
    salesTotals,
    completedSalesCount,
    cashCollected,
    pendingPurchaseOrderCount,
    approvedOrPaidPayrollRunCount,
    postedJournalEntryCount,
    sourceLinkCount,
    latestLocation,
    latestSale,
    latestPayment,
    latestPurchaseOrder,
    latestPayrollRun,
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
    postedJournalEntryCount,
    sourceLinkCount,
    paymentTruth: paymentTruth.metrics,
    inventoryCash: inventoryCash.metrics,
    closeReadiness: closeReadiness.metrics,
  }

  const blockers = [
    ...paymentTruth.blockers,
    ...inventoryCash.blockers,
    ...closeReadiness.blockers,
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
      ledgerTrustIncidentCount > 0 ? "blocked" : postedJournalEntryCount > 0 ? "posted" : "raw",
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
      latestJournalEntry?.updatedAt,
      latestSourceLink?.createdAt,
      latestLedgerTrustIncident?.updatedAt,
    ]),
    sourceHashParts: {
      paymentTruth: paymentTruth.sourceHash,
      inventoryCash: inventoryCash.sourceHash,
      closeReadiness: closeReadiness.sourceHash,
      ledgerTrustIncidentCount,
      latestLedgerTrustIncidentId: latestLedgerTrustIncident?.id ?? null,
      latestLedgerTrustIncidentCheckKey: latestLedgerTrustIncident?.checkKey ?? null,
    },
  })
}

function tenantEvidenceGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  return weakestEvidenceGrade(grades)
}
