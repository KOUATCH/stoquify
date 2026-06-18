import "server-only"

import {
  AccountantReviewStatus,
  AccountingPeriodStatus,
  CloseChecklistStatus,
  CloseEvidenceType,
  CloseFindingDomain,
  CloseFindingSeverity,
  CloseFindingStatus,
  CloseRunStatus,
  Prisma,
  type CloseAssuranceFinding,
  type CloseChecklistItem,
  type CloseEvidenceItem,
  type CloseRun,
} from "@prisma/client"
import { randomUUID } from "node:crypto"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import { getAccountantPortalData } from "./data-trust.service"
import {
  getPeriodClosePreflight,
  getPeriodClosePreflightFailures,
  type PeriodClosePreflight,
} from "./periods.service"
import { reconcileLedger, type LedgerReconciliationResult } from "./reconciliations.service"
import { getPaymentReconciliationDashboardData } from "@/services/reconciliation/payment-reconciliation-dashboard.service"
import {
  reconcileInventoryClass3,
  type InventoryClass3Failure,
  type InventoryClass3ReconciliationResult,
} from "@/services/inventory/inventory-valuation.service"
import {
  assertFindingCanReceiveComment,
  CloseAssuranceError,
  type ApproveCloseWaiverInput,
  type AssignCloseFindingInput,
  type CloseAssurancePeriodInput,
  type CloseEvidenceGraphInput,
  type CommentOnCloseFindingInput,
  type RequestCloseWaiverInput,
  type UpdateAccountantReviewInput,
} from "./close-assurance.schemas"

type DbClient = typeof db | Prisma.TransactionClient

type CloseControlContext = {
  actorId?: string | null
  actorPermissions?: readonly string[]
  lastAuthAt?: Date | number | string | null
  now?: Date | number | string | null
}

type ClosePeriodSummary = {
  id: string
  name: string
  status: AccountingPeriodStatus
  startDate: string
  endDate: string
}

export type CloseAssuranceChecklistDto = {
  id: string | null
  key: string
  domain: CloseFindingDomain
  status: CloseChecklistStatus
  severity: CloseFindingSeverity
  label: string
  detail: string
  sourceService: string
  evidenceCount: number
  blockerReason: string | null
  nextActionHref: string | null
  ownerId: string | null
  dueAt: string | null
}

export type CloseAssuranceFindingDto = {
  id: string | null
  checklistItemId: string | null
  domain: CloseFindingDomain
  severity: CloseFindingSeverity
  status: CloseFindingStatus
  title: string
  detail: string
  sourceService: string
  sourceType: string | null
  sourceId: string | null
  ownerId: string | null
  assignedById: string | null
  assignedAt: string | null
  dueAt: string | null
  waiverRequestedById: string | null
  waiverApprovedById: string | null
  correlationId: string | null
}

export type CloseEvidenceItemDto = {
  id: string | null
  checklistItemId: string | null
  findingId: string | null
  evidenceType: CloseEvidenceType
  sourceTable: string | null
  sourceType: string | null
  sourceId: string | null
  sourceLabel: string
  sourceDate: string | null
  sourceHash: string | null
  provenance: string
  available: boolean
  unavailableReason: string | null
  correlationId: string | null
  metadata?: Prisma.JsonValue | null
}

export type CloseAssuranceCommentDto = {
  id: string
  findingId: string | null
  evidenceItemId: string | null
  reviewId: string | null
  authorId: string | null
  body: string
  visibility: string
  createdAt: string
}

export type AccountantReviewDto = {
  id: string
  status: AccountantReviewStatus
  reviewerId: string | null
  openedById: string | null
  reviewedAt: string | null
  decisionNotes: string | null
  createdAt: string
}

export type CloseEvidenceGraphDto = {
  source: {
    mode: "CLOSE_ASSURANCE_EVIDENCE_GRAPH"
    asOf: string
    organizationScoped: true
    closeRunId: string | null
    periodId: string | null
  }
  nodes: Array<{
    id: string
    type: string
    label: string
    status?: string
    provenance?: string
    available?: boolean
  }>
  edges: Array<{
    from: string
    to: string
    label: string
  }>
}

export type CloseAssuranceDashboardData = {
  source: {
    mode: "CLOSE_ASSURANCE_CENTER"
    asOf: string
    organizationScoped: true
    persisted: boolean
    trustLevel: string
    provenance: "POSTED" | "UNAVAILABLE" | "MIXED"
    sourceTables: string[]
  }
  period: ClosePeriodSummary | null
  periods: {
    currentOpenPeriod: ClosePeriodSummary | null
    recentPeriods: ClosePeriodSummary[]
  }
  run: {
    id: string | null
    status: CloseRunStatus
    readinessScore: number
    criticalBlockerCount: number
    highBlockerCount: number
    evidenceCoveragePct: number | null
    correlationId: string | null
    runById: string | null
    startedAt: string | null
    completedAt: string | null
    createdAt: string | null
  }
  summary: {
    checklistCount: number
    passedCount: number
    failedCount: number
    warningCount: number
    unavailableCount: number
    findingCount: number
    openFindingCount: number
    evidenceCount: number
    commentCount: number
  }
  provenance: Array<{
    label: string
    provenance: "POSTED" | "OPERATIONAL" | "UNAVAILABLE"
    asOf: string
    periodStatus: string
    sourceTables: string[]
    reason?: string
  }>
  checklist: CloseAssuranceChecklistDto[]
  findings: CloseAssuranceFindingDto[]
  evidenceItems: CloseEvidenceItemDto[]
  comments: CloseAssuranceCommentDto[]
  reviews: AccountantReviewDto[]
  controls: {
    assignmentRequiresPermission: "accounting.close.finding.assign"
    waiverApprovalRequiresFreshAuth: true
    certificationAvailable: boolean
    certificationDisabledReason: string | null
    packExportAvailable: boolean
    packExportDisabledReason: string
  }
}

type AssessmentDraft = Omit<CloseAssuranceDashboardData, "comments" | "reviews"> & {
  raw: {
    period: Awaited<ReturnType<typeof resolveTargetPeriod>>
    checklist: Array<Omit<CloseAssuranceChecklistDto, "id">>
    findings: Array<Omit<CloseAssuranceFindingDto, "id" | "checklistItemId" | "assignedAt" | "waiverRequestedById" | "waiverApprovedById"> & { checklistKey: string }>
    evidenceItems: Array<Omit<CloseEvidenceItemDto, "id" | "checklistItemId" | "findingId"> & { checklistKey?: string }>
  }
}

type InventoryValuationAnnexMetadata = {
  organizationId: string
  accountingPeriodId: string
  asOf: string
  valuationMethod: "WEIGHTED_AVERAGE"
  sourceCounts: InventoryClass3ReconciliationResult["sourceCounts"] | null
  class3LedgerBalanceTotal: string | null
  inventorySubledgerValueTotal: string | null
  mismatchAmount: string | null
  sourceHash: string | null
  blockerStatus: "PASSED" | "INVENTORY_VALUATION_MISMATCH" | "EVIDENCE_UNAVAILABLE"
  failures: Array<{
    type: InventoryClass3Failure["type"] | "INVENTORY_VALUATION_UNAVAILABLE"
    severity: InventoryClass3Failure["severity"]
    message: string
    metadata?: Record<string, unknown>
  }>
}

const CLOSE_SOURCE_TABLES = [
  "accounting_periods",
  "journal_entries",
  "journal_entry_lines",
  "ledger_posting_batches",
  "accounting_source_links",
  "reconciliation_runs",
  "suspense_items",
  "payment_exceptions",
  "inventory_levels",
  "inventory_transactions",
  "stock_adjustments",
  "stock_count_sessions",
  "business_events",
  "ledger_audit_events",
  "audit_logs",
] as const

const openFindingStatuses = [
  CloseFindingStatus.OPEN,
  CloseFindingStatus.ASSIGNED,
  CloseFindingStatus.IN_REVIEW,
  CloseFindingStatus.REOPENED,
] as const

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null
}

function jsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return value as Prisma.InputJsonObject
}

function decimalNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return value
  return Number(value)
}

function closeRunStatusFromFindings(findings: Array<{ severity: CloseFindingSeverity; status: CloseFindingStatus }>) {
  const blockers = findings.filter(
    (finding) =>
      openFindingStatuses.includes(finding.status as (typeof openFindingStatuses)[number]) &&
      (finding.severity === CloseFindingSeverity.CRITICAL || finding.severity === CloseFindingSeverity.HIGH),
  )

  return blockers.length > 0 ? CloseRunStatus.BLOCKED : CloseRunStatus.READY
}

function severityFromStatus(status: CloseChecklistStatus, fallback: CloseFindingSeverity) {
  if (status === CloseChecklistStatus.FAILED) return fallback
  if (status === CloseChecklistStatus.WARNING) return CloseFindingSeverity.MEDIUM
  if (status === CloseChecklistStatus.UNAVAILABLE) return CloseFindingSeverity.MEDIUM
  return CloseFindingSeverity.INFO
}

