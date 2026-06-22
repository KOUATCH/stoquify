import "server-only"

import type { EvidenceGrade } from "@/services/evidence/evidence-contracts"
import { SUBJECT_PERMISSION_MAP } from "@/services/evidence/evidence-contracts"
import { getModuleControlCenterData } from "@/services/modules/module-entitlement.service"
import { buildActionQueue } from "@/services/signals/action-queue.service"
import { buildBusinessSignalsFromSnapshots } from "@/services/signals/business-signal-rules.service"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import type {
  SnapshotBlocker,
  SnapshotFreshness,
  SnapshotRedaction,
  SnapshotResult,
  SnapshotSourceModule,
  SnapshotUiState,
} from "@/services/snapshots/snapshot-contracts"
import { getTenantOperatingSnapshot } from "@/services/snapshots/tenant-operating-snapshot.service"
import { db } from "@/prisma/db"

import type {
  ComposeOwnerWarRoomInput,
  OwnerWarRoomCardId,
  OwnerWarRoomCardState,
  OwnerWarRoomData,
  OwnerWarRoomMetricCard,
  OwnerWarRoomStrip,
  OwnerWarRoomTone,
} from "./owner-war-room-contracts"

type OwnerWarRoomInput = {
  organizationId: string
  actorId?: string | null
  actorPermissions: readonly string[]
  periodStart?: Date | string | null
  periodEnd?: Date | string | null
  maxAgeMinutes?: number | null
  now?: Date | string | null
}

const DEFAULT_FRESHNESS: SnapshotFreshness = {
  generatedAt: new Date(0).toISOString(),
  sourceMaxUpdatedAt: null,
  maxAgeMinutes: 24 * 60,
  stale: false,
  staleReason: null,
}

export async function getOwnerWarRoomData(input: OwnerWarRoomInput): Promise<OwnerWarRoomData> {
  const scope = {
    organizationId: input.organizationId,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    maxAgeMinutes: input.maxAgeMinutes ?? null,
    now: input.now ?? null,
  }

  const [tenantOperating, paymentTruth, inventoryCash, closeReadiness, moduleControl] = await Promise.all([
    getTenantOperatingSnapshot(scope),
    getPaymentTruthSnapshot(scope),
    getInventoryCashSnapshot(scope),
    getCloseReadinessSnapshot(scope),
    getModuleControlCenterData({
      organizationId: input.organizationId,
      actorId: input.actorId,
      actorPermissions: input.actorPermissions,
      now: input.now ?? null,
    }),
  ])

  const signals = buildBusinessSignalsFromSnapshots({
    organizationId: input.organizationId,
    snapshots: [tenantOperating, paymentTruth, inventoryCash, closeReadiness],
  })
  const actionQueue = buildActionQueue({
    organizationId: input.organizationId,
    signals,
    actorPermissions: input.actorPermissions,
    now: input.now ?? null,
  })
  const proofSubjectIds = await getLatestProofSubjectIds({
    organizationId: input.organizationId,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
  })

  return composeOwnerWarRoomData({
    organizationId: input.organizationId,
    organizationName: moduleControl.organizationName,
    generatedAt: normalizeNow(input.now).toISOString(),
    snapshots: {
      tenantOperating,
      paymentTruth,
      inventoryCash,
      closeReadiness,
    },
    actionQueue,
    moduleControl,
    proofSubjectIds,
  })
}

