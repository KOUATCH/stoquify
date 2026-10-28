import type { SVGProps } from "react"
import { render, screen } from "@testing-library/react"

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

jest.mock("@/actions/evidence/proof-trail.actions", () => ({
  getProofTrailAction: jest.fn(),
}))

jest.mock("@/components/evidence/ProofTrailDrawer", () => ({
  ProofTrailDrawer: ({ open }: { open: boolean }) => (open ? <div>Proof drawer</div> : null),
}))

import { CashCommandDashboard } from "../CashCommandDashboard"
import type { CashCommandData } from "@/services/cash-command/cash-command-contracts"
import type { BIFreshness, BIKpiCard, BIProvenance } from "@/services/bi/bi-contracts"

const generatedAt = "2026-06-24T08:00:00.000Z"

const freshness: BIFreshness = {
  state: "fresh",
  generatedAt,
  sourceMaxUpdatedAt: generatedAt,
  maxAgeMinutes: 1440,
  stale: false,
  staleReason: null,
}

const provenance: BIProvenance = {
  organizationId: "org-1",
  locationId: null,
  sourceKind: "payment.truth",
  sourceId: null,
  sourceHash: "hash-1",
  sourceModules: ["payments", "finance"],
  generatedAt,
  periodStart: "2026-06-24T00:00:00.000Z",
  periodEnd: "2026-06-24T23:59:59.999Z",
}

const actionLink = {
  id: "action-link-1",
  label: "Open",
  href: "/dashboard/finance/reconciliation",
  requiredPermission: "payments.reconciliation.read",
  moduleSlug: "payment_reconciliation" as const,
  disabled: false,
  disabledReason: null,
}

function card(id: string, title: string, value: number): BIKpiCard {
  return {
    id,
    organizationId: "org-1",
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
    provenance,
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

function buildData(): CashCommandData {
  const cashCard = card("cash_collected", "Cash collected", 180000)
  const suspenseCard = card("unreconciled_cash", "Unreconciled cash", 125000)

  return {
    organizationId: "org-1",
    organizationName: "Kontava Demo",
    generatedAt,
    periodStart: "2026-06-24T00:00:00.000Z",
    periodEnd: "2026-06-24T23:59:59.999Z",
    currency: "XAF",
    commandBrief: {
      id: "cash-command-brief:org-1",
      organizationId: "org-1",
      title: "Cash command brief",
      summary: "180,000 XAF collected, 125,000 XAF unreconciled, 2 suspense items.",
      conclusion: "Start with suspense.",
      mode: "brief",
      generatedAt,
      periodStart: "2026-06-24T00:00:00.000Z",
      periodEnd: "2026-06-24T23:59:59.999Z",
      state: "blocked",
      evidenceGrade: "blocked",
      trustState: "blocked",
      freshness,
      provenance,
      sourceModules: ["payments", "finance"],
      blockers: [],
      redactions: [],
      primaryAction: actionLink,
      drillThrough: null,
      reviewState: null,
    },
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
      {
        id: "open_suspense",
        label: "Open suspense",
        value: "2",
        detail: "125,000 XAF",
        tone: "gold",
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
        organizationId: "org-1",
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
        dueLabel: "Due Jun 24",
        ownerLabel: "finance",
        blockers: [],
        redactions: [],
      },
    ],
    risks: [
      {
        id: "risk-1",
        organizationId: "org-1",
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
        organizationId: "org-1",
        moduleSlug: "payment_reconciliation",
        subjectType: "payment.transaction",
        subjectId: "pt-1",
        label: "Payment transaction proof",
        requiredPermission: "payments.reconciliation.read",
        sourceModules: ["payments"],
      },
      {
        available: true,
        organizationId: "org-1",
        moduleSlug: "payment_reconciliation",
        subjectType: "reconciliation.run",
        subjectId: "rr-1",
        label: "Reconciliation proof",
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
      activeEmployeeBalanceCaseCount: 0,
      employeeBalanceOutstandingAmount: 0,
      actionCountToday: 1,
      staleCount: 0,
      blockedCount: 1,
      redactedCount: 0,
    },
  }
}

describe("CashCommandDashboard", () => {
  it("renders the cash command brief, trust banner, KPI cards, strips, and proof entry", () => {
    render(
      <CashCommandDashboard
        data={buildData()}
        locale="en"
        title="Cash Command Intelligence"
        subtitle="Read-only cash truth."
      />,
    )

    expect(screen.getByRole("heading", { name: "Cash command brief" })).toBeInTheDocument()
    expect(screen.getByText("Cash trust banner")).toBeInTheDocument()
    expect(screen.getByText("Cash collected")).toBeInTheDocument()
    expect(screen.getAllByText("Unreconciled cash").length).toBeGreaterThan(0)
    expect(screen.getByText("What changed since yesterday")).toBeInTheDocument()
    expect(screen.getByText("What needs action today")).toBeInTheDocument()
    expect(screen.getByText("Resolve payment suspense")).toBeInTheDocument()
    expect(screen.getByText("Payment transaction proof")).toBeInTheDocument()
    expect(screen.getByText("Reconciliation proof")).toBeInTheDocument()
  })
})