function scoreFromChecklist(checklist: Array<{ status: CloseChecklistStatus }>) {
  if (checklist.length === 0) return 0
  const score = checklist.reduce((sum, item) => {
    if (item.status === CloseChecklistStatus.PASSED) return sum + 1
    if (item.status === CloseChecklistStatus.WARNING) return sum + 0.5
    if (item.status === CloseChecklistStatus.NOT_APPLICABLE) return sum + 1
    return sum
  }, 0)
  return Math.max(0, Math.min(100, Math.round((score / checklist.length) * 100)))
}

function coverageFromChecklist(checklist: Array<{ status: CloseChecklistStatus; evidenceCount: number }>) {
  const applicable = checklist.filter((item) => item.status !== CloseChecklistStatus.NOT_APPLICABLE)
  if (applicable.length === 0) return null
  return Number(((applicable.filter((item) => item.evidenceCount > 0).length / applicable.length) * 100).toFixed(2))
}

function periodSummary(period: Awaited<ReturnType<typeof resolveTargetPeriod>>): ClosePeriodSummary | null {
  if (!period) return null
  return {
    id: period.id,
    name: period.name,
    status: period.status,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
  }
}

async function listRecentPeriods(organizationId: string, client: DbClient = db, now = new Date()) {
  const periods = await client.accountingPeriod.findMany({
    where: { organizationId },
    orderBy: [{ startDate: "desc" }],
    take: 12,
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  })
  const currentOpenPeriod =
    periods.find((period) => period.status === AccountingPeriodStatus.OPEN && period.startDate <= now && period.endDate >= now) ??
    periods.find((period) => period.status === AccountingPeriodStatus.OPEN) ??
    null

  return {
    currentOpenPeriod: periodSummary(currentOpenPeriod),
    recentPeriods: periods.map((period) => periodSummary(period)!),
  }
}

async function resolveTargetPeriod(organizationId: string, periodId?: string | null, client: DbClient = db, now = new Date()) {
  if (periodId) {
    const period = await client.accountingPeriod.findFirst({
      where: { organizationId, id: periodId },
      select: { id: true, name: true, status: true, startDate: true, endDate: true },
    })
    if (!period) throw new NotFoundError("Accounting period not found")
    return period
  }

  const current = await client.accountingPeriod.findFirst({
    where: {
      organizationId,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
  })

  if (current) return current

  return client.accountingPeriod.findFirst({
    where: { organizationId, status: AccountingPeriodStatus.OPEN },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true, startDate: true, endDate: true },
  })
}

async function getPreflightSafe(organizationId: string, period: NonNullable<Awaited<ReturnType<typeof resolveTargetPeriod>>>) {
  if (period.status !== AccountingPeriodStatus.OPEN) {
    return {
      preflight: null,
      error: `Period ${period.name} is ${period.status}; close readiness can be reviewed but closing gates require an OPEN period.`,
      failures: [`Period ${period.name} is ${period.status}.`],
    }
  }

  try {
    const preflight = await getPeriodClosePreflight(organizationId, period.id)
    return { preflight, error: null, failures: getPeriodClosePreflightFailures(preflight) }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Period close preflight is unavailable."
    return { preflight: null, error: message, failures: [message] }
  }
}

function buildPreflightFindings(
  preflight: PeriodClosePreflight | null,
  failures: string[],
): Array<Omit<CloseAssuranceFindingDto, "id" | "checklistItemId" | "assignedAt" | "waiverRequestedById" | "waiverApprovedById"> & { checklistKey: string }> {
  const findings: Array<Omit<CloseAssuranceFindingDto, "id" | "checklistItemId" | "assignedAt" | "waiverRequestedById" | "waiverApprovedById"> & { checklistKey: string }> = []

  if (!preflight) {
    return failures.map((failure) => ({
      checklistKey: "period-close-preflight",
      domain: CloseFindingDomain.LEDGER,
      severity: CloseFindingSeverity.HIGH,
      status: CloseFindingStatus.OPEN,
      title: "Period close preflight unavailable",
      detail: failure,
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriod",
      sourceId: null,
      ownerId: null,
      assignedById: null,
      dueAt: null,
      correlationId: null,
    }))
  }

  const entries: Array<[number, string, CloseFindingDomain, CloseFindingSeverity]> = [
    [preflight.draftEntryCount, "Draft journal entries remain open", CloseFindingDomain.LEDGER, CloseFindingSeverity.HIGH],
    [preflight.unresolvedPostingBatchCount, "Pending or failed posting batches remain unresolved", CloseFindingDomain.LEDGER, CloseFindingSeverity.CRITICAL],
    [preflight.unlinkedPostedEntryCount, "Posted entries are missing posting batch links", CloseFindingDomain.LEDGER, CloseFindingSeverity.CRITICAL],
    [preflight.openReconciliationExceptionCount, "Open payment reconciliation exceptions block close", CloseFindingDomain.PAYMENT_RECONCILIATION, CloseFindingSeverity.CRITICAL],
    [preflight.openReconciliationSuspenseCount, "Open payment suspense items block close", CloseFindingDomain.SUSPENSE, CloseFindingSeverity.CRITICAL],
    [preflight.unsignedReconciliationRunCount, "Unsigned reconciliation runs block close", CloseFindingDomain.PAYMENT_RECONCILIATION, CloseFindingSeverity.HIGH],
  ]

  for (const [count, title, domain, severity] of entries) {
    if (count <= 0) continue
    findings.push({
      checklistKey: domain === CloseFindingDomain.SUSPENSE ? "suspense-exceptions" : "period-close-preflight",
      domain,
      severity,
      status: CloseFindingStatus.OPEN,
      title,
      detail: `${count} close blocker${count === 1 ? "" : "s"} detected by the period close preflight.`,
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "AccountingPeriodClosePreflight",
      sourceId: null,
      ownerId: null,
      assignedById: null,
      dueAt: null,
      correlationId: null,
    })
  }

  for (const issue of preflight.trialBalanceIssues) {
    findings.push({
      checklistKey: "ledger-reconciliation",
      domain: CloseFindingDomain.LEDGER,
      severity: CloseFindingSeverity.CRITICAL,
      status: CloseFindingStatus.OPEN,
      title: "Trial balance is out of balance",
      detail: `Currency ${issue.currency}: debits ${issue.debit.toFixed(2)} credits ${issue.credit.toFixed(2)}.`,
      sourceService: "services/accounting/periods.service.ts",
      sourceType: "TrialBalance",
      sourceId: issue.currency,
      ownerId: null,
      assignedById: null,
      dueAt: null,
      correlationId: null,
    })
  }

  return findings
}

function buildLedgerFindings(
  ledger: LedgerReconciliationResult,
): Array<Omit<CloseAssuranceFindingDto, "id" | "checklistItemId" | "assignedAt" | "waiverRequestedById" | "waiverApprovedById"> & { checklistKey: string }> {
  return ledger.failures.map((failure) => ({
    checklistKey: "ledger-reconciliation",
    domain: CloseFindingDomain.LEDGER,
    severity: failure.severity === "critical" ? CloseFindingSeverity.CRITICAL : CloseFindingSeverity.HIGH,
    status: CloseFindingStatus.OPEN,
    title: failure.type.replaceAll("_", " ").toLowerCase(),
    detail: failure.message,
    sourceService: "services/accounting/reconciliations.service.ts",
    sourceType: failure.type,
    sourceId: typeof failure.metadata?.journalEntryId === "string"
      ? failure.metadata.journalEntryId
      : typeof failure.metadata?.postingBatchId === "string"
        ? failure.metadata.postingBatchId
        : typeof failure.metadata?.sourceLinkId === "string"
          ? failure.metadata.sourceLinkId
          : null,
    ownerId: null,
    assignedById: null,
    dueAt: null,
    correlationId: null,
  }))
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}