export function composeOwnerWarRoomData(input: ComposeOwnerWarRoomInput): OwnerWarRoomData {
  const { tenantOperating, paymentTruth, inventoryCash, closeReadiness } = input.snapshots
  const cards: OwnerWarRoomMetricCard[] = [
    card({
      id: "cash_at_risk",
      title: "Cash at risk",
      detail: "Unresolved payment suspense value that should be explained before owners trust cash.",
      value: paymentTruth.metrics.openSuspenseAmount,
      unit: "value",
      tone: paymentTruth.metrics.openSuspenseAmount > 0 ? "danger" : "success",
      requiredPermission: "payments.reconciliation.read",
      href: "/dashboard/finance/payments/reconciliation",
      snapshot: paymentTruth,
    }),
    card({
      id: "reconciliation_exceptions",
      title: "Reconciliation exceptions",
      detail: "Open payment exceptions, critical issues, suspense items, and pending provider transactions.",
      value:
        paymentTruth.metrics.openExceptionCount +
        paymentTruth.metrics.openSuspenseCount +
        paymentTruth.metrics.pendingTransactionCount,
      unit: "items",
      tone: paymentTruth.metrics.criticalExceptionCount > 0 ? "danger" : "gold",
      requiredPermission: "payments.reconciliation.read",
      href: "/dashboard/finance/payments",
      snapshot: paymentTruth,
    }),
    card({
      id: "stock_cash_exposure",
      title: "Stock cash exposure",
      detail: "Inventory value tied up in stock, with zero or negative-stock pressure highlighted.",
      value: inventoryCash.metrics.inventoryValue,
      unit: "value",
      tone:
        inventoryCash.metrics.negativeStockLevelCount > 0 || inventoryCash.metrics.zeroStockLevelCount > 0
          ? "gold"
          : "spruce",
      requiredPermission: "inventory.read",
      href: "/dashboard/inventory/stock",
      snapshot: inventoryCash,
    }),
    card({
      id: "supplier_commitments",
      title: "Supplier commitments",
      detail: "Pending purchase orders that may soon become cash obligations or receiving blockers.",
      value: tenantOperating.metrics.pendingPurchaseOrderCount,
      unit: "orders",
      tone: tenantOperating.metrics.pendingPurchaseOrderCount > 0 ? "info" : "success",
      requiredPermission: "purchases.orders.read",
      href: "/dashboard/purchase-orders",
      snapshot: tenantOperating,
      sourceModules: ["purchasing", "finance", "accounting"],
    }),
    card({
      id: "payroll_exposure",
      title: "Payroll exposure",
      detail: "Approved or paid payroll runs are counted without exposing person-level amounts.",
      value: tenantOperating.metrics.approvedOrPaidPayrollRunCount,
      unit: "runs",
      tone: tenantOperating.metrics.approvedOrPaidPayrollRunCount > 0 ? "gold" : "muted",
      requiredPermission: "payroll.read",
      href: "/dashboard/payroll",
      snapshot: tenantOperating,
      redactions: [
        ...tenantOperating.redactions,
        {
          id: "owner-war-room-payroll-person-values-redacted",
          field: "payroll.personLevelAmounts",
          reason: "The Owner War Room shows payroll pressure counts only; employee-level values stay inside payroll.",
          policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
        },
      ],
      state: tenantOperating.metrics.approvedOrPaidPayrollRunCount > 0 ? "redacted" : undefined,
      sourceModules: ["payroll", "accounting", "finance"],
    }),
    card({
      id: "close_readiness",
      title: "Close readiness",
      detail: "Open findings, unavailable evidence, readiness score, and close blockers for the active period.",
      value: closeReadiness.metrics.averageReadinessScore ?? 0,
      unit: "score",
      tone:
        closeReadiness.metrics.criticalOpenFindingCount > 0 || closeReadiness.metrics.blockedCloseRunCount > 0
          ? "danger"
          : "brand",
      requiredPermission: "accounting.close.read",
      href: "/dashboard/accounting/close",
      snapshot: closeReadiness,
    }),
    {
      id: "action_queue",
      title: "Action queue",
      detail: "Permission-filtered owner actions generated from the current business signals.",
      value: input.actionQueue.summary.total,
      unit: "actions",
      tone: input.actionQueue.summary.bySeverity.critical > 0 ? "danger" : "info",
      state: input.actionQueue.filteredOutCount > 0 ? "permission_denied" : input.actionQueue.summary.total ? "ready" : "empty",
      evidenceGrade: strongestVisibleGrade(input.actionQueue.actionItems.map((item) => item.evidenceGrade)),
      freshness: paymentTruth.freshness,
      sourceModules: ["dashboard", "payments", "inventory", "purchasing", "payroll", "close"],
      blockers: input.actionQueue.actionItems.flatMap((item) => item.blockers),
      redactions: input.actionQueue.actionItems.flatMap((item) => item.redactions),
      requiredPermission: "dashboard.read",
      href: "/dashboard/owner-war-room",
    },
    {
      id: "module_observe",
      title: "Module observe",
      detail: "Modules that would be blocked under entitlement enforcement, shown only as controlled upgrade pressure.",
      value: input.moduleControl.summary.wouldBlockCount,
      unit: "modules",
      tone: input.moduleControl.summary.wouldBlockCount > 0 ? "gold" : "success",
      state: input.moduleControl.summary.wouldBlockCount > 0 ? "upgrade_request" : "ready",
      evidenceGrade: input.moduleControl.summary.wouldBlockCount > 0 ? "operational" : "posted",
      freshness: {
        ...DEFAULT_FRESHNESS,
        generatedAt: input.moduleControl.generatedAt,
        sourceMaxUpdatedAt: input.moduleControl.generatedAt,
      },
      sourceModules: ["dashboard"],
      blockers: [],
      redactions: [],
      requiredPermission: "system.settings.read",
      href: "/dashboard/settings/modules",
    },
  ]

  const strips: OwnerWarRoomStrip[] = [
    {
      id: "cash_leakage_radar",
      title: "Cash Leakage Radar MVP",
      detail:
        paymentTruth.metrics.openSuspenseCount > 0 || paymentTruth.metrics.criticalExceptionCount > 0
          ? "Cash truth has unresolved suspense or critical exceptions. Owners should clear these before trusting daily cash."
          : "No critical cash leakage signal is visible from the current payment snapshot.",
      severity: paymentTruth.metrics.criticalExceptionCount > 0 ? "critical" : paymentTruth.metrics.openSuspenseCount > 0 ? "high" : "info",
      evidenceGrade: paymentTruth.evidenceGrade,
      state: stateFromSnapshot(paymentTruth),
      blockers: paymentTruth.blockers,
      redactions: paymentTruth.redactions,
    },
    {
      id: "close_autopilot",
      title: "Close Autopilot strip",
      detail:
        closeReadiness.metrics.openFindingCount > 0
          ? "The close still has findings or unavailable evidence. Work the blockers before signoff."
          : "Close readiness has no open blocker surfaced by the current snapshot.",
      severity: closeReadiness.metrics.criticalOpenFindingCount > 0 ? "critical" : closeReadiness.metrics.openFindingCount > 0 ? "high" : "info",
      evidenceGrade: closeReadiness.evidenceGrade,
      state: stateFromSnapshot(closeReadiness),
      blockers: closeReadiness.blockers,
      redactions: closeReadiness.redactions,
    },
    {
      id: "module_control",
      title: "Module Control observe strip",
      detail:
        input.moduleControl.summary.wouldBlockCount > 0
          ? "Observe mode is showing modules that would be hidden after enforcement. Owners can request an upgrade from controlled surfaces."
          : "Module observe mode is clean for the current tenant entitlement set.",
      severity: input.moduleControl.summary.wouldBlockCount > 0 ? "medium" : "info",
      evidenceGrade: "operational",
      state: input.moduleControl.summary.wouldBlockCount > 0 ? "upgrade_request" : "ready",
      blockers: [],
      redactions: [],
    },
  ]

  const summary = {
    criticalCount: input.actionQueue.summary.bySeverity.critical,
    highCount: input.actionQueue.summary.bySeverity.high,
    redactedCount: cards.filter((item) => item.redactions.length > 0 || item.state === "redacted").length,
    staleCount: cards.filter((item) => item.freshness.stale || item.state === "stale").length,
    blockedCount: cards.filter((item) => item.blockers.length > 0 || item.state === "blocked").length,
    upgradePromptCount: cards.filter((item) => item.state === "upgrade_request").length,
  }

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    generatedAt: input.generatedAt,
    periodStart: tenantOperating.periodStart,
    periodEnd: tenantOperating.periodEnd,
    cards,
    strips,
    proofSubjects: [
      {
        subjectType: "journal.entry",
        subjectId: input.proofSubjectIds?.["journal.entry"] ?? "",
        label: "Ledger proof",
        detail: "Inspect ledger evidence when a posted journal entry is selected from accounting.",
        requiredPermission: SUBJECT_PERMISSION_MAP["journal.entry"],
        enabled: Boolean(input.proofSubjectIds?.["journal.entry"]),
        unavailableReason:
          input.proofSubjectIds?.["journal.entry"]
            ? null
            : "No posted journal entry is visible in this period.",
      },
      {
        subjectType: "reconciliation.run",
        subjectId: input.proofSubjectIds?.["reconciliation.run"] ?? "",
        label: "Reconciliation proof",
        detail: "Inspect payment reconciliation evidence and blockers for the selected run.",
        requiredPermission: SUBJECT_PERMISSION_MAP["reconciliation.run"],
        enabled: Boolean(input.proofSubjectIds?.["reconciliation.run"]),
        unavailableReason:
          input.proofSubjectIds?.["reconciliation.run"]
            ? null
            : "No reconciliation run is visible in this period.",
      },
      {
        subjectType: "close.run",
        subjectId: input.proofSubjectIds?.["close.run"] ?? "",
        label: "Close proof",
        detail: "Inspect close evidence, findings, redactions, and readiness blockers.",
        requiredPermission: SUBJECT_PERMISSION_MAP["close.run"],
        enabled: Boolean(input.proofSubjectIds?.["close.run"]),
        unavailableReason:
          input.proofSubjectIds?.["close.run"]
            ? null
            : "No close run is visible in this period.",
      },
    ],
    actionQueue: input.actionQueue,
    moduleControl: {
      mode: input.moduleControl.mode,
      hardEnforcementEnabled: input.moduleControl.hardEnforcementEnabled,
      summary: input.moduleControl.summary,
      generatedAt: input.moduleControl.generatedAt,
      unknownRequestedModules: input.moduleControl.unknownRequestedModules,
    },
    summary,
  }
}

