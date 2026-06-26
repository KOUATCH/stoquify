import type { ReactNode, SVGProps } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return new Proxy(
    { __esModule: true },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        return createIcon(prop)
      },
    },
  )
})

jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({})),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn() } },
}))

jest.mock("@/prisma/db", () => ({
  db: {
    user: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

jest.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

jest.mock("@/i18n/routing", () => ({
  localizePath: (href: string, locale: string) => `/${locale}${href}`,
  pickLocale: (locale: string) => (locale === "fr" ? "fr" : "en"),
}))

jest.mock("@/actions/evidence/proof-trail.actions", () => ({
  getProofTrailAction: jest.fn(),
}))

jest.mock("@/components/evidence/ProofTrailDrawer", () => ({
  ProofTrailDrawer: ({ open }: { open: boolean }) => (open ? <div>Proof drawer</div> : null),
}))

jest.mock("@/services/owner-war-room/owner-war-room.service", () => ({
  getOwnerWarRoomData: jest.fn(),
}))

jest.mock("@/services/manager-action-center/manager-action-center.service", () => ({
  getManagerActionCenterData: jest.fn(),
}))

jest.mock("@/services/cash-command/cash-command.service", () => ({
  getCashCommandData: jest.fn(),
}))

jest.mock("@/services/stock-to-cash/stock-to-cash-flow.service", () => ({
  getStockToCashFlowData: jest.fn(),
}))

jest.mock("@/services/accounting/close-assurance.service", () => ({
  approveCloseWaiver: jest.fn(),
  assignCloseFinding: jest.fn(),
  commentOnCloseFinding: jest.fn(),
  getCloseAssuranceDashboard: jest.fn(),
  getCloseEvidenceGraph: jest.fn(),
  requestCloseWaiver: jest.fn(),
  runCloseAssurance: jest.fn(),
  updateAccountantReview: jest.fn(),
}))

jest.mock("@/services/accounting/close-assurance-pack.service", () => ({
  exportClosePack: jest.fn(),
}))

jest.mock("@/hooks/accounting/useCloseAssurance", () => ({
  useAssignCloseFinding: jest.fn(),
  useCloseAssurance: jest.fn(),
  useCloseEvidenceGraph: jest.fn(),
  useCloseWaiver: jest.fn(),
  useCommentOnCloseFinding: jest.fn(),
  useExportClosePack: jest.fn(),
  useRunCloseAssurance: jest.fn(),
}))

import { auth } from "@/lib/auth"
import { db } from "@/prisma/db"
import { getCloseAssuranceDashboard } from "@/services/accounting/close-assurance.service"
import { getCashCommandData } from "@/services/cash-command/cash-command.service"
import { getManagerActionCenterData } from "@/services/manager-action-center/manager-action-center.service"
import { getOwnerWarRoomData } from "@/services/owner-war-room/owner-war-room.service"
import { getStockToCashFlowData } from "@/services/stock-to-cash/stock-to-cash-flow.service"
import {
  useAssignCloseFinding,
  useCloseAssurance,
  useCloseEvidenceGraph,
  useCloseWaiver,
  useCommentOnCloseFinding,
  useExportClosePack,
  useRunCloseAssurance,
} from "@/hooks/accounting/useCloseAssurance"
import type { CashCommandData } from "@/services/cash-command/cash-command-contracts"
import type { CloseAssuranceDashboardData } from "@/actions/accounting/close-assurance.actions"
import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts"
import type { OwnerWarRoomData } from "@/services/owner-war-room/owner-war-room-contracts"
import type { StockToCashFlowData } from "@/services/stock-to-cash/stock-to-cash-contracts"

import CloseAssurancePage from "@/app/[locale]/(dashboard)/dashboard/accounting/close/page"
import { CloseAssuranceCenter } from "@/components/accounting/CloseAssuranceCenter"
import CashCommandPage from "@/app/[locale]/(dashboard)/dashboard/finance/cash-command/page"
import FinanceError from "@/app/[locale]/(dashboard)/dashboard/finance/error"
import FinanceLoading from "@/app/[locale]/(dashboard)/dashboard/finance/loading"
import StockToCashFlowPage from "@/app/[locale]/(dashboard)/dashboard/finance/stock-to-cash/page"
import ManagerActionCenterError from "@/app/[locale]/(dashboard)/dashboard/manager-action-center/error"
import ManagerActionCenterLoading from "@/app/[locale]/(dashboard)/dashboard/manager-action-center/loading"
import ManagerActionCenterPage from "@/app/[locale]/(dashboard)/dashboard/manager-action-center/page"
import OwnerWarRoomError from "@/app/[locale]/(dashboard)/dashboard/owner-war-room/error"
import OwnerWarRoomLoading from "@/app/[locale]/(dashboard)/dashboard/owner-war-room/loading"
import OwnerWarRoomPage from "@/app/[locale]/(dashboard)/dashboard/owner-war-room/page"

const generatedAt = "2026-06-25T08:00:00.000Z"
const tenantPermissions = [
  "dashboard.read",
  "finance.read",
  "accounting.close.read",
  "payments.reconciliation.read",
  "inventory.read",
  "purchases.orders.read",
]

const freshness = {
  state: "fresh" as const,
  generatedAt,
  sourceMaxUpdatedAt: generatedAt,
  maxAgeMinutes: 1440,
  stale: false,
  staleReason: null,
}

const provenance = {
  organizationId: "org-session",
  locationId: null,
  sourceKind: "tenant.operating",
  sourceId: null,
  sourceHash: "tenant-hash",
  sourceModules: ["dashboard", "payments"],
  generatedAt,
  periodStart: "2026-06-25T00:00:00.000Z",
  periodEnd: "2026-06-25T23:59:59.999Z",
}

const actionLink = {
  id: "action-link-1",
  label: "Open",
  href: "/dashboard/finance/payments/reconciliation",
  requiredPermission: "payments.reconciliation.read",
  moduleSlug: "payment_reconciliation" as const,
  disabled: false,
  disabledReason: null,
}

const emptyActionQueue = {
  organizationId: "org-session",
  generatedAt,
  signals: [],
  actionItems: [],
  filteredOutCount: 0,
  summary: {
    total: 0,
    open: 0,
    assigned: 0,
    stale: 0,
    expired: 0,
    redacted: 0,
    bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
    byRole: {},
  },
}

function commandBrief(title: string) {
  return {
    id: `${title.toLowerCase().replaceAll(" ", "-")}:org-session`,
    organizationId: "org-session",
    title,
    summary: "1 visible action requires attention before the daily command review closes.",
    conclusion: "Start with payment suspense because it blocks cash trust.",
    mode: "brief" as const,
    generatedAt,
    periodStart: "2026-06-25T00:00:00.000Z",
    periodEnd: "2026-06-25T23:59:59.999Z",
    state: "blocked" as const,
    evidenceGrade: "blocked" as const,
    trustState: "blocked" as const,
    freshness,
    provenance,
    sourceModules: ["dashboard", "payments"],
    blockers: [],
    redactions: [],
    primaryAction: actionLink,
    drillThrough: null,
    reviewState: {
      organizationId: "org-session",
      reviewerId: null,
      reviewerRole: "manager",
      state: "blocked" as const,
      reviewedAt: null,
      previousReviewedAt: null,
      nextReviewDueAt: null,
      freshness,
      blockers: [],
    },
  }
}

function kpiCard(id: string, title: string, value: number, sourceModules = ["payments", "finance"]) {
  return {
    id,
    organizationId: "org-session",
    moduleSlug: "payment_reconciliation",
    requiredPermission: "payments.reconciliation.read",
    title,
    detail: `${title} detail.`,
    value,
    unit: "XAF",
    format: "currency",
    state: "blocked",
    evidenceGrade: "blocked",
    trustState: "blocked",
    freshness,
    provenance: { ...provenance, sourceModules },
    blockers: [],
    redactions: [],
    drillThrough: {
      available: true,
      type: "route",
      label: "Open",
      href: "/dashboard/finance/reconciliation",
      requiredPermission: "payments.reconciliation.read",
    },
    actionLink,
  }
}

function buildCashCommandData(): CashCommandData {
  const cashCard = kpiCard("cash_collected", "Cash collected", 180000)
  const suspenseCard = kpiCard("unreconciled_cash", "Unreconciled cash", 125000)

  return {
    organizationId: "org-session",
    organizationName: "Kontava Demo",
    generatedAt,
    periodStart: "2026-06-25T00:00:00.000Z",
    periodEnd: "2026-06-25T23:59:59.999Z",
    currency: "XAF",
    commandBrief: commandBrief("Cash command brief"),
    cards: [cashCard, suspenseCard],
    trustSignals: [
      {
        id: "provider_evidence",
        label: "Provider evidence",
        value: "1/1",
        detail: null,
        tone: "success",
        requiredPermission: "payments.reconciliation.read",
        evidenceGrade: "blocked",
        trustState: "blocked",
        freshness,
        blockers: [],
        redactions: [],
      },
    ],
    changes: [
      {
        id: "change-1",
        organizationId: "org-session",
        moduleSlug: "payment_reconciliation",
        requiredPermission: "payments.reconciliation.read",
        title: "Unreconciled cash remains open",
        detail: "Suspense remains open.",
        businessImpact: "Cash cannot be treated as fully trusted.",
        direction: "worsened",
        severity: "high",
        state: "blocked",
        evidenceGrade: "blocked",
        trustState: "blocked",
        freshness,
        sourceModules: ["payments"],
        changedAt: generatedAt,
        previousValue: null,
        currentValue: 125000,
        unit: "XAF",
        format: "currency",
        provenance,
        blockers: [],
        redactions: [],
        drillThrough: suspenseCard.drillThrough,
        actionLink,
      },
    ],
    actionsToday: [
      {
        id: "act-1",
        title: "Resolve payment suspense",
        nextStep: "Classify or match suspense items.",
        severity: "critical",
        state: "ready",
        actionLink,
        evidenceGrade: "blocked",
        trustState: "blocked",
        freshness,
        dueLabel: "Due today",
        ownerLabel: "finance",
        blockers: [],
        redactions: [],
      },
    ],
    risks: [
      {
        id: "risk-1",
        organizationId: "org-session",
        moduleSlug: "payment_reconciliation",
        rank: 1,
        title: "Unreconciled cash",
        detail: "Suspense value is open.",
        businessImpact: "Unresolved suspense weakens cash truth.",
        severity: "high",
        severityScore: 86,
        moneyImpact: 125000,
        urgency: "today",
        state: "blocked",
        evidenceGrade: "blocked",
        trustState: "blocked",
        freshness,
        sourceModules: ["payments"],
        blockers: [],
        redactions: [],
        drillThrough: suspenseCard.drillThrough,
        actionLink,
      },
    ],
    proofSubjects: [
      {
        available: true,
        organizationId: "org-session",
        moduleSlug: "payment_reconciliation",
        subjectType: "payment.transaction",
        subjectId: "pt-1",
        label: "Payment transaction proof",
        requiredPermission: "payments.reconciliation.read",
        sourceModules: ["payments"],
      },
    ],
    drawerState: {
      drawerCount: 2,
      openDrawerCount: 1,
      confidenceScore: 71,
      liveVariance: 30000,
      sessionVariance: 7000,
      alertCount: 2,
      highRiskAlertCount: 1,
    },
    actionQueue: {
      summary: {
        total: 1,
        open: 1,
        assigned: 0,
        stale: 0,
        expired: 0,
        redacted: 0,
        bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 1 },
        byRole: { finance: 1 },
      },
      filteredOutCount: 0,
    },
    moduleControl: {
      mode: "observe",
      hardEnforcementEnabled: false,
      generatedAt,
      unknownRequestedModules: [],
      summary: {
        catalogCount: 20,
        entitledCount: 8,
        trialCount: 0,
        readOnlyCount: 0,
        suspendedCount: 0,
        wouldBlockCount: 0,
        dependencyGapCount: 0,
      },
    },
    summary: {
      cashCollected: 180000,
      unreconciledCash: 125000,
      openSuspenseCount: 2,
      drawerVariance: 37000,
      drawerAlertCount: 2,
      providerRiskCount: 1,
      actionCountToday: 1,
      staleCount: 0,
      blockedCount: 1,
      redactedCount: 0,
    },
  } as unknown as CashCommandData
}

function flowStep(id: string, order: number, label: string, value: number, format = "currency") {
  return {
    id,
    order,
    organizationId: "org-session",
    moduleSlug: "finance",
    requiredPermission: "finance.read",
    label,
    detail: `${label} evidence is connected to the stock-to-cash command path.`,
    value,
    unit: format === "currency" ? "XAF" : null,
    format,
    state: order === 2 ? "blocked" : "ready",
    evidenceGrade: order === 2 ? "blocked" : "posted",
    trustState: order === 2 ? "blocked" : "trusted",
    freshness,
    sourceModules: ["inventory", "finance"],
    blockers: [],
    redactions: [],
    drillThrough: {
      available: true,
      type: "route",
      label: "Open",
      href: "/dashboard/finance/cash-command",
      requiredPermission: "finance.read",
    },
    actionLink: null,
  }
}

function buildStockToCashFlowData(): StockToCashFlowData {
  const blockedStep = flowStep("inventory-value", 2, "Inventory value", 620000)

  return {
    organizationId: "org-session",
    organizationName: "Kontava Demo",
    generatedAt,
    periodStart: "2026-06-25T00:00:00.000Z",
    periodEnd: "2026-06-25T23:59:59.999Z",
    currency: "XAF",
    commandBrief: {
      ...commandBrief("Stock-to-Cash Flow"),
      summary: "Read-only flow from purchasing commitments through inventory, POS, payments, ledger, and close readiness.",
      conclusion: "Resolve the blocked inventory valuation step before cash truth is trusted.",
      sourceModules: ["inventory", "finance", "accounting"],
    },
    cards: [
      kpiCard("stock-cash-exposure", "Stock cash exposure", 620000, ["inventory", "finance"]),
      kpiCard("unresolved-suspense", "Unresolved suspense", 125000),
    ],
    flowSteps: [
      flowStep("purchase-commitments", 1, "Purchase commitments", 340000),
      blockedStep,
      flowStep("cash-collection", 3, "Cash collection", 180000),
    ],
    risks: [
      {
        id: "stock-to-cash-risk-inventory-value",
        organizationId: "org-session",
        moduleSlug: "finance",
        rank: 1,
        title: "Inventory valuation gap",
        detail: "Inventory value needs source evidence.",
        businessImpact: "Stock exposure can distort stock-to-cash reporting.",
        severity: "high",
        severityScore: 82,
        moneyImpact: 620000,
        urgency: "today",
        state: "blocked",
        evidenceGrade: "blocked",
        trustState: "blocked",
        freshness,
        sourceModules: ["inventory", "finance"],
        blockers: [],
        redactions: [],
        drillThrough: blockedStep.drillThrough,
        actionLink: null,
      },
    ],
    proofSubjects: [
      {
        available: true,
        organizationId: "org-session",
        moduleSlug: "finance",
        subjectType: "inventory.stock-event",
        subjectId: "stock-event-1",
        label: "Inventory stock proof",
        requiredPermission: "finance.read",
        sourceModules: ["inventory"],
      },
    ],
    summary: {
      stockCashExposure: 620000,
      pendingPurchaseOrderCount: 1,
      quantityOnOrder: 12,
      completedSalesRevenue: 240000,
      cashCollected: 180000,
      unresolvedSuspenseAmount: 125000,
      sourceLinkCount: 2,
      blockedStepCount: 1,
      unavailableProofCount: 0,
    },
  } as unknown as StockToCashFlowData
}

function buildOwnerWarRoomData(): OwnerWarRoomData {
  return {
    organizationId: "org-session",
    organizationName: "Kontava Demo",
    generatedAt,
    periodStart: "2026-06-25T00:00:00.000Z",
    periodEnd: "2026-06-25T23:59:59.999Z",
    cards: [],
    strips: [],
    proofSubjects: [],
    actionQueue: emptyActionQueue,
    moduleControl: {
      mode: "observe",
      hardEnforcementEnabled: false,
      generatedAt,
      unknownRequestedModules: [],
      summary: {
        catalogCount: 20,
        entitledCount: 8,
        trialCount: 0,
        readOnlyCount: 0,
        suspendedCount: 0,
        wouldBlockCount: 0,
        dependencyGapCount: 0,
      },
    },
    summary: {
      criticalCount: 1,
      highCount: 0,
      redactedCount: 0,
      staleCount: 0,
      blockedCount: 1,
      upgradePromptCount: 0,
    },
    morningBrief: {
      id: "owner-morning-brief:org-session",
      organizationId: "org-session",
      audienceRole: "owner",
      generatedAt,
      periodStart: "2026-06-25T00:00:00.000Z",
      periodEnd: "2026-06-25T23:59:59.999Z",
      freshness,
      commandBrief: commandBrief("Owner morning brief"),
      changes: [],
      risks: [],
      actions: [actionLink],
      zones: [],
      blockers: [],
      redactions: [],
      priorityActions: [
        {
          id: "priority-1",
          title: "Resolve payment suspense",
          nextStep: "Classify or match suspense items before the owner cash review.",
          severity: "critical",
          state: "blocked",
          actionLink,
          evidenceGrade: "blocked",
          trustState: "blocked",
          freshness,
          dueLabel: "Due today",
          ownerLabel: "finance",
          blockers: [],
          redactions: [],
        },
      ],
      proofSubjects: [],
      acknowledgement: {
        supported: true,
        state: "not_started",
        acknowledgedAt: null,
        detail: "Session acknowledgement.",
      },
      headlineMetrics: {
        cashAtRisk: 125000,
        blockedCloseItems: 1,
        staleEvidenceItems: 0,
        proofLinkedActionCount: 1,
      },
    },
  } as unknown as OwnerWarRoomData
}

function buildManagerActionCenterData(): ManagerActionCenterData {
  const action = {
    id: "act-1",
    signalId: "sig-1",
    title: "Resolve payment suspense",
    nextStep: "Classify or match suspense items before cash review.",
    actionPath: "/dashboard/finance/payments/reconciliation",
    requiredPermission: "payments.reconciliation.read",
    status: "open" as const,
    severity: "critical" as const,
    severityScore: 98,
    assignedRole: "finance" as const,
    dueAt: "2026-06-25T12:00:00.000Z",
    dueState: "due_today" as const,
    evidenceGrade: "blocked" as const,
    trustState: "blocked" as const,
    state: "blocked" as const,
    blockers: [],
    redactions: [],
    actionLink,
  }

  return {
    organizationId: "org-session",
    generatedAt,
    periodStart: "2026-06-25T00:00:00.000Z",
    periodEnd: "2026-06-25T23:59:59.999Z",
    commandBrief: commandBrief("Manager daily run sheet"),
    runSheetGroups: [
      {
        id: "critical",
        title: "Critical pressure",
        detail: "Critical or high-risk actions that can block cash, stock, close, or control trust.",
        state: "blocked",
        count: 1,
        actions: [action],
      },
    ],
    kpis: [],
    insights: [],
    actionItems: [action],
    actionQueue: {
      ...emptyActionQueue,
      summary: {
        ...emptyActionQueue.summary,
        total: 1,
        open: 1,
        bySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 1 },
        byRole: { finance: 1 },
      },
    },
    summary: {
      total: 1,
      open: 1,
      assigned: 0,
      stale: 0,
      expired: 0,
      critical: 1,
      high: 0,
      redacted: 0,
      blocked: 1,
      overdue: 0,
      hiddenByPermission: 0,
    },
    assuranceIncidents: [],
  } as unknown as ManagerActionCenterData
}

function buildCloseDashboardData(): CloseAssuranceDashboardData {
  const period = {
    id: "period-2026-06",
    name: "June 2026",
    status: "OPEN" as const,
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-06-30T00:00:00.000Z",
  }

  return {
    source: {
      mode: "CLOSE_ASSURANCE_CENTER",
      asOf: generatedAt,
      organizationScoped: true,
      persisted: true,
      trustLevel: "T3",
      provenance: "MIXED",
      sourceTables: ["close_runs", "journal_entries", "payment_reconciliation_runs"],
    },
    period,
    periods: {
      currentOpenPeriod: period,
      recentPeriods: [period],
    },
    run: {
      id: "close-run-1",
      status: "BLOCKED",
      readinessScore: 72,
      criticalBlockerCount: 1,
      highBlockerCount: 2,
      evidenceCoveragePct: 80,
      correlationId: "corr-1",
      runById: "user-session",
      startedAt: generatedAt,
      completedAt: generatedAt,
      createdAt: generatedAt,
    },
    summary: {
      checklistCount: 6,
      passedCount: 4,
      failedCount: 1,
      warningCount: 1,
      unavailableCount: 0,
      findingCount: 1,
      openFindingCount: 1,
      evidenceCount: 12,
      commentCount: 0,
    },
    provenance: [
      {
        label: "Close run snapshot",
        provenance: "POSTED",
        asOf: generatedAt,
        periodStatus: "OPEN",
        sourceTables: ["close_runs"],
      },
    ],
    checklist: Array.from({ length: 6 }, (_, index) => ({
      id: `check-${index + 1}`,
      key: index === 0 ? "ledger-reconciliation" : index === 1 ? "payment-reconciliation" : `check-${index + 1}`,
      domain: index % 2 === 0 ? "LEDGER" : "PAYMENT_RECONCILIATION",
      status: index === 0 ? "FAILED" : "PASSED",
      severity: index === 0 ? "CRITICAL" : "LOW",
      label: `Close gate ${index + 1}`,
      detail: "Evidence-backed close gate with source service detail.",
      sourceService: "close-assurance.service",
      evidenceCount: index + 1,
      blockerReason: index === 0 ? "Critical evidence gap blocks certification." : null,
      nextActionHref: null,
      ownerId: null,
      dueAt: null,
    })),
    findings: [],
    evidenceItems: [],
    comments: [],
    reviews: [],
    controls: {
      assignmentRequiresPermission: "accounting.close.finding.assign",
      waiverApprovalRequiresFreshAuth: true,
      certificationAvailable: false,
      certificationDisabledReason: "Open high or critical findings block certification.",
      packExportAvailable: true,
      packExportDisabledReason: "Draft close pack export is available.",
    },
  } as unknown as CloseAssuranceDashboardData
}

function useDefaultCloseHookState(data = buildCloseDashboardData()) {
  ;(useCloseAssurance as jest.Mock).mockReturnValue({
    data,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })
  ;(useCloseEvidenceGraph as jest.Mock).mockReturnValue({
    data: {
      source: {
        mode: "CLOSE_ASSURANCE_EVIDENCE_GRAPH",
        asOf: generatedAt,
        organizationScoped: true,
        closeRunId: "close-run-1",
        periodId: "period-2026-06",
      },
      nodes: [],
      edges: [],
    },
    isFetching: false,
  })
  ;(useRunCloseAssurance as jest.Mock).mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
  ;(useAssignCloseFinding as jest.Mock).mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
  ;(useCommentOnCloseFinding as jest.Mock).mockReturnValue({ isPending: false, mutateAsync: jest.fn() })
  ;(useCloseWaiver as jest.Mock).mockReturnValue({ request: { isPending: false, mutateAsync: jest.fn() } })
  ;(useExportClosePack as jest.Mock).mockReturnValue({
    draft: { isPending: false, mutateAsync: jest.fn() },
    certified: { isPending: false, mutateAsync: jest.fn() },
  })
}

function mockAuthenticatedTenant(permissions = tenantPermissions) {
  ;(auth.api.getSession as jest.Mock).mockResolvedValue({
    user: {
      id: "user-session",
      email: "owner@kontava.test",
      organizationId: "org-session",
    },
  })
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({
    id: "user-session",
    email: "owner@kontava.test",
    firstName: "Owner",
    lastName: "Operator",
    phone: "",
    image: null,
    emailVerified: true,
    isVerified: true,
    isLocked: false,
    lockedUntil: null,
    organizationId: "org-session",
    organization: {
      name: "Kontava Demo",
      isActive: true,
      deletedAt: null,
    },
    roles: [
      {
        id: "role-owner",
        nameEn: "Owner",
        nameFr: "Proprietaire",
        code: "OWNER",
        permissions,
      },
    ],
  })
  ;(db.auditLog.create as jest.Mock).mockResolvedValue({ id: "audit-1" })
}

describe("authenticated dashboard command surface smoke", () => {
  let consoleError: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
    mockAuthenticatedTenant()
    ;(getOwnerWarRoomData as jest.Mock).mockResolvedValue(buildOwnerWarRoomData())
    ;(getManagerActionCenterData as jest.Mock).mockResolvedValue(buildManagerActionCenterData())
    ;(getCloseAssuranceDashboard as jest.Mock).mockResolvedValue(buildCloseDashboardData())
    ;(getCashCommandData as jest.Mock).mockResolvedValue(buildCashCommandData())
    ;(getStockToCashFlowData as jest.Mock).mockResolvedValue(buildStockToCashFlowData())
    useDefaultCloseHookState()
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it("loads Owner War Room through the tenant RBAC path and renders the command shell", async () => {
    const ui = await OwnerWarRoomPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(auth.api.getSession).toHaveBeenCalled()
    expect(db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }))
    expect(getOwnerWarRoomData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: expect.arrayContaining(["dashboard.read", "accounting.close.read"]),
    })
    expect(screen.getByRole("heading", { name: "Owner War Room" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Owner morning brief" })).toBeInTheDocument()
    expect(screen.getByText("Resolve payment suspense")).toBeInTheDocument()
  })

  it("loads Manager Action Center through the tenant RBAC path and renders the command shell", async () => {
    const ui = await ManagerActionCenterPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(auth.api.getSession).toHaveBeenCalled()
    expect(getManagerActionCenterData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorPermissions: expect.arrayContaining(["dashboard.read", "accounting.close.read"]),
    })
    expect(screen.getByRole("heading", { name: "Manager Action Center" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Manager daily run sheet" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Daily run sheet" })).toBeInTheDocument()
    expect(screen.getByText("Critical pressure")).toBeInTheDocument()
  })

  it("loads Accounting Close through the protected action path and renders the close command shell", async () => {
    const ui = await CloseAssurancePage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(auth.api.getSession).toHaveBeenCalled()
    expect(getCloseAssuranceDashboard).toHaveBeenCalledWith("org-session", undefined)
    expect(screen.getByRole("heading", { name: "Close & Assurance Center" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Close readiness journey" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Close readiness checklist" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Certification controls" })).toBeInTheDocument()
  })

  it("loads Cash Command through the tenant RBAC path and renders the finance command shell", async () => {
    const ui = await CashCommandPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(auth.api.getSession).toHaveBeenCalled()
    expect(getCashCommandData).toHaveBeenCalledWith({
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: expect.arrayContaining(["finance.read", "dashboard.read"]),
    })
    expect(screen.getByRole("heading", { name: "Cash command brief" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Cash Command Intelligence" })).toBeInTheDocument()
    expect(screen.getByText("Cash collected")).toBeInTheDocument()
  })

  it("loads Stock-to-Cash through the tenant RBAC path and renders the finance command shell", async () => {
    const ui = await StockToCashFlowPage({ params: Promise.resolve({ locale: "en" }) })
    render(ui)

    expect(auth.api.getSession).toHaveBeenCalled()
    expect(getStockToCashFlowData).toHaveBeenCalledWith({
      organizationId: "org-session",
      currency: "XAF",
    })
    expect(screen.getByRole("heading", { name: "Stock-to-Cash Flow" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Stock-to-cash chain" })).toBeInTheDocument()
    expect(screen.getByText("Inventory value")).toBeInTheDocument()
  })

  it("gates the finance command routes when the tenant session lacks route permissions", async () => {
    mockAuthenticatedTenant([])

    const cashCommand = await CashCommandPage({ params: Promise.resolve({ locale: "en" }) })
    render(cashCommand)
    expect(screen.getByRole("heading", { name: "Cash Command is not available for this role" })).toBeInTheDocument()
    expect(getCashCommandData).not.toHaveBeenCalled()
    cleanup()

    const stockToCash = await StockToCashFlowPage({ params: Promise.resolve({ locale: "en" }) })
    render(stockToCash)
    expect(screen.getByRole("heading", { name: "Stock-to-Cash is not available for this role" })).toBeInTheDocument()
    expect(getStockToCashFlowData).not.toHaveBeenCalled()
  })

  it("exposes Owner and Manager route loading and safe error states", () => {
    render(<OwnerWarRoomLoading />)
    expect(screen.getByRole("heading", { name: "Preparing Owner Morning Brief" })).toBeInTheDocument()
    cleanup()

    render(<ManagerActionCenterLoading />)
    expect(screen.getByRole("heading", { name: "Preparing Manager Daily Run Sheet" })).toBeInTheDocument()
    cleanup()

    const reset = jest.fn()
    render(<OwnerWarRoomError error={new Error("raw owner data source failed")} reset={reset} />)
    expect(screen.getByRole("heading", { name: "Owner War Room could not load" })).toBeInTheDocument()
    expect(screen.queryByText(/raw owner data source failed/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(reset).toHaveBeenCalledTimes(1)
    cleanup()

    render(<ManagerActionCenterError error={new Error("raw manager data source failed")} reset={jest.fn()} />)
    expect(screen.getByRole("heading", { name: "Manager Action Center could not load" })).toBeInTheDocument()
    expect(screen.queryByText(/raw manager data source failed/)).not.toBeInTheDocument()
  })

  it("exposes finance command loading and safe error states", () => {
    const loading = render(<FinanceLoading />)
    expect(loading.container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)
    cleanup()

    const reset = jest.fn()
    render(<FinanceError error={new Error("raw finance provider failed")} reset={reset} />)
    expect(screen.getByRole("heading", { name: "Dashboard page could not load" })).toBeInTheDocument()
    expect(screen.queryByText(/raw finance provider failed/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it("exposes Accounting Close loading and retryable error states inside the close command shell", () => {
    ;(useCloseAssurance as jest.Mock).mockReturnValueOnce({
      data: null,
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: jest.fn(),
    })

    render(<CloseAssuranceCenter initialData={null} locale="en" />)
    expect(screen.getByRole("heading", { name: "Loading close assurance" })).toBeInTheDocument()
    expect(screen.getAllByText(/Checking period close, ledger reconciliation/).length).toBeGreaterThan(0)
    cleanup()

    const refetch = jest.fn()
    ;(useCloseAssurance as jest.Mock).mockReturnValueOnce({
      data: null,
      isLoading: false,
      isFetching: false,
      error: new Error("Close assurance data is unavailable."),
      refetch,
    })

    render(<CloseAssuranceCenter initialData={null} locale="en" />)
    expect(screen.getByRole("heading", { name: "Close assurance unavailable" })).toBeInTheDocument()
    expect(screen.getAllByText("Close assurance data is unavailable.").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