function sourceIdFromInventoryFailure(failure: InventoryClass3Failure) {
  const metadata = failure.metadata ?? {}
  for (const key of ["inventoryTransactionId", "journalEntryId", "entryNumber", "referenceId"]) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

function buildInventoryValuationAnnex(
  params: {
    organizationId: string
    periodId: string
    asOf: string
    result?: InventoryClass3ReconciliationResult
    unavailableReason?: string
  },
): InventoryValuationAnnexMetadata {
  if (!params.result) {
    return {
      organizationId: params.organizationId,
      accountingPeriodId: params.periodId,
      asOf: params.asOf,
      valuationMethod: "WEIGHTED_AVERAGE",
      sourceCounts: null,
      class3LedgerBalanceTotal: null,
      inventorySubledgerValueTotal: null,
      mismatchAmount: null,
      sourceHash: null,
      blockerStatus: "EVIDENCE_UNAVAILABLE",
      failures: [{
        type: "INVENTORY_VALUATION_UNAVAILABLE",
        severity: "high",
        message: params.unavailableReason ?? "Inventory valuation assurance could not be loaded.",
      }],
    }
  }

  return {
    organizationId: params.organizationId,
    accountingPeriodId: params.periodId,
    asOf: params.asOf,
    valuationMethod: "WEIGHTED_AVERAGE",
    sourceCounts: params.result.sourceCounts,
    class3LedgerBalanceTotal: params.result.ledgerClass3Value,
    inventorySubledgerValueTotal: params.result.inventoryValue,
    mismatchAmount: params.result.driftAmount,
    sourceHash: params.result.reportHash,
    blockerStatus: params.result.status === "PASSED" ? "PASSED" : "INVENTORY_VALUATION_MISMATCH",
    failures: params.result.failures.map((failure) => ({
      type: failure.type,
      severity: failure.severity,
      message: failure.message,
      metadata: failure.metadata,
    })),
  }
}

function buildInventoryValuationFindings(
  annex: InventoryValuationAnnexMetadata,
): Array<Omit<CloseAssuranceFindingDto, "id" | "checklistItemId" | "assignedAt" | "waiverRequestedById" | "waiverApprovedById"> & { checklistKey: string }> {
  return annex.failures.map((failure) => ({
    checklistKey: "inventory-valuation",
    domain: CloseFindingDomain.INVENTORY_VALUATION,
    severity: failure.severity === "critical" ? CloseFindingSeverity.CRITICAL : CloseFindingSeverity.HIGH,
    status: CloseFindingStatus.OPEN,
    title: failure.type.replaceAll("_", " ").toLowerCase(),
    detail: failure.message,
    sourceService: "services/inventory/inventory-valuation.service.ts",
    sourceType: failure.type,
    sourceId: failure.type === "INVENTORY_VALUATION_UNAVAILABLE"
      ? annex.accountingPeriodId
      : sourceIdFromInventoryFailure(failure as InventoryClass3Failure),
    ownerId: null,
    assignedById: null,
    dueAt: null,
    correlationId: null,
  }))
}

function statutoryCertificationBlockerMetadata() {
  return {
    systemEvidenceStatus: "SYSTEM_EVIDENCE_ONLY",
    statutoryReadinessStatus: "STATUTORY_BLOCKED",
    statutoryAuthorityStatus: "AUTHORITY_NOT_CONFIGURED",
    blockers: [
      "AUTHORITY_NOT_CONFIGURED",
      "REQUIRES_EXPERT_REVIEW",
      "COUNTRY_PACK_UNVERIFIED",
      "ADAPTER_SANDBOX_ONLY",
    ],
  }
}

async function buildAssessment(
  organizationId: string,
  periodId?: string | null,
  now = new Date(),
): Promise<AssessmentDraft> {
  const period = await resolveTargetPeriod(organizationId, periodId, db, now)
  const periods = await listRecentPeriods(organizationId, db, now)

  if (!period) {
    return {
      source: {
        mode: "CLOSE_ASSURANCE_CENTER",
        asOf: now.toISOString(),
        organizationScoped: true,
        persisted: false,
        trustLevel: "T0",
        provenance: "UNAVAILABLE",
        sourceTables: [...CLOSE_SOURCE_TABLES],
      },
      period: null,
      periods,
      run: {
        id: null,
        status: CloseRunStatus.BLOCKED,
        readinessScore: 0,
        criticalBlockerCount: 1,
        highBlockerCount: 0,
        evidenceCoveragePct: null,
        correlationId: null,
        runById: null,
        startedAt: null,
        completedAt: null,
        createdAt: null,
      },
      summary: {
        checklistCount: 1,
        passedCount: 0,
        failedCount: 0,
        warningCount: 0,
        unavailableCount: 1,
        findingCount: 1,
        openFindingCount: 1,
        evidenceCount: 0,
        commentCount: 0,
      },
      provenance: [{
        label: "Accounting period",
        provenance: "UNAVAILABLE",
        asOf: now.toISOString(),
        periodStatus: "UNAVAILABLE",
        sourceTables: ["accounting_periods"],
        reason: "No accounting period is available for this organization.",
      }],
      checklist: [{
        id: null,
        key: "period",
        domain: CloseFindingDomain.LEDGER,
        status: CloseChecklistStatus.UNAVAILABLE,
        severity: CloseFindingSeverity.CRITICAL,
        label: "Accounting period",
        detail: "No accounting period is available for close assessment.",
        sourceService: "services/accounting/periods.service.ts",
        evidenceCount: 0,
        blockerReason: "Create fiscal periods before running close assurance.",
        nextActionHref: "/dashboard/accounting/setup",
        ownerId: null,
        dueAt: null,
      }],
      findings: [{
        id: null,
        checklistItemId: null,
        domain: CloseFindingDomain.LEDGER,
        severity: CloseFindingSeverity.CRITICAL,
        status: CloseFindingStatus.OPEN,
        title: "No accounting period",
        detail: "Close readiness requires an organization-scoped accounting period.",
        sourceService: "services/accounting/periods.service.ts",
        sourceType: "AccountingPeriod",
        sourceId: null,
        ownerId: null,
        assignedById: null,
        assignedAt: null,
        dueAt: null,
        waiverRequestedById: null,
        waiverApprovedById: null,
        correlationId: null,
      }],
      evidenceItems: [],
      controls: closeControls(),
      raw: {
        period: null,
        checklist: [],
        findings: [],
        evidenceItems: [],
      },
    }
  }

  const [preflightResult, ledger, paymentDashboard, dataTrust, inventoryValuation] = await Promise.all([
    getPreflightSafe(organizationId, period),
    reconcileLedger(organizationId, { periodId: period.id }),
    getPaymentReconciliationDashboardData(organizationId).catch((error) => ({ error })),
    getAccountantPortalData({ organizationId, periodId: period.id, limit: 12 }, db, now).catch((error) => ({ error })),
    reconcileInventoryClass3({ organizationId, periodId: period.id }).catch((error) => ({ error })),
  ])

  const preflight = preflightResult.preflight
  const paymentUnavailable = "error" in paymentDashboard
  const dataTrustUnavailable = "error" in dataTrust
  const inventoryUnavailable = "error" in inventoryValuation
  const inventoryUnavailableReason = inventoryUnavailable
    ? messageFromError(inventoryValuation.error, "Inventory valuation assurance could not be loaded.")
    : null
  const inventoryAnnex = buildInventoryValuationAnnex({
    organizationId,
    periodId: period.id,
    asOf: now.toISOString(),
    result: inventoryUnavailable ? undefined : inventoryValuation,
    unavailableReason: inventoryUnavailableReason ?? undefined,
  })
  const dataTrustLevel = dataTrustUnavailable ? "T0" : dataTrust.certificate.level
  const dataTrustBlockers = dataTrustUnavailable ? [] : dataTrust.blockers
  const dataTrustCritical = dataTrustBlockers.filter((blocker) => blocker.severity === "critical").length
  const dataTrustHigh = dataTrustBlockers.filter((blocker) => blocker.severity === "high").length
  const paymentEvidenceCount = paymentUnavailable
    ? 0
    : Number(paymentDashboard.source.providerEvidenceAvailable) + Number(paymentDashboard.source.statementEvidenceAvailable) + paymentDashboard.summary.signedRunCount
  const paymentOpenSuspense = paymentUnavailable ? 0 : paymentDashboard.summary.openSuspenseCount
  const paymentCriticalExceptions = paymentUnavailable ? 0 : paymentDashboard.summary.criticalExceptionCount
  const paymentUnsignedRuns = preflight?.unsignedReconciliationRunCount ?? 0

  const checklist: Array<Omit<CloseAssuranceChecklistDto, "id">> = [
    {
      key: "period-state",
      domain: CloseFindingDomain.LEDGER,
      status: period.status === AccountingPeriodStatus.OPEN ? CloseChecklistStatus.PASSED : CloseChecklistStatus.WARNING,
      severity: period.status === AccountingPeriodStatus.OPEN ? CloseFindingSeverity.INFO : CloseFindingSeverity.MEDIUM,
      label: "Accounting period state",
      detail: period.status === AccountingPeriodStatus.OPEN
        ? `${period.name} is open and available for close readiness.`
        : `${period.name} is ${period.status}; the center can review evidence but close actions require an open period.`,
      sourceService: "services/accounting/periods.service.ts",
      evidenceCount: 1,
      blockerReason: period.status === AccountingPeriodStatus.OPEN ? null : "Period is not OPEN.",
      nextActionHref: "/dashboard/accounting/setup",
      ownerId: null,
      dueAt: null,
    },
    {
      key: "period-close-preflight",
      domain: CloseFindingDomain.LEDGER,
      status: preflightResult.error
        ? CloseChecklistStatus.UNAVAILABLE
        : preflightResult.failures.length > 0
          ? CloseChecklistStatus.FAILED
          : CloseChecklistStatus.PASSED,
      severity: preflightResult.failures.length > 0 ? CloseFindingSeverity.CRITICAL : CloseFindingSeverity.INFO,
      label: "Period close preflight",
      detail: preflightResult.error ?? (preflightResult.failures.length ? preflightResult.failures.join("; ") : "No period close preflight blockers were detected."),
      sourceService: "services/accounting/periods.service.ts",
      evidenceCount: preflight ? 1 : 0,
      blockerReason: preflightResult.failures[0] ?? null,
      nextActionHref: "/dashboard/accounting/control-center",
      ownerId: null,
      dueAt: null,
    },
    {
      key: "ledger-reconciliation",
      domain: CloseFindingDomain.LEDGER,
      status: ledger.isClean ? CloseChecklistStatus.PASSED : CloseChecklistStatus.FAILED,
      severity: ledger.failures.some((failure) => failure.severity === "critical") ? CloseFindingSeverity.CRITICAL : CloseFindingSeverity.HIGH,
      label: "Ledger balance and traceability",
      detail: ledger.isClean ? "Posted ledger entries balance and retain posting/source traceability." : ledger.failures.map((failure) => failure.message).join("; "),
      sourceService: "services/accounting/reconciliations.service.ts",
      evidenceCount: ledger.totalsByCurrency.length,
      blockerReason: ledger.failures[0]?.message ?? null,
      nextActionHref: "/dashboard/accounting/reports/trial-balance",
      ownerId: null,
      dueAt: null,
    },
    {
      key: "payment-reconciliation",
      domain: CloseFindingDomain.PAYMENT_RECONCILIATION,
      status: paymentUnavailable
        ? CloseChecklistStatus.UNAVAILABLE
        : paymentUnsignedRuns > 0 || paymentCriticalExceptions > 0
          ? CloseChecklistStatus.FAILED
          : paymentDashboard.summary.readyForSignoffCount > 0 || paymentEvidenceCount === 0
            ? CloseChecklistStatus.WARNING
            : CloseChecklistStatus.PASSED,
      severity: paymentUnsignedRuns > 0 || paymentCriticalExceptions > 0 ? CloseFindingSeverity.CRITICAL : CloseFindingSeverity.MEDIUM,
      label: "Payment reconciliation sign-off",
      detail: paymentUnavailable
        ? "Payment reconciliation dashboard data is unavailable."
        : paymentUnsignedRuns > 0
          ? `${paymentUnsignedRuns} reconciliation run${paymentUnsignedRuns === 1 ? "" : "s"} must be signed or voided.`
          : paymentCriticalExceptions > 0
            ? `${paymentCriticalExceptions} critical payment exception${paymentCriticalExceptions === 1 ? "" : "s"} remain open.`
            : paymentDashboard.summary.readyForSignoffCount > 0
              ? `${paymentDashboard.summary.readyForSignoffCount} run${paymentDashboard.summary.readyForSignoffCount === 1 ? "" : "s"} await sign-off.`
              : "Payment reconciliation evidence is available for close review.",
      sourceService: "services/reconciliation/payment-reconciliation-dashboard.service.ts",
      evidenceCount: paymentEvidenceCount,
      blockerReason: paymentUnsignedRuns > 0 || paymentCriticalExceptions > 0 ? "Payment reconciliation is not fully signed off." : null,
      nextActionHref: "/dashboard/finance/reconciliation",
      ownerId: null,
      dueAt: null,
    },
    {
      key: "suspense-exceptions",
      domain: CloseFindingDomain.SUSPENSE,
      status: paymentUnavailable
        ? CloseChecklistStatus.UNAVAILABLE
        : (preflight?.openReconciliationSuspenseCount ?? paymentOpenSuspense) > 0
          ? CloseChecklistStatus.FAILED
          : CloseChecklistStatus.PASSED,
      severity: (preflight?.openReconciliationSuspenseCount ?? paymentOpenSuspense) > 0 ? CloseFindingSeverity.CRITICAL : CloseFindingSeverity.INFO,
      label: "Suspense and payment exceptions",
      detail: paymentUnavailable
        ? "Suspense workflow data is unavailable."
        : (preflight?.openReconciliationSuspenseCount ?? paymentOpenSuspense) > 0
          ? `${preflight?.openReconciliationSuspenseCount ?? paymentOpenSuspense} open suspense item${(preflight?.openReconciliationSuspenseCount ?? paymentOpenSuspense) === 1 ? "" : "s"} block close.`
          : "No open close-blocking suspense items were detected.",
      sourceService: "services/reconciliation/payment-suspense-workflow.service.ts",
      evidenceCount: paymentUnavailable ? 0 : paymentDashboard.suspenseQueue.length,
      blockerReason: (preflight?.openReconciliationSuspenseCount ?? paymentOpenSuspense) > 0 ? "Suspense must be resolved or approved through the suspense workflow." : null,
      nextActionHref: "/dashboard/finance/reconciliation",
      ownerId: null,
      dueAt: null,
    },
    {
      key: "data-trust-provenance",
      domain: CloseFindingDomain.DATA_TRUST,
      status: dataTrustUnavailable
        ? CloseChecklistStatus.UNAVAILABLE
        : dataTrustCritical > 0
          ? CloseChecklistStatus.FAILED
          : dataTrustHigh > 0 || dataTrustLevel !== "T4"
            ? CloseChecklistStatus.WARNING
            : CloseChecklistStatus.PASSED,
      severity: dataTrustCritical > 0 ? CloseFindingSeverity.CRITICAL : dataTrustHigh > 0 ? CloseFindingSeverity.HIGH : CloseFindingSeverity.MEDIUM,
      label: "Data trust and provenance",
      detail: dataTrustUnavailable
        ? "Accountant data-trust service is unavailable."
        : `Data-trust level ${dataTrustLevel}; ${dataTrustBlockers.length} blocker${dataTrustBlockers.length === 1 ? "" : "s"} detected.`,
      sourceService: "services/accounting/data-trust.service.ts",
      evidenceCount: dataTrustUnavailable ? 0 : dataTrust.latestSourceLinks.length + dataTrust.latestAuditEvents.length + 1,
      blockerReason: dataTrustBlockers[0]?.detail ?? null,
      nextActionHref: "/dashboard/accounting/accountant-portal",
      ownerId: null,
      dueAt: null,
    },
    {
      key: "inventory-valuation",
      domain: CloseFindingDomain.INVENTORY_VALUATION,
      status: inventoryUnavailable
        ? CloseChecklistStatus.UNAVAILABLE
        : inventoryValuation.status === "PASSED"
          ? CloseChecklistStatus.PASSED
          : CloseChecklistStatus.FAILED,
      severity: inventoryUnavailable
        ? CloseFindingSeverity.HIGH
        : inventoryValuation.failures.some((failure) => failure.severity === "critical")
          ? CloseFindingSeverity.CRITICAL
          : inventoryValuation.failures.length > 0
            ? CloseFindingSeverity.HIGH
            : CloseFindingSeverity.INFO,
      label: "Inventory valuation readiness",
      detail: inventoryUnavailable
        ? inventoryUnavailableReason ?? "Inventory valuation assurance could not be loaded."
        : inventoryValuation.status === "PASSED"
          ? `Inventory subledger value ${inventoryValuation.inventoryValue} reconciles to class 3 ledger value ${inventoryValuation.ledgerClass3Value} ${inventoryValuation.currency}.`
          : inventoryValuation.failures.map((failure) => failure.message).join("; "),
      sourceService: "services/inventory/inventory-valuation.service.ts",
      evidenceCount: inventoryUnavailable ? 0 : 1,
      blockerReason: inventoryAnnex.blockerStatus === "PASSED"
        ? null
        : inventoryAnnex.failures[0]?.message ?? "Inventory valuation assurance blocks close certification.",
      nextActionHref: "/dashboard/inventory",
      ownerId: null,
      dueAt: null,
    },
    {
      key: "tax-payroll-ap-readiness",
      domain: CloseFindingDomain.TAX,
      status: dataTrustUnavailable
        ? CloseChecklistStatus.UNAVAILABLE
        : dataTrust.moduleEvidence.some((module) => module.status === "blocked" && ["purchasing", "payroll", "compliance"].includes(module.module))
          ? CloseChecklistStatus.FAILED
          : dataTrust.moduleEvidence.some((module) => module.status === "needs_review" && ["purchasing", "payroll", "compliance"].includes(module.module))
            ? CloseChecklistStatus.WARNING
            : CloseChecklistStatus.PASSED,
      severity: CloseFindingSeverity.HIGH,
      label: "AP, payroll, and compliance exposure",
      detail: dataTrustUnavailable
        ? "AP/payroll/tax readiness data is unavailable."
        : dataTrust.moduleEvidence
            .filter((module) => ["purchasing", "payroll", "compliance"].includes(module.module))
            .map((module) => `${module.label}: ${module.status}`)
            .join("; "),
      sourceService: "services/accounting/data-trust.service.ts",
      evidenceCount: dataTrustUnavailable ? 0 : dataTrust.moduleEvidence.filter((module) => ["purchasing", "payroll", "compliance"].includes(module.module)).length,
      blockerReason: dataTrustBlockers.find((blocker) => ["purchasing", "payroll", "compliance"].some((gate) => blocker.gate.includes(gate)))?.detail ?? null,
      nextActionHref: "/dashboard/accounting/accountant-portal",
      ownerId: null,
      dueAt: null,
    },
  ].map((item) => ({ ...item, severity: severityFromStatus(item.status, item.severity) }))

  const findings = [
    ...buildPreflightFindings(preflight, preflightResult.failures),
    ...buildLedgerFindings(ledger),
    ...buildInventoryValuationFindings(inventoryAnnex),
    ...(!dataTrustUnavailable
      ? dataTrustBlockers
          .filter((blocker) => blocker.severity === "critical" || blocker.severity === "high")
          .map((blocker) => ({
            checklistKey: blocker.gate.includes("payment") ? "payment-reconciliation" : "data-trust-provenance",
            domain: blocker.gate.includes("payment")
              ? CloseFindingDomain.PAYMENT_RECONCILIATION
              : blocker.gate.includes("payroll")
                ? CloseFindingDomain.PAYROLL
                : blocker.gate.includes("purchasing")
                  ? CloseFindingDomain.AP
                  : blocker.gate.includes("compliance")
                    ? CloseFindingDomain.TAX
                    : CloseFindingDomain.DATA_TRUST,
            severity: blocker.severity === "critical" ? CloseFindingSeverity.CRITICAL : CloseFindingSeverity.HIGH,
            status: CloseFindingStatus.OPEN,
            title: blocker.title,
            detail: blocker.detail,
            sourceService: "services/accounting/data-trust.service.ts",
            sourceType: blocker.gate,
            sourceId: blocker.id,
            ownerId: null,
            assignedById: null,
            dueAt: null,
            correlationId: null,
          }))
      : []),
  ]

  const evidenceItems: Array<Omit<CloseEvidenceItemDto, "id" | "checklistItemId" | "findingId"> & { checklistKey?: string }> = [
    ...ledger.totalsByCurrency.map((total) => ({
      checklistKey: "ledger-reconciliation",
      evidenceType: CloseEvidenceType.REPORT_EXPORT,
      sourceTable: "journal_entry_lines",
      sourceType: "TrialBalanceCurrency",
      sourceId: total.currency,
      sourceLabel: `Trial balance ${total.currency}: debit ${total.debit} / credit ${total.credit}`,
      sourceDate: now.toISOString(),
      sourceHash: null,
      provenance: "POSTED",
      available: true,
      unavailableReason: null,
      correlationId: null,
    })),
    ...(!paymentUnavailable
      ? paymentDashboard.recentRuns.map((run) => ({
        checklistKey: "payment-reconciliation",
        evidenceType: CloseEvidenceType.RECONCILIATION_CERTIFICATE,
        sourceTable: "reconciliation_runs",
        sourceType: "ReconciliationRun",
        sourceId: run.id,
        sourceLabel: `Reconciliation run ${run.businessDate.slice(0, 10)} - ${run.status}`,
        sourceDate: run.businessDate,
        sourceHash: run.certificateHash,
        provenance: run.signedAt ? "POSTED" : "OPERATIONAL",
        available: true,
        unavailableReason: null,
        correlationId: null,
      }))
      : [{
        checklistKey: "payment-reconciliation",
        evidenceType: CloseEvidenceType.RECONCILIATION_CERTIFICATE,
        sourceTable: "reconciliation_runs",
        sourceType: "PaymentReconciliationDashboard",
        sourceId: null,
        sourceLabel: "Payment reconciliation evidence unavailable",
        sourceDate: now.toISOString(),
        sourceHash: null,
        provenance: "UNAVAILABLE",
        available: false,
        unavailableReason: "Payment reconciliation dashboard could not be loaded.",
        correlationId: null,
      }]),
    ...(!paymentUnavailable
      ? paymentDashboard.suspenseQueue.map((item) => ({
        checklistKey: "suspense-exceptions",
        evidenceType: CloseEvidenceType.SUSPENSE_ITEM,
        sourceTable: "suspense_items",
        sourceType: "SuspenseItem",
        sourceId: item.id,
        sourceLabel: `${item.type} ${item.amount} ${item.currencyCode} - ${item.status}`,
        sourceDate: item.slaDeadline ?? now.toISOString(),
        sourceHash: null,
        provenance: "OPERATIONAL",
        available: true,
        unavailableReason: null,
        correlationId: item.correlationId,
      }))
      : []),
    ...(!dataTrustUnavailable
      ? [
        {
          checklistKey: "data-trust-provenance",
          evidenceType: CloseEvidenceType.DATA_TRUST_CERTIFICATE,
          sourceTable: "ledger_audit_events",
          sourceType: "DataTrustCertificate",
          sourceId: dataTrust.certificate.surface,
          sourceLabel: `Data trust ${dataTrust.certificate.level} - ${dataTrust.certificate.verdict}`,
          sourceDate: dataTrust.certificate.generatedAt,
          sourceHash: dataTrust.source.scopeHash,
          provenance: dataTrust.certificate.level === "T0" ? "UNAVAILABLE" : "POSTED",
          available: dataTrust.certificate.level !== "T0",
          unavailableReason: dataTrust.certificate.level === "T0" ? "Critical data-trust blockers are open." : null,
          correlationId: null,
        },
        ...dataTrust.latestSourceLinks.map((link) => ({
          checklistKey: "data-trust-provenance",
          evidenceType: CloseEvidenceType.SOURCE_LINK,
          sourceTable: "accounting_source_links",
          sourceType: link.sourceType,
          sourceId: link.sourceId,
          sourceLabel: `${link.sourceType} ${link.sourceNumber ?? link.sourceId}`,
          sourceDate: link.createdAt,
          sourceHash: null,
          provenance: "POSTED",
          available: true,
          unavailableReason: null,
          correlationId: null,
        })),
        ...dataTrust.latestAuditEvents.map((event) => ({
          checklistKey: "data-trust-provenance",
          evidenceType: CloseEvidenceType.AUDIT_LOG,
          sourceTable: event.source === "ledger" ? "ledger_audit_events" : "audit_logs",
          sourceType: event.resourceType,
          sourceId: event.resourceId,
          sourceLabel: `${event.action} - ${event.status}`,
          sourceDate: event.createdAt,
          sourceHash: null,
          provenance: "POSTED",
          available: true,
          unavailableReason: null,
          correlationId: null,
        })),
      ]
      : []),
    {
      checklistKey: "inventory-valuation",
      evidenceType: CloseEvidenceType.REPORT_EXPORT,
      sourceTable: "inventory_transactions",
      sourceType: "InventoryValuationAnnex",
      sourceId: period.id,
      sourceLabel: inventoryUnavailable
        ? "Inventory valuation annex unavailable"
        : `Inventory valuation annex ${inventoryValuation.status}: inventory ${inventoryValuation.inventoryValue} / class 3 ${inventoryValuation.ledgerClass3Value} ${inventoryValuation.currency}`,
      sourceDate: now.toISOString(),
      sourceHash: inventoryAnnex.sourceHash,
      provenance: inventoryUnavailable ? "UNAVAILABLE" : "POSTED",
      available: !inventoryUnavailable,
      unavailableReason: inventoryUnavailableReason,
      correlationId: null,
      metadata: inventoryAnnex as unknown as Prisma.JsonValue,
    },
  ]

  const checklistWithEvidence = checklist.map((item) => ({
    ...item,
    evidenceCount: evidenceItems.filter((evidence) => evidence.checklistKey === item.key && evidence.available).length || item.evidenceCount,
  }))
  const criticalBlockerCount = findings.filter((finding) => finding.severity === CloseFindingSeverity.CRITICAL).length
  const highBlockerCount = findings.filter((finding) => finding.severity === CloseFindingSeverity.HIGH).length
  const status = closeRunStatusFromFindings(findings)
  const readinessScore = scoreFromChecklist(checklistWithEvidence)
  const evidenceCoveragePct = coverageFromChecklist(checklistWithEvidence)

  return {
    source: {
      mode: "CLOSE_ASSURANCE_CENTER",
      asOf: now.toISOString(),
      organizationScoped: true,
      persisted: false,
      trustLevel: dataTrustLevel,
      provenance: dataTrustUnavailable || paymentUnavailable ? "MIXED" : "POSTED",
      sourceTables: [...CLOSE_SOURCE_TABLES],
    },
    period: periodSummary(period),
    periods,
    run: {
      id: null,
      status,
      readinessScore,
      criticalBlockerCount,
      highBlockerCount,
      evidenceCoveragePct,
      correlationId: null,
      runById: null,
      startedAt: now.toISOString(),
      completedAt: now.toISOString(),
      createdAt: null,
    },
    summary: summaryFrom(checklistWithEvidence, findings, evidenceItems, 0),
    provenance: [
      {
        label: "Ledger and period close",
        provenance: "POSTED",
        asOf: now.toISOString(),
        periodStatus: period.status,
        sourceTables: ["accounting_periods", "journal_entries", "journal_entry_lines", "ledger_posting_batches"],
      },
      {
        label: "Payment reconciliation",
        provenance: paymentUnavailable ? "UNAVAILABLE" : "OPERATIONAL",
        asOf: now.toISOString(),
        periodStatus: period.status,
        sourceTables: ["reconciliation_runs", "suspense_items", "payment_exceptions"],
        reason: paymentUnavailable ? "Payment reconciliation dashboard failed to load." : undefined,
      },
      {
        label: "Data trust",
        provenance: dataTrustUnavailable ? "UNAVAILABLE" : "POSTED",
        asOf: now.toISOString(),
        periodStatus: period.status,
        sourceTables: dataTrustUnavailable ? ["ledger_audit_events", "audit_logs"] : dataTrust.source.sourceTables,
        reason: dataTrustUnavailable ? "Accountant data-trust service failed to load." : undefined,
      },
      {
        label: "Inventory valuation",
        provenance: inventoryUnavailable ? "UNAVAILABLE" : "POSTED",
        asOf: now.toISOString(),
        periodStatus: period.status,
        sourceTables: ["inventory_levels", "inventory_transactions", "stock_adjustments", "stock_count_sessions", "journal_entry_lines", "business_events"],
        reason: inventoryAnnex.blockerStatus === "PASSED" ? undefined : inventoryAnnex.failures[0]?.message,
      },
    ],
    checklist: checklistWithEvidence.map((item) => ({ id: null, ...item })),
    findings: findings.map((finding) => ({
      id: null,
      checklistItemId: null,
      assignedAt: null,
      waiverRequestedById: null,
      waiverApprovedById: null,
      ...finding,
    })),
    evidenceItems: evidenceItems.map((item) => ({
      id: null,
      checklistItemId: null,
      findingId: null,
      ...item,
    })),
    controls: closeControls(),
    raw: {
      period,
      checklist: checklistWithEvidence,
      findings,
      evidenceItems,
    },
  }
}

function summaryFrom(
  checklist: Array<{ status: CloseChecklistStatus }>,
  findings: Array<{ status: CloseFindingStatus }>,
  evidenceItems: Array<{ available: boolean }>,
  commentCount: number,
) {
  return {
    checklistCount: checklist.length,
    passedCount: checklist.filter((item) => item.status === CloseChecklistStatus.PASSED).length,
    failedCount: checklist.filter((item) => item.status === CloseChecklistStatus.FAILED).length,
    warningCount: checklist.filter((item) => item.status === CloseChecklistStatus.WARNING).length,
    unavailableCount: checklist.filter((item) => item.status === CloseChecklistStatus.UNAVAILABLE).length,
    findingCount: findings.length,
    openFindingCount: findings.filter((finding) => openFindingStatuses.includes(finding.status as (typeof openFindingStatuses)[number])).length,
    evidenceCount: evidenceItems.filter((item) => item.available).length,
    commentCount,
  }
}

function closeControls(params: {
  persisted?: boolean
  status?: CloseRunStatus
  criticalBlockerCount?: number
  highBlockerCount?: number
  checklist?: Array<{ status: CloseChecklistStatus; severity: CloseFindingSeverity }>
  findings?: Array<{ status: CloseFindingStatus; severity: CloseFindingSeverity }>
} = {}): CloseAssuranceDashboardData["controls"] {
  const persisted = params.persisted ?? false
  const criticalBlockers = params.criticalBlockerCount ?? 0
  const highBlockers = params.highBlockerCount ?? 0
  const openHighRiskFindings = (params.findings ?? []).filter(
    (finding) =>
      openFindingStatuses.includes(finding.status as (typeof openFindingStatuses)[number]) &&
      (finding.severity === CloseFindingSeverity.CRITICAL || finding.severity === CloseFindingSeverity.HIGH),
  ).length
  const unavailableHighRiskChecklist = (params.checklist ?? []).filter(
    (item) =>
      (item.status === CloseChecklistStatus.FAILED || item.status === CloseChecklistStatus.UNAVAILABLE) &&
      (item.severity === CloseFindingSeverity.CRITICAL || item.severity === CloseFindingSeverity.HIGH),
  ).length
  const certificationAvailable =
    persisted &&
    params.status === CloseRunStatus.READY &&
    criticalBlockers === 0 &&
    highBlockers === 0 &&
    openHighRiskFindings === 0 &&
    unavailableHighRiskChecklist === 0

  const certificationDisabledReason = certificationAvailable
    ? null
    : !persisted
      ? "Run and persist close readiness before certification."
      : params.status !== CloseRunStatus.READY
        ? "Close run is not READY."
        : criticalBlockers > 0 || highBlockers > 0 || openHighRiskFindings > 0
          ? "Open high or critical findings block certification."
          : unavailableHighRiskChecklist > 0
            ? "High-risk failed or unavailable checklist evidence blocks certification."
            : "Certification gates are not satisfied."

  return {
    assignmentRequiresPermission: "accounting.close.finding.assign",
    waiverApprovalRequiresFreshAuth: true,
    certificationAvailable,
    certificationDisabledReason,
    packExportAvailable: persisted,
    packExportDisabledReason: persisted
      ? "Draft close pack export is available; certified export still enforces readiness gates."
      : "Run and persist close readiness before exporting a close pack.",
  }
}

export async function runCloseAssurance(
  organizationId: string,
  input: CloseAssurancePeriodInput,
  control: CloseControlContext = {},
): Promise<CloseAssuranceDashboardData> {
  const now = control.now ? new Date(control.now) : new Date()
  const correlationId = input.correlationId ?? randomUUID()
  const draft = await buildAssessment(organizationId, input.periodId, now)

  if (!draft.raw.period) {
    throw new CloseAssuranceError("CloseBlocked", "An accounting period is required before close assurance can run.")
  }

  const persisted = await db.$transaction(async (tx) => {
    const closeRun = await tx.closeRun.create({
      data: {
        organizationId,
        periodId: draft.raw.period!.id,
        status: draft.run.status,
        readinessScore: draft.run.readinessScore,
        criticalBlockerCount: draft.run.criticalBlockerCount,
        highBlockerCount: draft.run.highBlockerCount,
        evidenceCoveragePct: draft.run.evidenceCoveragePct === null ? null : new Prisma.Decimal(draft.run.evidenceCoveragePct),
        asOf: now,
        startedAt: now,
        completedAt: now,
        runById: control.actorId ?? null,
        correlationId,
        summary: jsonObject(draft.summary),
        provenance: jsonObject({ items: draft.provenance }),
        metadata: jsonObject({
          sourceTables: draft.source.sourceTables,
          trustLevel: draft.source.trustLevel,
          controlPermissions: control.actorPermissions ?? [],
          inventoryValuationAnnex: draft.raw.evidenceItems.find((item) => item.sourceType === "InventoryValuationAnnex")?.metadata ?? null,
          statutoryCertification: statutoryCertificationBlockerMetadata(),
        }),
      },
    })

    const checklistByKey = new Map<string, CloseChecklistItem>()
    for (const item of draft.raw.checklist) {
      const created = await tx.closeChecklistItem.create({
        data: {
          organizationId,
          periodId: closeRun.periodId,
          closeRunId: closeRun.id,
          key: item.key,
          domain: item.domain,
          status: item.status,
          severity: item.severity,
          label: item.label,
          detail: item.detail,
          sourceService: item.sourceService,
          evidenceCount: item.evidenceCount,
          blockerReason: item.blockerReason,
          nextActionHref: item.nextActionHref,
          ownerId: item.ownerId,
          dueAt: item.dueAt ? new Date(item.dueAt) : null,
        },
      })
      checklistByKey.set(item.key, created)
    }

    const findings: CloseAssuranceFinding[] = []
    for (const finding of draft.raw.findings) {
      const checklistItem = checklistByKey.get(finding.checklistKey) ?? null
      findings.push(await tx.closeAssuranceFinding.create({
        data: {
          organizationId,
          periodId: closeRun.periodId,
          closeRunId: closeRun.id,
          checklistItemId: checklistItem?.id ?? null,
          domain: finding.domain,
          severity: finding.severity,
          status: finding.status,
          title: finding.title,
          detail: finding.detail,
          sourceService: finding.sourceService,
          sourceType: finding.sourceType,
          sourceId: finding.sourceId,
          ownerId: finding.ownerId,
          assignedById: finding.assignedById,
          dueAt: finding.dueAt ? new Date(finding.dueAt) : null,
          correlationId: finding.correlationId ?? correlationId,
        },
      }))
    }

    const findingsByChecklist = new Map<string, CloseAssuranceFinding>()
    for (const finding of findings) {
      const checklist = draft.raw.findings.find((item) => item.sourceType === finding.sourceType && item.title === finding.title)
      if (checklist) findingsByChecklist.set(checklist.checklistKey, finding)
    }

    for (const evidence of draft.raw.evidenceItems) {
      const checklistItem = evidence.checklistKey ? checklistByKey.get(evidence.checklistKey) : null
      const linkedFinding = evidence.checklistKey ? findingsByChecklist.get(evidence.checklistKey) : null
      await tx.closeEvidenceItem.create({
        data: {
          organizationId,
          periodId: closeRun.periodId,
          closeRunId: closeRun.id,
          checklistItemId: checklistItem?.id ?? null,
          findingId: linkedFinding?.id ?? null,
          evidenceType: evidence.evidenceType,
          sourceTable: evidence.sourceTable,
          sourceType: evidence.sourceType,
          sourceId: evidence.sourceId,
          sourceLabel: evidence.sourceLabel,
          sourceDate: evidence.sourceDate ? new Date(evidence.sourceDate) : null,
          sourceHash: evidence.sourceHash,
          provenance: evidence.provenance,
          available: evidence.available,
          unavailableReason: evidence.unavailableReason,
          correlationId: evidence.correlationId ?? correlationId,
          metadata: evidence.metadata === undefined || evidence.metadata === null
            ? undefined
            : (evidence.metadata as Prisma.InputJsonValue),
        },
      })
    }

    await tx.ledgerAuditEvent.create({
      data: {
        organizationId,
        actorId: control.actorId ?? null,
        action: "CLOSE_ASSURANCE_RUN_COMPLETED",
        resourceType: "CloseRun",
        resourceId: closeRun.id,
        message: `Close assurance run completed with ${closeRun.status}`,
        metadata: jsonObject({
          periodId: closeRun.periodId,
          readinessScore: closeRun.readinessScore,
          criticalBlockerCount: closeRun.criticalBlockerCount,
          highBlockerCount: closeRun.highBlockerCount,
          correlationId,
        }),
      },
    })

    return closeRun
  })

  return getCloseAssuranceDashboard(organizationId, persisted.periodId, persisted.id)
}

async function latestCloseRun(organizationId: string, periodId: string, closeRunId?: string | null) {
  return db.closeRun.findFirst({
    where: {
      organizationId,
      periodId,
      ...(closeRunId ? { id: closeRunId } : {}),
    },
    include: {
      checklistItems: { orderBy: [{ domain: "asc" }, { key: "asc" }] },
      findings: { orderBy: [{ severity: "desc" }, { createdAt: "asc" }] },
      evidenceItems: { orderBy: [{ evidenceType: "asc" }, { createdAt: "desc" }] },
      comments: { orderBy: { createdAt: "desc" }, take: 50 },
      reviews: { orderBy: { createdAt: "desc" }, take: 10 },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCloseAssuranceDashboard(
  organizationId: string,
  periodId?: string | null,
  closeRunId?: string | null,
): Promise<CloseAssuranceDashboardData> {
  const now = new Date()
  const period = await resolveTargetPeriod(organizationId, periodId, db, now)

  if (!period) {
    const draft = await buildAssessment(organizationId, null, now)
    return { ...draft, comments: [], reviews: [] }
  }

  const run = await latestCloseRun(organizationId, period.id, closeRunId)
  if (!run) {
    const draft = await buildAssessment(organizationId, period.id, now)
    return { ...draft, comments: [], reviews: [] }
  }

  const periods = await listRecentPeriods(organizationId, db, now)
  const checklist = run.checklistItems.map(mapChecklistItem)
  const findings = run.findings.map(mapFinding)
  const evidenceItems = run.evidenceItems.map(mapEvidenceItem)

  return {
    source: {
      mode: "CLOSE_ASSURANCE_CENTER",
      asOf: run.asOf.toISOString(),
      organizationScoped: true,
      persisted: true,
      trustLevel: metadataString(run.metadata, "trustLevel") ?? "T0",
      provenance: run.provenance ? "MIXED" : "UNAVAILABLE",
      sourceTables: [...CLOSE_SOURCE_TABLES],
    },
    period: periodSummary(period),
    periods,
    run: {
      id: run.id,
      status: run.status,
      readinessScore: run.readinessScore,
      criticalBlockerCount: run.criticalBlockerCount,
      highBlockerCount: run.highBlockerCount,
      evidenceCoveragePct: decimalNumber(run.evidenceCoveragePct),
      correlationId: run.correlationId,
      runById: run.runById,
      startedAt: iso(run.startedAt),
      completedAt: iso(run.completedAt),
      createdAt: run.createdAt.toISOString(),
    },
    summary: summaryFrom(checklist, findings, evidenceItems, run.comments.length),
    provenance: provenanceFromRun(run, period),
    checklist,
    findings,
    evidenceItems,
    comments: run.comments.map((comment) => ({
      id: comment.id,
      findingId: comment.findingId,
      evidenceItemId: comment.evidenceItemId,
      reviewId: comment.reviewId,
      authorId: comment.authorId,
      body: comment.body,
      visibility: comment.visibility,
      createdAt: comment.createdAt.toISOString(),
    })),
    reviews: run.reviews.map((review) => ({
      id: review.id,
      status: review.status,
      reviewerId: review.reviewerId,
      openedById: review.openedById,
      reviewedAt: iso(review.reviewedAt),
      decisionNotes: review.decisionNotes,
      createdAt: review.createdAt.toISOString(),
    })),
    controls: closeControls({
      persisted: true,
      status: run.status,
      criticalBlockerCount: run.criticalBlockerCount,
      highBlockerCount: run.highBlockerCount,
      checklist,
      findings,
    }),
  }
}

function metadataString(value: Prisma.JsonValue | null, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const raw = (value as Record<string, unknown>)[key]
  return typeof raw === "string" ? raw : null
}

function provenanceFromRun(run: CloseRun, period: NonNullable<Awaited<ReturnType<typeof resolveTargetPeriod>>>) {
  const raw = run.provenance
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const items = (raw as Record<string, unknown>).items
    if (Array.isArray(items)) {
      return items.filter((item): item is CloseAssuranceDashboardData["provenance"][number] => {
        return Boolean(item && typeof item === "object" && "label" in item)
      })
    }
  }

  return [{
    label: "Close run snapshot",
    provenance: "POSTED" as const,
    asOf: run.asOf.toISOString(),
    periodStatus: period.status,
    sourceTables: [...CLOSE_SOURCE_TABLES],
  }]
}

function mapChecklistItem(item: CloseChecklistItem): CloseAssuranceChecklistDto {
  return {
    id: item.id,
    key: item.key,
    domain: item.domain,
    status: item.status,
    severity: item.severity,
    label: item.label,
    detail: item.detail,
    sourceService: item.sourceService,
    evidenceCount: item.evidenceCount,
    blockerReason: item.blockerReason,
    nextActionHref: item.nextActionHref,
    ownerId: item.ownerId,
    dueAt: iso(item.dueAt),
  }
}

function mapFinding(item: CloseAssuranceFinding): CloseAssuranceFindingDto {
  return {
    id: item.id,
    checklistItemId: item.checklistItemId,
    domain: item.domain,
    severity: item.severity,
    status: item.status,
    title: item.title,
    detail: item.detail,
    sourceService: item.sourceService,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    ownerId: item.ownerId,
    assignedById: item.assignedById,
    assignedAt: iso(item.assignedAt),
    dueAt: iso(item.dueAt),
    waiverRequestedById: item.waiverRequestedById,
    waiverApprovedById: item.waiverApprovedById,
    correlationId: item.correlationId,
  }
}

function mapEvidenceItem(item: CloseEvidenceItem): CloseEvidenceItemDto {
  return {
    id: item.id,
    checklistItemId: item.checklistItemId,
    findingId: item.findingId,
    evidenceType: item.evidenceType,
    sourceTable: item.sourceTable,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    sourceDate: iso(item.sourceDate),
    sourceHash: item.sourceHash,
    provenance: item.provenance,
    available: item.available,
    unavailableReason: item.unavailableReason,
    correlationId: item.correlationId,
    metadata: item.metadata,
  }
}

export async function getCloseEvidenceGraph(
  organizationId: string,
  input: CloseEvidenceGraphInput,
): Promise<CloseEvidenceGraphDto> {
  const dashboard = await getCloseAssuranceDashboard(organizationId, input.periodId, input.closeRunId)
  const evidence = input.findingId
    ? dashboard.evidenceItems.filter((item) => item.findingId === input.findingId)
    : dashboard.evidenceItems
  const rootId = dashboard.run.id ?? `period:${dashboard.period?.id ?? "none"}`

  const nodes: CloseEvidenceGraphDto["nodes"] = [
    {
      id: rootId,
      type: "close-run",
      label: dashboard.run.id ? `Close run ${dashboard.run.id}` : "Live close readiness preview",
      status: dashboard.run.status,
      provenance: dashboard.source.provenance,
      available: Boolean(dashboard.period),
    },
    ...dashboard.checklist.map((item) => ({
      id: `checklist:${item.key}`,
      type: "checklist",
      label: item.label,
      status: item.status,
      provenance: item.status === CloseChecklistStatus.UNAVAILABLE ? "UNAVAILABLE" : "POSTED",
      available: item.status !== CloseChecklistStatus.UNAVAILABLE,
    })),
    ...evidence.map((item, index) => ({
      id: item.id ?? `evidence:${index}:${item.evidenceType}`,
      type: item.evidenceType,
      label: item.sourceLabel,
      status: item.available ? "available" : "unavailable",
      provenance: item.provenance,
      available: item.available,
    })),
  ]

  const edges: CloseEvidenceGraphDto["edges"] = [
    ...dashboard.checklist.map((item) => ({
      from: rootId,
      to: `checklist:${item.key}`,
      label: "assesses",
    })),
    ...evidence.flatMap((item, index) => {
      const checklist = dashboard.checklist.find((entry) => entry.id && entry.id === item.checklistItemId)
      return [{
        from: checklist ? `checklist:${checklist.key}` : rootId,
        to: item.id ?? `evidence:${index}:${item.evidenceType}`,
        label: item.available ? "supported by" : "missing evidence",
      }]
    }),
  ]

  return {
    source: {
      mode: "CLOSE_ASSURANCE_EVIDENCE_GRAPH",
      asOf: new Date().toISOString(),
      organizationScoped: true,
      closeRunId: dashboard.run.id,
      periodId: dashboard.period?.id ?? null,
    },
    nodes,
    edges,
  }
}

async function loadFindingForMutation(organizationId: string, findingId: string, tx: Prisma.TransactionClient | typeof db = db) {
  const finding = await tx.closeAssuranceFinding.findFirst({
    where: { id: findingId, organizationId },
    include: { closeRun: true },
  })
  if (!finding) throw new NotFoundError("Close finding not found")
  return finding
}

async function auditCloseWorkflow(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string
    actorId?: string | null
    action: string
    resourceType: string
    resourceId: string
    message: string
    metadata?: Prisma.InputJsonValue
  },
) {
  await tx.ledgerAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      message: params.message,
      metadata: params.metadata,
    },
  })
}