function card(input: {
  id: OwnerWarRoomCardId
  title: string
  detail: string
  value: number
  unit: string
  tone: OwnerWarRoomTone
  requiredPermission: string
  href: string
  snapshot: SnapshotResult<unknown>
  sourceModules?: SnapshotSourceModule[]
  redactions?: SnapshotRedaction[]
  state?: OwnerWarRoomCardState
}): OwnerWarRoomMetricCard {
  return {
    id: input.id,
    title: input.title,
    detail: input.detail,
    value: input.value,
    unit: input.unit,
    tone: input.tone,
    state: input.state ?? stateFromSnapshot(input.snapshot),
    evidenceGrade: input.snapshot.evidenceGrade,
    freshness: input.snapshot.freshness,
    sourceModules: input.sourceModules ?? input.snapshot.sourceModules,
    blockers: input.snapshot.blockers,
    redactions: input.redactions ?? input.snapshot.redactions,
    requiredPermission: input.requiredPermission,
    href: input.href,
  }
}

function stateFromSnapshot(snapshot: SnapshotResult<unknown>): OwnerWarRoomCardState {
  const mapped = mapUiState(snapshot.uiState)
  if (mapped !== "ready") return mapped
  if (snapshot.redactions.length > 0) return "redacted"
  if (snapshot.blockers.length > 0) return "blocked"
  if (snapshot.freshness.stale) return "stale"
  return "ready"
}

