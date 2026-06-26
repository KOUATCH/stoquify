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

import { ManagerActionCenterDashboard } from "../ManagerActionCenterDashboard"
import type { ManagerActionCenterData } from "@/services/manager-action-center/manager-action-center-contracts"
import type { BIFreshness, BIProvenance } from "@/services/bi/bi-contracts"

const generatedAt = "2026-06-20T10:00:00.000Z"

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
  sourceKind: "tenant.operating",
  sourceHash: "tenant-hash",
  sourceModules: ["dashboard", "payments"],
  generatedAt,
  periodStart: "2026-06-01T00:00:00.000Z",
  periodEnd: "2026-06-20T23:59:59.999Z",
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

describe("ManagerActionCenterDashboard", () => {
  it("renders the daily run sheet above generic KPI grids", () => {
    render(
      <ManagerActionCenterDashboard
        data={buildData()}
        locale="en"
        title="Manager Action Center"
        subtitle="Handle today's operating work."
      />,
    )

    expect(screen.getByRole("heading", { name: "Manager daily run sheet" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Do first today" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Daily run sheet" })).toBeInTheDocument()
    expect(screen.getAllByText("Resolve payment suspense").length).toBeGreaterThan(0)
    expect(screen.getByText("Critical pressure")).toBeInTheDocument()
  })
})

function buildData(): ManagerActionCenterData {
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
    dueAt: "2026-06-20T12:00:00.000Z",
    dueState: "due_today" as const,
    evidenceGrade: "blocked" as const,
    trustState: "blocked" as const,
    state: "blocked" as const,
    blockers: [],
    redactions: [],
    actionLink,
  }

  return {
    organizationId: "org-1",
    generatedAt,
    periodStart: "2026-06-01T00:00:00.000Z",
    periodEnd: "2026-06-20T23:59:59.999Z",
    commandBrief: {
      id: "manager-daily-run-sheet:org-1",
      organizationId: "org-1",
      title: "Manager daily run sheet",
      summary: "1 visible action: 0 overdue, 1 critical or high, 0 blocked, and 0 hidden by permission.",
      conclusion: "Handle critical pressure before scanning routine KPIs.",
      mode: "brief",
      generatedAt,
      periodStart: "2026-06-01T00:00:00.000Z",
      periodEnd: "2026-06-20T23:59:59.999Z",
      state: "blocked",
      evidenceGrade: "blocked",
      trustState: "blocked",
      freshness,
      provenance,
      sourceModules: ["dashboard", "payments"],
      blockers: [],
      redactions: [],
      primaryAction: actionLink,
      drillThrough: null,
      reviewState: {
        organizationId: "org-1",
        reviewerId: null,
        reviewerRole: "manager",
        state: "blocked",
        reviewedAt: null,
        previousReviewedAt: null,
        nextReviewDueAt: null,
        freshness,
        blockers: [],
      },
    },
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
      organizationId: "org-1",
      generatedAt,
      signals: [],
      actionItems: [],
      filteredOutCount: 0,
      summary: {
        total: 1,
        open: 1,
        assigned: 0,
        stale: 0,
        expired: 0,
        redacted: 0,
        bySeverity: {
          info: 0,
          low: 0,
          medium: 0,
          high: 0,
          critical: 1,
        },
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
  }
}