export async function assignCloseFinding(
  organizationId: string,
  input: AssignCloseFindingInput,
  control: CloseControlContext = {},
) {
  const assignedToId = input.assignedToId ?? control.actorId
  if (!assignedToId) throw new BusinessRuleError("A finding assignee is required.")
  const correlationId = input.correlationId ?? randomUUID()

  return db.$transaction(async (tx) => {
    const finding = await loadFindingForMutation(organizationId, input.findingId, tx)
    if (finding.status === CloseFindingStatus.RESOLVED || finding.status === CloseFindingStatus.WAIVED_WITH_APPROVAL) {
      throw new BusinessRuleError("Resolved or waived findings cannot be reassigned.")
    }

    const updated = await tx.closeAssuranceFinding.update({
      where: { id: finding.id },
      data: {
        ownerId: assignedToId,
        assignedById: control.actorId ?? null,
        assignedAt: new Date(),
        status: CloseFindingStatus.ASSIGNED,
        correlationId,
      },
    })

    await auditCloseWorkflow(tx, {
      organizationId,
      actorId: control.actorId,
      action: "CLOSE_FINDING_ASSIGNED",
      resourceType: "CloseAssuranceFinding",
      resourceId: finding.id,
      message: `Close finding ${finding.id} assigned`,
      metadata: jsonObject({ assignedToId, correlationId }),
    })

    return mapFinding(updated)
  })
}