function mapUiState(state: SnapshotUiState): OwnerWarRoomCardState {
  if (state === "fresh") return "ready"
  if (state === "module_unavailable") return "module_unavailable"
  if (state === "safe_error") return "safe_error"
  if (state === "permission_denied") return "permission_denied"
  return state
}

function strongestVisibleGrade(grades: EvidenceGrade[]): EvidenceGrade {
  if (grades.includes("blocked")) return "blocked"
  if (grades.includes("certified")) return "certified"
  if (grades.includes("reconciled")) return "reconciled"
  if (grades.includes("posted")) return "posted"
  if (grades.includes("operational")) return "operational"
  return "raw"
}

function normalizeNow(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string") {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

async function getLatestProofSubjectIds(input: {
  organizationId: string
  periodStart: string
  periodEnd: string
}) {
  const periodStart = new Date(input.periodStart)
  const periodEnd = new Date(input.periodEnd)
  const periodWhere = { gte: periodStart, lte: periodEnd }
  const periodOverlap = {
    startDate: { lte: periodEnd },
    endDate: { gte: periodStart },
  }

  const [journalEntry, reconciliationRun, closeRun] = await Promise.all([
    db.journalEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        entryDate: periodWhere,
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
    "journal.entry": journalEntry?.id ?? null,
    "reconciliation.run": reconciliationRun?.id ?? null,
    "close.run": closeRun?.id ?? null,
  }
}
