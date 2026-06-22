import "server-only"

import { createHash } from "node:crypto"

import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import type { CommercialModuleSlug } from "@/services/modules/module-control-contracts"
import type {
  BranchOperatingMetrics,
  CloseReadinessMetrics,
  InventoryCashMetrics,
  PaymentTruthMetrics,
  SnapshotFreshness,
  SnapshotResult,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"

import {
  type BusinessSignal,
  type BusinessSignalFact,
  type BusinessSignalPayload,
  type BusinessSignalSeverity,
  type BusinessSignalType,
  type SignalOwnerRole,
} from "./business-signal-contracts"
import { dedupeBusinessSignals } from "./business-signal.service"

type AnySnapshot =
  | SnapshotResult<TenantOperatingMetrics>
  | SnapshotResult<BranchOperatingMetrics>
  | SnapshotResult<PaymentTruthMetrics>
  | SnapshotResult<InventoryCashMetrics>
  | SnapshotResult<CloseReadinessMetrics>

const SEVERITY_SCORE: Record<BusinessSignalSeverity, number> = {
  info: 10,
  low: 25,
  medium: 50,
  high: 75,
  critical: 95,
}

const TYPE_DEFAULTS: Record<
  BusinessSignalType,
  {
    moduleSlug: CommercialModuleSlug
    requiredPermission: string
    assignedRole: SignalOwnerRole
    actionPath: string
    suggestedAction: string
    businessImpact: string
    expiryHours: number
  }
> = {
  cash_drawer_variance: {
    moduleSlug: "cash_drawer",
    requiredPermission: "pos.cash.drawer.open",
    assignedRole: "manager",
    actionPath: "/dashboard/cash-drawer",
    suggestedAction: "Review drawer movements and attach variance evidence.",
    businessImpact: "Cash variance can hide leakage, posting drift, or process breakdown.",
    expiryHours: 24,
  },
  open_payment_suspense: {
    moduleSlug: "payment_reconciliation",
    requiredPermission: "payments.reconciliation.read",
    assignedRole: "finance",
    actionPath: "/dashboard/finance/reconciliation",
    suggestedAction: "Review suspense lines and resolve missing payment evidence.",
    businessImpact: "Unresolved suspense weakens cash truth and period-close confidence.",
    expiryHours: 48,
  },
  duplicate_provider_reference: {
    moduleSlug: "payment_reconciliation",
    requiredPermission: "payments.reconciliation.read",
    assignedRole: "finance",
    actionPath: "/dashboard/finance/reconciliation",
    suggestedAction: "Investigate duplicate provider reference before matching or close.",
    businessImpact: "Duplicate provider references can indicate replay, duplicate capture, or reconciliation error.",
    expiryHours: 24,
  },
  refund_void_spike: {
    moduleSlug: "pos",
    requiredPermission: "pos.transactions.read",
    assignedRole: "manager",
    actionPath: "/dashboard/analytics",
    suggestedAction: "Review refund and void evidence for the affected period.",
    businessImpact: "Refund or void spikes can point to cash leakage or control weakness.",
    expiryHours: 24,
  },
  stockout_risk: {
    moduleSlug: "inventory",
    requiredPermission: "inventory.read",
    assignedRole: "stockkeeper",
    actionPath: "/dashboard/inventory",
    suggestedAction: "Review stock levels and confirm reorder or transfer action.",
    businessImpact: "Stockout risk can turn demand into lost sales and unhappy customers.",
    expiryHours: 48,
  },
  dead_stock_cash_exposure: {
    moduleSlug: "inventory",
    requiredPermission: "inventory.read",
    assignedRole: "stockkeeper",
    actionPath: "/dashboard/inventory",
    suggestedAction: "Review slow-moving stock and decide markdown, transfer, or supplier action.",
    businessImpact: "Dead stock traps working capital that could fund faster-moving inventory.",
    expiryHours: 168,
  },
  purchase_order_receiving_delay: {
    moduleSlug: "purchasing",
    requiredPermission: "purchases.orders.read",
    assignedRole: "purchasing",
    actionPath: "/dashboard/purchase-orders",
    suggestedAction: "Follow up pending purchase orders and receiving evidence.",
    businessImpact: "Receiving delays can hide supplier risk, stockouts, or AP timing issues.",
    expiryHours: 72,
  },
  payroll_exposure: {
    moduleSlug: "payroll",
    requiredPermission: "payroll.runs.review",
    assignedRole: "payroll",
    actionPath: "/dashboard/payroll",
    suggestedAction: "Review payroll payment and posting evidence without exposing person-level amounts.",
    businessImpact: "Payroll exposure can affect staff trust, cash planning, and close accuracy.",
    expiryHours: 72,
  },
  close_blocker: {
    moduleSlug: "close_assurance",
    requiredPermission: "accounting.close.read",
    assignedRole: "accountant",
    actionPath: "/dashboard/accounting/close-assurance",
    suggestedAction: "Resolve close blockers or attach missing evidence before certification.",
    businessImpact: "Close blockers delay reliable reporting and accountant review.",
    expiryHours: 72,
  },
}

export function severityScore(severity: BusinessSignalSeverity) {
  return SEVERITY_SCORE[severity]
}

export function severityFromScore(score: number): BusinessSignalSeverity {
  if (score >= 90) return "critical"
  if (score >= 70) return "high"
  if (score >= 45) return "medium"
  if (score >= 20) return "low"
  return "info"
}

export function buildBusinessSignalsFromFacts(
  facts: readonly BusinessSignalFact[],
  options: { now?: Date | string | null } = {},
) {
  return dedupeBusinessSignals(facts.map((fact) => createBusinessSignalFromFact(fact, options.now)))
}

export function buildBusinessSignalsFromSnapshots(input: {
  organizationId: string
  snapshots: readonly AnySnapshot[]
  now?: Date | string | null
}) {
  const signals = input.snapshots.flatMap((snapshot) => buildSnapshotSignals(input.organizationId, snapshot, input.now))
  return dedupeBusinessSignals(signals)
}

export function createBusinessSignalFromFact(
  fact: BusinessSignalFact,
  nowInput?: Date | string | null,
): BusinessSignal {
  const now = normalizeDate(fact.generatedAt ?? nowInput)
  const defaults = TYPE_DEFAULTS[fact.signalType]
  const severity = fact.severity ?? severityFromScore(fact.severityScore ?? severityScoreForFact(fact))
  const severityValue = fact.severityScore ?? severityScore(severity)
  const expiresAt = normalizeDate(fact.expiresAt ?? new Date(now.getTime() + (fact.expiresInHours ?? defaults.expiryHours) * 3_600_000))
  const freshness = normalizeFreshness(fact.freshness, now)
  const payload = sanitizeSignalPayload(fact.payload ?? {}, fact.redactions ?? [])
  const dedupeKey = buildSignalDedupeKey({
    organizationId: fact.organizationId,
    signalType: fact.signalType,
    moduleSlug: fact.moduleSlug,
    subjectType: fact.subjectType,
    subjectId: fact.subjectId,
    dedupeScope: fact.dedupeScope ?? null,
  })

  return {
    id: createStableId("sig", dedupeKey),
    organizationId: fact.organizationId,
    moduleSlug: fact.moduleSlug,
    sourceModule: fact.sourceModule,
    signalType: fact.signalType,
    title: fact.title ?? titleFor(fact.signalType),
    detail: fact.detail ?? detailFor(fact.signalType),
    businessImpact: fact.businessImpact ?? defaults.businessImpact,
    subjectType: fact.subjectType,
    subjectId: fact.subjectId,
    evidenceGrade: fact.evidenceGrade ?? "operational",
    severity,
    severityScore: severityValue,
    status: expiresAt.getTime() <= now.getTime() ? "expired" : freshness.stale ? "stale" : "active",
    dedupeKey,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    freshness,
    suggestedAction: fact.suggestedAction ?? defaults.suggestedAction,
    actionPath: fact.actionPath ?? defaults.actionPath,
    requiredPermission: fact.requiredPermission ?? defaults.requiredPermission,
    assignedRole: fact.assignedRole ?? defaults.assignedRole,
    assigneeId: fact.assigneeId ?? null,
    blockers: fact.blockers ?? [],
    redactions: fact.redactions ?? [],
    payload,
    proofLink: fact.proofLink ?? null,
  }
}

function buildSnapshotSignals(
  organizationId: string,
  snapshot: AnySnapshot,
  nowInput?: Date | string | null,
): BusinessSignal[] {
  const base = {
    organizationId,
    evidenceGrade: snapshot.evidenceGrade,
    generatedAt: snapshot.generatedAt,
    freshness: snapshot.freshness,
    blockers: snapshot.blockers,
    redactions: snapshot.redactions,
  }

  if (snapshot.kind === "payment.truth") {
    const metrics = snapshot.metrics as PaymentTruthMetrics
    return [
      metrics.openSuspenseCount > 0 || metrics.openSuspenseAmount > 0
        ? createBusinessSignalFromFact({
            ...base,
            signalType: "open_payment_suspense",
            moduleSlug: "payment_reconciliation",
            sourceModule: "payments",
            subjectType: "payment.suspense",
            subjectId: "open-suspense",
            severity: metrics.criticalExceptionCount > 0 || metrics.openSuspenseAmount >= 500_000 ? "high" : "medium",
            payload: {
              openSuspenseCount: metrics.openSuspenseCount,
              openSuspenseAmount: metrics.openSuspenseAmount,
              openExceptionCount: metrics.openExceptionCount,
            },
            proofLink: { subjectType: "reconciliation.run", subjectId: "latest" },
          }, nowInput)
        : null,
    ].filter(Boolean) as BusinessSignal[]
  }

  if (snapshot.kind === "inventory.cash") {
    const metrics = snapshot.metrics as InventoryCashMetrics
    return [
      metrics.zeroStockLevelCount > 0 || metrics.negativeStockLevelCount > 0
        ? createBusinessSignalFromFact({
            ...base,
            signalType: "stockout_risk",
            moduleSlug: "inventory",
            sourceModule: "inventory",
            subjectType: "inventory.level",
            subjectId: "stockout-risk",
            severity: metrics.negativeStockLevelCount > 0 ? "high" : "medium",
            payload: {
              zeroStockLevelCount: metrics.zeroStockLevelCount,
              negativeStockLevelCount: metrics.negativeStockLevelCount,
              inventoryValue: metrics.inventoryValue,
            },
          }, nowInput)
        : null,
      metrics.inventoryValue > 0 && metrics.periodTransactionCount === 0
        ? createBusinessSignalFromFact({
            ...base,
            signalType: "dead_stock_cash_exposure",
            moduleSlug: "inventory",
            sourceModule: "inventory",
            subjectType: "inventory.cash",
            subjectId: "dead-stock-cash-exposure",
            severity: metrics.inventoryValue >= 1_000_000 ? "high" : "medium",
            payload: {
              inventoryValue: metrics.inventoryValue,
              trackedItemCount: metrics.trackedItemCount,
              periodTransactionCount: metrics.periodTransactionCount,
            },
          }, nowInput)
        : null,
    ].filter(Boolean) as BusinessSignal[]
  }

  if (snapshot.kind === "close.readiness") {
    const metrics = snapshot.metrics as CloseReadinessMetrics
    return metrics.openFindingCount > 0 || metrics.blockedCloseRunCount > 0 || metrics.unavailableEvidenceCount > 0
      ? [
          createBusinessSignalFromFact({
            ...base,
            signalType: "close_blocker",
            moduleSlug: "close_assurance",
            sourceModule: "close",
            subjectType: "close.run",
            subjectId: "latest",
            severity: metrics.criticalOpenFindingCount > 0 || metrics.blockedCloseRunCount > 0 ? "critical" : "high",
            payload: {
              openFindingCount: metrics.openFindingCount,
              criticalOpenFindingCount: metrics.criticalOpenFindingCount,
              unavailableEvidenceCount: metrics.unavailableEvidenceCount,
            },
            proofLink: { subjectType: "close.run", subjectId: "latest" },
          }, nowInput),
        ]
      : []
  }

  if (snapshot.kind === "tenant.operating") {
    const metrics = snapshot.metrics as TenantOperatingMetrics
    return [
      metrics.pendingPurchaseOrderCount > 0
        ? createBusinessSignalFromFact({
            ...base,
            signalType: "purchase_order_receiving_delay",
            moduleSlug: "purchasing",
            sourceModule: "purchasing",
            subjectType: "purchase.order",
            subjectId: "pending-receiving",
            severity: metrics.pendingPurchaseOrderCount >= 5 ? "high" : "medium",
            payload: { pendingPurchaseOrderCount: metrics.pendingPurchaseOrderCount },
          }, nowInput)
        : null,
      metrics.approvedOrPaidPayrollRunCount > 0
        ? createBusinessSignalFromFact({
            ...base,
            signalType: "payroll_exposure",
            moduleSlug: "payroll",
            sourceModule: "payroll",
            subjectType: "payroll.run",
            subjectId: "approved-or-paid",
            severity: "medium",
            redactions: [
              ...snapshot.redactions,
              {
                id: "payroll-person-level-redaction",
                field: "personLevelAmounts",
                reason: "Payroll signal only exposes aggregate exposure.",
                policy: "kontava-payroll-person-redaction-policy",
              },
            ],
            payload: {
              approvedOrPaidPayrollRunCount: metrics.approvedOrPaidPayrollRunCount,
              personLevelAmounts: "hidden",
            },
          }, nowInput)
        : null,
    ].filter(Boolean) as BusinessSignal[]
  }

  if (snapshot.kind === "branch.operating") {
    const metrics = snapshot.metrics as BranchOperatingMetrics
    return metrics.pendingPurchaseOrderCount > 0
      ? [
          createBusinessSignalFromFact({
            ...base,
            signalType: "purchase_order_receiving_delay",
            moduleSlug: "purchasing",
            sourceModule: "purchasing",
            subjectType: "purchase.order",
            subjectId: `${snapshot.locationId ?? "tenant"}:pending-receiving`,
            severity: metrics.pendingPurchaseOrderCount >= 3 ? "high" : "medium",
            payload: { pendingPurchaseOrderCount: metrics.pendingPurchaseOrderCount },
          }, nowInput),
        ]
      : []
  }

  return []
}

export function buildSignalDedupeKey(input: {
  organizationId: string
  signalType: BusinessSignalType
  moduleSlug: CommercialModuleSlug
  subjectType: string
  subjectId: string
  dedupeScope?: string | null
}) {
  return [
    input.organizationId,
    input.signalType,
    input.moduleSlug,
    input.subjectType,
    input.subjectId,
    input.dedupeScope ?? "current",
  ].join(":")
}

export function createStableId(prefix: string, value: string) {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, 24)}`
}

export function sanitizeSignalPayload(
  payload: BusinessSignalPayload,
  redactions: readonly { field: string }[],
): BusinessSignalPayload {
  const copy = { ...payload }
  for (const redaction of redactions) {
    const rootField = redaction.field.split(".")[0]
    if (rootField in copy) copy[rootField] = "[REDACTED:SIGNAL]"
  }
  return copy
}

function severityScoreForFact(fact: BusinessSignalFact) {
  const payload = fact.payload ?? {}
  const amount = numberValue(payload.amount ?? payload.openSuspenseAmount ?? payload.inventoryValue)
  const count = numberValue(payload.count ?? payload.openSuspenseCount ?? payload.criticalOpenFindingCount)

  if (fact.signalType === "close_blocker" && count > 0) return 95
  if (fact.signalType === "duplicate_provider_reference") return 85
  if (amount >= 1_000_000 || count >= 10) return 80
  if (amount >= 250_000 || count >= 3) return 60
  if (amount > 0 || count > 0) return 45
  return 25
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeFreshness(input: Partial<SnapshotFreshness> | undefined, now: Date): SnapshotFreshness {
  return {
    generatedAt: input?.generatedAt ?? now.toISOString(),
    sourceMaxUpdatedAt: input?.sourceMaxUpdatedAt ?? null,
    maxAgeMinutes: input?.maxAgeMinutes ?? 24 * 60,
    stale: input?.stale ?? false,
    staleReason: input?.staleReason ?? null,
  }
}

function normalizeDate(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

function titleFor(type: BusinessSignalType) {
  return type
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

function detailFor(type: BusinessSignalType) {
  return `Kontava detected a ${type.replace(/_/g, " ")} signal that needs review.`
}