export async function commentOnCloseFinding(
  organizationId: string,
  input: CommentOnCloseFindingInput,
  control: CloseControlContext = {},
): Promise<CloseAssuranceCommentDto> {
  const correlationId = input.correlationId ?? randomUUID()

  return db.$transaction(async (tx) => {
    let closeRunId = input.closeRunId ?? null
    let periodId: string | null = null
    let findingId = input.findingId ?? null
    let evidenceItemId = input.evidenceItemId ?? null
    let reviewId = input.reviewId ?? null

    if (findingId) {
      const finding = await loadFindingForMutation(organizationId, findingId, tx)
      assertFindingCanReceiveComment(finding.status)
      closeRunId = finding.closeRunId
      periodId = finding.periodId
    } else if (evidenceItemId) {
      const evidence = await tx.closeEvidenceItem.findFirst({ where: { id: evidenceItemId, organizationId } })
      if (!evidence) throw new NotFoundError("Close evidence item not found")
      closeRunId = evidence.closeRunId
      periodId = evidence.periodId
    } else if (reviewId) {
      const review = await tx.accountantReview.findFirst({ where: { id: reviewId, organizationId } })
      if (!review) throw new NotFoundError("Accountant review not found")
      closeRunId = review.closeRunId
      periodId = review.periodId
    } else if (closeRunId) {
      const run = await tx.closeRun.findFirst({ where: { id: closeRunId, organizationId } })
      if (!run) throw new NotFoundError("Close run not found")
      periodId = run.periodId
    }

    if (!closeRunId || !periodId) {
      throw new BusinessRuleError("A close run, finding, evidence item, or review is required for comments.")
    }

    const comment = await tx.accountantComment.create({
      data: {
        organizationId,
        periodId,
        closeRunId,
        findingId,
        evidenceItemId,
        reviewId,
        authorId: control.actorId ?? null,
        body: input.body,
        correlationId,
      },
    })

    await auditCloseWorkflow(tx, {
      organizationId,
      actorId: control.actorId,
      action: "CLOSE_ACCOUNTANT_COMMENT_ADDED",
      resourceType: findingId ? "CloseAssuranceFinding" : "CloseRun",
      resourceId: findingId ?? closeRunId,
      message: "Close assurance comment added",
      metadata: jsonObject({ commentId: comment.id, correlationId }),
    })

    return {
      id: comment.id,
      findingId: comment.findingId,
      evidenceItemId: comment.evidenceItemId,
      reviewId: comment.reviewId,
      authorId: comment.authorId,
      body: comment.body,
      visibility: comment.visibility,
      createdAt: comment.createdAt.toISOString(),
    }
  })
}

