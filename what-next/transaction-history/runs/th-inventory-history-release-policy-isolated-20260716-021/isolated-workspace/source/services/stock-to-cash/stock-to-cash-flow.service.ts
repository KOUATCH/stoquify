import "server-only"

import { db } from "@/prisma/db"
import type {
  BIBlocker,
  BICommandBrief,
  BIDrillThrough,
  BIFreshness,
  BIFlowStep,
  BIKpiCard,
  BIKpiState,
  BIProofDrawerSubject,
  BIRiskRank,
} from "@/services/bi/bi-contracts"
import {
  evidenceGradeToBITrustState,
  snapshotStatusToBIState,
} from "@/services/bi/bi-contracts"
import { normalizeSnapshotFreshness } from "@/services/bi/bi-evidence-adapter.service"
import { SUBJECT_PERMISSION_MAP } from "@/services/evidence/evidence-contracts"
import type { EvidenceGrade, ProofTrailSubjectType } from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"
import type {
  SnapshotResult,
  SnapshotSourceModule,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import type {
  StockToCashFlowData,
  StockToCashFlowSummary,
} from "./stock-to-cash-contracts"

type StockToCashInput = {
  organizationId: string
  organizationName?: string | null
  currency?: string | null
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
  now?: Date | string | null
}

type ProofSubjectIds = Partial<Record<ProofTrailSubjectType, string | null>>

type ComposeStockToCashInput = {
  organizationId: string
  organizationName: string | null
  currency: string
  tenantOperating: SnapshotResult<TenantOperatingMetrics>
  proofSubjectIds?: ProofSubjectIds
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export async function getStockToCashFlowData(input: StockToCashInput): Promise<StockToCashFlowData> {
  const tenantOperating = await getTenantOperatingSnapshot({
    organizationId: input.organizationId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    now: input.now,
  })
  const proofSubjectIds = await getLatestProofSubjectIds({
    organizationId: input.organizationId,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
  })

  return composeStockToCashFlowData({
    organizationId: input.organizationId,
    organizationName: input.organizationName ?? null,
    currency: input.currency ?? "XAF",
    tenantOperating,
    proofSubjectIds,
  })
}

export function composeStockToCashFlowData(input: ComposeStockToCashInput): StockToCashFlowData {
  const { tenantOperating } = input
  const metrics = tenantOperating.metrics
  const inventory = metrics.inventoryCash
  const payment = metrics.paymentTruth
  const close = metrics.closeReadiness
  const freshness = normalizeSnapshotFreshness(tenantOperating.freshness, tenantOperating.status)
  const state = snapshotStatusToBIState(tenantOperating.status, tenantOperating.uiState)
  const evidenceGrade = tenantOperating.evidenceGrade
  const trustState = evidenceGradeToBITrustState(evidenceGrade)
  const blockers = tenantOperating.blockers.map(toBIBlocker)
  const redactions = tenantOperating.redactions.map((redaction) => ({
    id: redaction.id,
    field: redaction.field,
    reason: redaction.reason,
    policy: redaction.policy,
  }))
  const proofSubjects = buildProofSubjects({
    organizationId: input.organizationId,
    proofSubjectIds: input.proofSubjectIds ?? {},
  })

  const flowSteps: BIFlowStep[] = [
    flowStep({
      id: "purchase-commitments",
      order: 1,
      organizationId: input.organizationId,
      moduleSlug: "purchasing",
      label: "Purchase commitments",
      detail: "Pending purchase orders and on-order stock that can tie cash before goods are sellable.",
      value: metrics.pendingPurchaseOrderCount,
      unit: "POs",
      format: "number",
      state: metrics.pendingPurchaseOrderCount > 0 ? "partial" : "ready",
      evidenceGrade: inventoryEvidence(inventory.periodTransactionCount),
      freshness,
      sourceModules: ["purchasing", "inventory"],
      blockers: [],
      drillThrough: routeDrillThrough("Open purchase orders", "/dashboard/purchase-orders", "purchases.orders.read"),
    }),
    flowStep({
      id: "stock-on-hand",
      order: 2,
      organizationId: input.organizationId,
      moduleSlug: "inventory",
      label: "Stock on hand",
      detail: "Current inventory value and quantity available from the inventory cash snapshot.",
      value: inventory.inventoryValue,
      unit: input.currency,
      format: "currency",
      state: inventory.negativeStockLevelCount > 0 ? "blocked" : inventory.inventoryLevelCount ? "ready" : "empty",
      evidenceGrade: inventory.negativeStockLevelCount > 0 ? "blocked" : tenantOperating.evidenceGrade,
      freshness,
      sourceModules: ["inventory"],
      blockers: blockers.filter((blocker) => blocker.gate === "inventory_cash"),
      drillThrough: routeDrillThrough("Open inventory", "/dashboard/inventory", "inventory.read"),
    }),
    flowStep({
      id: "available-to-sell",
      order: 3,
      organizationId: input.organizationId,
      moduleSlug: "inventory",
      label: "Available to sell",
      detail: "Available, reserved, in-transit, and on-order quantities before POS conversion.",
      value: inventory.quantityAvailable,
      unit: "units",
      format: "number",
      state: inventory.quantityAvailable < 0 ? "blocked" : inventory.quantityAvailable === 0 ? "partial" : "ready",
      evidenceGrade: inventory.quantityAvailable < 0 ? "blocked" : "operational",
      freshness,
      sourceModules: ["inventory", "pos"],
      blockers: blockers.filter((blocker) => blocker.id === "inventory-negative-stock"),
      drillThrough: routeDrillThrough("Open stock movements", "/dashboard/inventory/movements", "inventory.stock.read"),
    }),
    flowStep({
      id: "sold-and-collected",
      order: 4,
      organizationId: input.organizationId,
      moduleSlug: "pos",
      label: "Sold and collected",
      detail: "Completed sales revenue and collected cash from sales and payment sources.",
      value: metrics.cashCollected,
      unit: input.currency,
      format: "currency",
      state: metrics.completedSalesCount > 0 ? "ready" : "empty",
      evidenceGrade: metrics.completedSalesCount > 0 ? "operational" : "raw",
      freshness,
      sourceModules: ["sales", "pos", "payments"],
      blockers: [],
      drillThrough: routeDrillThrough("Open POS", "/dashboard/pos", "pos.operate"),
    }),
    flowStep({
      id: "reconciled-cash",
      order: 5,
      organizationId: input.organizationId,
      moduleSlug: "payment_reconciliation",
      label: "Reconciled cash",
      detail: "Signed reconciliation, unresolved suspense, exceptions, and pending provider transactions.",
      value: payment.openSuspenseAmount,
      unit: input.currency,
      format: "currency",
      state: payment.openSuspenseCount > 0 || payment.criticalExceptionCount > 0 ? "blocked" : payment.signedRunCount > 0 ? "ready" : "partial",
      evidenceGrade: payment.openSuspenseCount > 0 || payment.criticalExceptionCount > 0 ? "blocked" : payment.signedRunCount > 0 ? "reconciled" : "operational",
      freshness,
      sourceModules: ["payments", "finance", "accounting"],
      blockers: blockers.filter((blocker) => blocker.gate === "payment_truth"),
      drillThrough: proofOrRouteDrillThrough({
        label: "Open reconciliation proof",
        href: "/dashboard/finance/reconciliation",
        subjectType: "reconciliation.run",
        subjectId: input.proofSubjectIds?.["reconciliation.run"] ?? null,
        requiredPermission: SUBJECT_PERMISSION_MAP["reconciliation.run"],
      }),
    }),
    flowStep({
      id: "posted-ledger",
      order: 6,
      organizationId: input.organizationId,
      moduleSlug: "accounting",
      label: "Posted ledger",
      detail: "Posted journal entries and accounting source links that connect economic activity to ledger truth.",
      value: metrics.sourceLinkCount,
      unit: "links",
      format: "number",
      state: metrics.postedJournalEntryCount > 0 && metrics.sourceLinkCount === 0 ? "blocked" : metrics.postedJournalEntryCount > 0 ? "ready" : "partial",
      evidenceGrade: metrics.postedJournalEntryCount > 0 && metrics.sourceLinkCount > 0 ? "posted" : metrics.postedJournalEntryCount > 0 ? "blocked" : "raw",
      freshness,
      sourceModules: ["accounting"],
      blockers: blockers.filter((blocker) => blocker.gate === "ledger_evidence" || blocker.gate === "workflow_assurance"),
      drillThrough: proofOrRouteDrillThrough({
        label: "Open ledger proof",
        href: "/dashboard/accounting/journals",
        subjectType: "journal.entry",
        subjectId: input.proofSubjectIds?.["journal.entry"] ?? null,
        requiredPermission: SUBJECT_PERMISSION_MAP["journal.entry"],
      }),
    }),
    flowStep({
      id: "close-ready",
      order: 7,
      organizationId: input.organizationId,
      moduleSlug: "close_assurance",
      label: "Close ready",
      detail: "Close readiness score, certified close runs, findings, and unavailable evidence.",
      value: close.averageReadinessScore ?? 0,
      unit: "%",
      format: "score",
      state: close.criticalOpenFindingCount > 0 || close.blockedCloseRunCount > 0 ? "blocked" : close.certifiedCloseRunCount > 0 ? "ready" : "partial",
      evidenceGrade: close.criticalOpenFindingCount > 0 || close.blockedCloseRunCount > 0 ? "blocked" : close.certifiedCloseRunCount > 0 ? "certified" : "operational",
      freshness,
      sourceModules: ["accounting", "close", "compliance"],
      blockers: blockers.filter((blocker) => blocker.gate === "close_readiness"),
      drillThrough: proofOrRouteDrillThrough({
        label: "Open close proof",
        href: "/dashboard/accounting/close",
        subjectType: "close.run",
        subjectId: input.proofSubjectIds?.["close.run"] ?? null,
        requiredPermission: SUBJECT_PERMISSION_MAP["close.run"],
      }),
    }),
  ]

  const cards = [
    kpiFromStep(flowSteps[1]!, "stock-cash-exposure", "Stock cash exposure"),
    kpiFromStep(flowSteps[4]!, "unresolved-suspense", "Unresolved suspense"),
    kpiFromStep(flowSteps[5]!, "ledger-source-links", "Ledger source links"),
    kpiFromStep(flowSteps[6]!, "close-readiness-score", "Close readiness score"),
  ]
  const risks = buildRisks({
    organizationId: input.organizationId,
    flowSteps,
    freshness,
  })
  const summary: StockToCashFlowSummary = {
    stockCashExposure: inventory.inventoryValue,
    pendingPurchaseOrderCount: metrics.pendingPurchaseOrderCount,
    quantityOnOrder: inventory.quantityOnOrder,
    completedSalesRevenue: metrics.completedSalesRevenue,
    cashCollected: metrics.cashCollected,
    unresolvedSuspenseAmount: payment.openSuspenseAmount,
    sourceLinkCount: metrics.sourceLinkCount,
    blockedStepCount: flowSteps.filter((step) => step.state === "blocked").length,
    unavailableProofCount: proofSubjects.filter((subject) => !subject.available).length,
  }
  const commandBrief = buildCommandBrief({
    organizationId: input.organizationId,
    tenantOperating,
    state,
    evidenceGrade,
    freshness,
    blockers,
    flowSteps,
  })

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    generatedAt: tenantOperating.generatedAt,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
    currency: input.currency,
    commandBrief,
    cards,
    flowSteps,
    risks,
    proofSubjects,
    summary,
  }
}

function buildCommandBrief(input: {
  organizationId: string
  tenantOperating: SnapshotResult<TenantOperatingMetrics>
  state: BIKpiState
  evidenceGrade: EvidenceGrade
  freshness: BIFreshness
  blockers: BIBlocker[]
  flowSteps: BIFlowStep[]
}): BICommandBrief {
  const blockedCount = input.flowSteps.filter((step) => step.state === "blocked").length
  const partialCount = input.flowSteps.filter((step) => step.state === "partial").length

  return {
    id: "stock-to-cash-flow-brief",
    organizationId: input.organizationId,
    title: "Stock-to-Cash Flow",
    summary: "Read-only flow from purchasing commitments through inventory, POS, payment reconciliation, ledger posting, and close readiness.",
    conclusion:
      blockedCount > 0
        ? `${blockedCount} stock-to-cash step(s) are blocked and need operator action before cash truth is reliable.`
        : partialCount > 0
          ? `${partialCount} step(s) are partial; the flow is usable but not yet end-to-end certified.`
          : "The stock-to-cash chain has no blocking evidence gaps in the selected period.",
    mode: "command",
    generatedAt: input.tenantOperating.generatedAt,
    periodStart: input.tenantOperating.periodStart,
    periodEnd: input.tenantOperating.periodEnd,
    state: input.state,
    evidenceGrade: input.evidenceGrade,
    trustState: evidenceGradeToBITrustState(input.evidenceGrade),
    freshness: input.freshness,
    provenance: {
      organizationId: input.organizationId,
      locationId: input.tenantOperating.locationId,
      sourceKind: input.tenantOperating.kind,
      sourceId: null,
      sourceHash: input.tenantOperating.sourceHash,
      sourceModules: input.tenantOperating.sourceModules,
      generatedAt: input.tenantOperating.generatedAt,
      periodStart: input.tenantOperating.periodStart,
      periodEnd: input.tenantOperating.periodEnd,
    },
    sourceModules: input.tenantOperating.sourceModules,
    blockers: input.blockers,
    redactions: [],
    primaryAction: {
      id: "open-reconciliation",
      label: "Review reconciliation",
      href: "/dashboard/finance/reconciliation",
      requiredPermission: "payments.reconciliation.read",
      moduleSlug: "payment_reconciliation",
      disabled: false,
      disabledReason: null,
    },
    drillThrough: routeDrillThrough("Open Cash Command", "/dashboard/finance/cash-command", "finance.read"),
    reviewState: {
      organizationId: input.organizationId,
      reviewerId: null,
      reviewerRole: "finance_manager",
      state: blockedCount > 0 ? "blocked" : input.freshness.stale ? "stale" : "not_started",
      reviewedAt: null,
      previousReviewedAt: null,
      nextReviewDueAt: new Date(new Date(input.tenantOperating.generatedAt).getTime() + ONE_DAY_MS).toISOString(),
      freshness: input.freshness,
      blockers: input.blockers,
    },
  }
}

function flowStep(input: Omit<BIFlowStep, "trustState" | "provenance" | "redactions" | "actionLink">): BIFlowStep {
  return {
    ...input,
    trustState: evidenceGradeToBITrustState(input.evidenceGrade),
    provenance: null,
    redactions: [],
    actionLink: null,
  }
}

function kpiFromStep(step: BIFlowStep, id: string, title: string): BIKpiCard {
  return {
    id,
    organizationId: step.organizationId,
    moduleSlug: step.moduleSlug,
    requiredPermission: step.drillThrough?.requiredPermission ?? "dashboard.read",
    title,
    detail: step.detail,
    value: step.value,
    unit: step.unit ?? "",
    format: step.format,
    state: step.state,
    evidenceGrade: step.evidenceGrade,
    trustState: step.trustState,
    freshness: step.freshness,
    provenance: {
      organizationId: step.organizationId,
      locationId: null,
      sourceHash: null,
      sourceModules: step.sourceModules,
      generatedAt: step.freshness.generatedAt,
    },
    blockers: step.blockers,
    redactions: step.redactions,
    drillThrough: step.drillThrough ?? routeDrillThrough(title, "/dashboard", "dashboard.read"),
    actionLink: null,
  }
}

function buildRisks(input: {
  organizationId: string
  flowSteps: BIFlowStep[]
  freshness: BIFreshness
}): BIRiskRank[] {
  return input.flowSteps
    .filter((step) => step.state === "blocked" || step.state === "partial")
    .slice(0, 4)
    .map((step, index) => ({
      id: `stock-to-cash-risk-${step.id}`,
      organizationId: input.organizationId,
      moduleSlug: step.moduleSlug,
      rank: index + 1,
      title: step.label,
      detail: step.detail,
      businessImpact: step.state === "blocked"
        ? "This step can block trusted stock-to-cash reporting until the source issue is resolved."
        : "This step is usable but still needs stronger evidence before it supports certified decisions.",
      severity: step.state === "blocked" ? "high" : "medium",
      severityScore: step.state === "blocked" ? 80 : 55,
      moneyImpact: typeof step.value === "number" && step.format === "currency" ? step.value : null,
      urgency: step.state === "blocked" ? "today" : "soon",
      state: step.state,
      evidenceGrade: step.evidenceGrade,
      trustState: step.trustState,
      freshness: input.freshness,
      sourceModules: step.sourceModules,
      blockers: step.blockers,
      redactions: step.redactions,
      drillThrough: step.drillThrough ?? routeDrillThrough(step.label, "/dashboard", "dashboard.read"),
      actionLink: null,
    }))
}

function buildProofSubjects(input: {
  organizationId: string
  proofSubjectIds: ProofSubjectIds
}): BIProofDrawerSubject[] {
  return [
    proofSubject({
      organizationId: input.organizationId,
      moduleSlug: "payment_reconciliation",
      subjectType: "payment.transaction",
      subjectId: input.proofSubjectIds["payment.transaction"] ?? null,
      label: "Payment transaction proof",
      sourceModules: ["payments", "finance"],
    }),
    proofSubject({
      organizationId: input.organizationId,
      moduleSlug: "payment_reconciliation",
      subjectType: "reconciliation.run",
      subjectId: input.proofSubjectIds["reconciliation.run"] ?? null,
      label: "Reconciliation proof",
      sourceModules: ["payments", "finance", "accounting"],
    }),
    proofSubject({
      organizationId: input.organizationId,
      moduleSlug: "accounting",
      subjectType: "journal.entry",
      subjectId: input.proofSubjectIds["journal.entry"] ?? null,
      label: "Ledger proof",
      sourceModules: ["accounting"],
    }),
    proofSubject({
      organizationId: input.organizationId,
      moduleSlug: "close_assurance",
      subjectType: "close.run",
      subjectId: input.proofSubjectIds["close.run"] ?? null,
      label: "Close proof",
      sourceModules: ["accounting", "close"],
    }),
  ]
}

function proofSubject(input: {
  organizationId: string
  moduleSlug: CommercialModuleSlug
  subjectType: ProofTrailSubjectType
  subjectId: string | null
  label: string
  sourceModules: SnapshotSourceModule[]
}): BIProofDrawerSubject {
  const requiredPermission = SUBJECT_PERMISSION_MAP[input.subjectType]

  if (!input.subjectId) {
    return {
      available: false,
      organizationId: input.organizationId,
      moduleSlug: input.moduleSlug,
      label: input.label,
      requiredPermission,
      unavailableReason: "No supported proof subject exists for this step in the selected period.",
      sourceModules: input.sourceModules,
    }
  }

  return {
    available: true,
    organizationId: input.organizationId,
    moduleSlug: input.moduleSlug,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    label: input.label,
    requiredPermission,
    sourceModules: input.sourceModules,
  }
}

function routeDrillThrough(label: string, href: string, requiredPermission: string): BIDrillThrough {
  return {
    available: true,
    type: "route",
    label,
    href,
    requiredPermission,
  }
}

function proofOrRouteDrillThrough(input: {
  label: string
  href: string
  subjectType: ProofTrailSubjectType
  subjectId: string | null
  requiredPermission: string
}): BIDrillThrough {
  return {
    available: true,
    type: input.subjectId ? "route_and_proof" : "route",
    label: input.label,
    href: input.href,
    subjectType: input.subjectId ? input.subjectType : undefined,
    subjectId: input.subjectId ?? undefined,
    requiredPermission: input.requiredPermission,
  }
}

function inventoryEvidence(periodTransactionCount: number): EvidenceGrade {
  return periodTransactionCount > 0 ? "operational" : "raw"
}

function toBIBlocker(blocker: SnapshotResult<TenantOperatingMetrics>["blockers"][number]): BIBlocker {
  return {
    id: blocker.id,
    severity: blocker.severity,
    gate: blocker.gate,
    title: blocker.title,
    detail: blocker.detail,
    sourceTables: blocker.sourceTables,
    nextAction: blocker.nextAction,
  }
}

async function getLatestProofSubjectIds(input: {
  organizationId: string
  periodStart: string
  periodEnd: string
}): Promise<ProofSubjectIds> {
  const periodStart = new Date(input.periodStart)
  const periodEnd = new Date(input.periodEnd)
  const periodWhere = { gte: periodStart, lte: periodEnd }
  const periodOverlap = {
    startDate: { lte: periodEnd },
    endDate: { gte: periodStart },
  }

  const [paymentTransaction, reconciliationRun, journalEntry, closeRun] = await Promise.all([
    db.paymentTransaction.findFirst({
      where: {
        organizationId: input.organizationId,
        OR: [
          { occurredAt: periodWhere },
          { confirmedAt: periodWhere },
          { settledAt: periodWhere },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
    db.reconciliationRun.findFirst({
      where: {
        organizationId: input.organizationId,
        voidedAt: null,
        businessDate: periodWhere,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
    db.journalEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        entryDate: periodWhere,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
    db.closeRun.findFirst({
      where: {
        organizationId: input.organizationId,
        voidedAt: null,
        period: periodOverlap,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
  ])

  return {
    "payment.transaction": paymentTransaction?.id ?? null,
    "reconciliation.run": reconciliationRun?.id ?? null,
    "journal.entry": journalEntry?.id ?? null,
    "close.run": closeRun?.id ?? null,
  }
}