export async function requestCloseWaiver(
  organizationId: string,
  input: RequestCloseWaiverInput,
  control: CloseControlContext = {},
) {
  const correlationId = input.correlationId ?? randomUUID()

  return db.$transaction(async (tx) => {
    const finding = await loadFindingForMutation(organizationId, input.findingId, tx)
    if (finding.status === CloseFindingStatus.RESOLVED || finding.status === CloseFindingStatus.WAIVED_WITH_APPROVAL) {
      throw new BusinessRuleError("Resolved or waived findings cannot receive a new waiver request.")
    }

    const updated = await tx.closeAssuranceFinding.update({
      where: { id: finding.id },
      data: {
        status: CloseFindingStatus.IN_REVIEW,
        waiverRequestedById: control.actorId ?? null,
        waiverRequestedAt: new Date(),
        waiverReason: input.reason,
        correlationId,
      },
    })

    await auditCloseWorkflow(tx, {
      organizationId,
      actorId: control.actorId,
      action: "CLOSE_WAIVER_REQUESTED",
      resourceType: "CloseAssuranceFinding",
      resourceId: finding.id,
      message: "Close finding waiver requested",
      metadata: jsonObject({ reason: input.reason, correlationId }),
    })

    return mapFinding(updated)
  })
}

export async function approveCloseWaiver(
  organizationId: string,
  input: ApproveCloseWaiverInput,
  control: CloseControlContext = {},
) {
  const correlationId = input.correlationId ?? randomUUID()

  return db.$transaction(async (tx) => {
    const finding = await loadFindingForMutation(organizationId, input.findingId, tx)
    if (!finding.waiverRequestedById || !finding.waiverRequestedAt) {
      throw new BusinessRuleError("A waiver request is required before approval.")
    }
    if (control.actorId && finding.waiverRequestedById === control.actorId) {
      throw new CloseAssuranceError("SoDViolation", "The waiver requester cannot approve the same close waiver.")
    }

    const updated = await tx.closeAssuranceFinding.update({
      where: { id: finding.id },
      data: {
        status: CloseFindingStatus.WAIVED_WITH_APPROVAL,
        waiverApprovedById: control.actorId ?? null,
        waiverApprovedAt: new Date(),
        correlationId,
      },
    })

    await auditCloseWorkflow(tx, {
      organizationId,
      actorId: control.actorId,
      action: "CLOSE_WAIVER_APPROVED",
      resourceType: "CloseAssuranceFinding",
      resourceId: finding.id,
      message: "Close finding waiver approved",
      metadata: jsonObject({ requestedById: finding.waiverRequestedById, correlationId }),
    })

    return mapFinding(updated)
  })
}

export async function updateAccountantReview(
  organizationId: string,
  input: UpdateAccountantReviewInput,
  control: CloseControlContext = {},
): Promise<AccountantReviewDto> {
  const correlationId = input.correlationId ?? randomUUID()

  return db.$transaction(async (tx) => {
    const run = await tx.closeRun.findFirst({ where: { id: input.closeRunId, organizationId } })
    if (!run) throw new NotFoundError("Close run not found")

    const review = await tx.accountantReview.create({
      data: {
        organizationId,
        periodId: run.periodId,
        closeRunId: run.id,
        status: input.status,
        reviewerId: control.actorId ?? null,
        openedById: run.runById,
        reviewedAt: input.status === AccountantReviewStatus.OPEN ? null : new Date(),
        decisionNotes: input.decisionNotes,
        correlationId,
      },
    })

    await auditCloseWorkflow(tx, {
      organizationId,
      actorId: control.actorId,
      action: "CLOSE_ACCOUNTANT_REVIEW_UPDATED",
      resourceType: "AccountantReview",
      resourceId: review.id,
      message: `Accountant review marked ${review.status}`,
      metadata: jsonObject({ closeRunId: run.id, correlationId }),
    })

    return {
      id: review.id,
      status: review.status,
      reviewerId: review.reviewerId,
      openedById: review.openedById,
      reviewedAt: iso(review.reviewedAt),
      decisionNotes: review.decisionNotes,
      createdAt: review.createdAt.toISOString(),
    }
  })
}
