import type { SVGProps } from "react"
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

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
  ProofTrailDrawer: ({ open, error }: { open: boolean; error?: string }) => (
    open ? <div><span>Proof drawer</span>{error ? <p role="alert">{error}</p> : null}</div> : null
  ),
}))

import { OwnerWarRoomDashboard } from "../OwnerWarRoomDashboard"
import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
import type { OwnerWarRoomData } from "@/services/owner-war-room/owner-war-room-contracts"
import type { BIFreshness, BIProvenance } from "@/services/bi/bi-contracts"

const generatedAt = "2026-06-22T08:00:00.000Z"

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
  periodStart: "2026-06-21T00:00:00.000Z",
  periodEnd: "2026-06-22T23:59:59.999Z",
}

const actionLink = {
  id: "action-link-1",
  label: "Open",
  href: "/dashboard/finance/payments",
  requiredPermission: "payments.reconciliation.read",
  moduleSlug: "payment_reconciliation" as const,
  disabled: false,
  disabledReason: null,
}

function buildData(): OwnerWarRoomData {
  const primaryMetric = {
    id: "cash-at-risk",
    organizationId: "org-1",
    moduleSlug: "payment_reconciliation" as const,
    requiredPermission: "payments.reconciliation.read",
    title: "Cash at risk",
    detail: "Open suspense amount from payment truth.",
    value: 125000,
    unit: "XAF",
    format: "currency" as const,
    state: "blocked" as const,
    evidenceGrade: "blocked" as const,
    trustState: "blocked" as const,
    freshness,
    provenance,
    blockers: [],
    redactions: [],
    drillThrough: {
      available: true as const,
      type: "route" as const,
      label: "Open cash",
      href: "/dashboard/finance/payments",
      requiredPermission: "payments.reconciliation.read",
    },
    actionLink,
  }

  return {
    organizationId: "org-1",
    organizationName: "Kontava Demo",
    generatedAt,
    periodStart: "2026-06-21T00:00:00.000Z",
    periodEnd: "2026-06-22T23:59:59.999Z",
    cards: [],
    strips: [],
    proofSubjects: [
      {
        subjectType: "reconciliation.run",
        subjectId: "rr-1",
        label: "Reconciliation proof",
        detail: "Inspect payment reconciliation evidence.",
        requiredPermission: "payments.reconciliation.read",
        enabled: true,
        unavailableReason: null,
      },
    ],
    actionQueue: {
      organizationId: "org-1",
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
      criticalCount: 1,
      highCount: 0,
      redactedCount: 0,
      staleCount: 0,
      blockedCount: 1,
      upgradePromptCount: 0,
    },
    morningBrief: {
      id: "owner-morning-brief:org-1",
      organizationId: "org-1",
      audienceRole: "owner",
      generatedAt,
      periodStart: "2026-06-21T00:00:00.000Z",
      periodEnd: "2026-06-22T23:59:59.999Z",
      freshness,
      commandBrief: {
        id: "owner-command-brief:org-1",
        organizationId: "org-1",
        title: "Owner morning brief",
        summary: "125,000 XAF cash at risk, 1 blocked close item, 0 stale evidence items, and 1 proof-linked action opened since yesterday.",
        conclusion: "Start with cash risk: suspense must be explained before the owner can trust daily cash.",
        mode: "brief",
        generatedAt,
        periodStart: "2026-06-21T00:00:00.000Z",
        periodEnd: "2026-06-22T23:59:59.999Z",
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
        reviewState: {
          organizationId: "org-1",
          reviewerId: null,
          reviewerRole: "owner",
          state: "blocked",
          reviewedAt: null,
          previousReviewedAt: null,
          nextReviewDueAt: "2026-06-23T08:00:00.000Z",
          freshness,
          blockers: [],
        },
      },
      changes: [
        {
          id: "change-1",
          organizationId: "org-1",
          moduleSlug: "payment_reconciliation",
          requiredPermission: "payments.reconciliation.read",
          title: "Cash at risk is visible since yesterday",
          detail: "Open suspense value is still present.",
          businessImpact: "Daily cash remains ambiguous until suspense is explained.",
          direction: "new",
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
          drillThrough: null,
          actionLink,
        },
      ],
      risks: [
        {
          id: "risk-1",
          organizationId: "org-1",
          moduleSlug: "payment_reconciliation",
          rank: 1,
          title: "Cash at risk",
          detail: "Payment suspense value is still open.",
          businessImpact: "Unresolved suspense weakens daily cash trust.",
          severity: "high",
          severityScore: 82,
          moneyImpact: 125000,
          urgency: "today",
          state: "blocked",
          evidenceGrade: "blocked",
          trustState: "blocked",
          freshness,
          sourceModules: ["payments"],
          blockers: [],
          redactions: [],
          drillThrough: primaryMetric.drillThrough,
          actionLink,
        },
      ],
      actions: [actionLink],
      zones: [
        {
          id: "zone-1",
          organizationId: "org-1",
          moduleSlug: "payment_reconciliation",
          title: "Cash truth",
          businessQuestion: "How much cash is at risk before the owner trusts the day?",
          summary: "125,000 XAF remains in suspense.",
          state: "blocked",
          evidenceGrade: "blocked",
          trustState: "blocked",
          freshness,
          sourceModules: ["payments"],
          primaryMetric,
          sections: [],
          cards: [primaryMetric],
          insights: [],
          risks: [],
          flowSteps: [],
          actions: [actionLink],
          blockers: [],
          redactions: [],
          drillThrough: primaryMetric.drillThrough,
        },
      ],
      blockers: [],
      redactions: [],
      priorityActions: [
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
          dueLabel: "Due Jun 22",
          ownerLabel: "finance",
          blockers: [],
          redactions: [],
        },
      ],
      proofSubjects: [
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
  }
}

describe("OwnerWarRoomDashboard", () => {
  it("shows daily priorities first and retains acknowledgement when switching views", () => {
    render(
      <OwnerWarRoomDashboard
        data={buildData()}
        locale="en"
        title="Owner War Room"
        subtitle="Evidence-backed owner command center."
      />,
    )

    expect(screen.getByRole("heading", { name: "Owner morning brief" })).toBeInTheDocument()
    expect(screen.getByText(/125,000 XAF cash at risk/)).toBeInTheDocument()
    expect(screen.getByText("Cash at risk is visible since yesterday")).toBeInTheDocument()
    expect(screen.getByText("Resolve payment suspense")).toBeInTheDocument()
    expect(screen.queryByText("Cash truth")).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Owner action queue" })).not.toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: /Acknowledge brief/ }))

    expect(screen.getAllByText("Acknowledged").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Command", exact: true }))
    expect(screen.getByRole("heading", { name: "Owner action queue" })).toBeVisible()
    expect(screen.queryByText("Resolve payment suspense")).not.toBeInTheDocument()
    expect(screen.getByText("No open actions are visible to you in this organization.")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Investigate", exact: true }))
    expect(screen.getByText("Cash truth")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Module state" })).toBeVisible()
    expect(screen.queryByRole("heading", { name: "Owner action queue" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Brief", exact: true }))
    expect(screen.getByRole("button", { name: "Acknowledged" })).toBeDisabled()
  })

  it("keeps proof recovery available from the investigation view", async () => {
    jest.mocked(getProofTrailAction).mockResolvedValueOnce({ success: false, error: "Evidence temporarily unavailable" })
    render(<OwnerWarRoomDashboard data={buildData()} locale="en" title="Owner War Room" subtitle="Owner overview" />)
    fireEvent.click(screen.getByRole("button", { name: "Investigate", exact: true }))
    fireEvent.click(screen.getAllByRole("button", { name: /Reconciliation proof/ }).at(-1)!)
    await waitFor(() => expect(screen.getAllByText("Evidence temporarily unavailable").length).toBeGreaterThan(0))
    expect(getProofTrailAction).toHaveBeenCalledWith({ subjectType: "reconciliation.run", subjectId: "rr-1" })
    expect(screen.getByText("Proof drawer")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Brief", exact: true }))
    expect(screen.getByText("Proof drawer")).toBeInTheDocument()
    expect(screen.getByText("Evidence temporarily unavailable")).toBeVisible()
  })

  it("uses French view controls and retains permission-limited feedback", () => {
    const data = buildData()
    data.actionQueue.filteredOutCount = 2
    render(<OwnerWarRoomDashboard data={data} locale="fr" title="Pilotage" subtitle="Vue propriétaire" />)
    expect(screen.queryByRole("button", { name: "Investigate", exact: true })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Pilotage", exact: true }))
    expect(screen.getByText(copyFiltered)).toBeVisible()
    expect(screen.getByRole("button", { name: "Pilotage", exact: true })).toHaveAttribute("aria-pressed", "true")
  })
})

const copyFiltered = "Certaines actions sont masquées selon vos droits d’accès."

it.each(["en", "fr"])("presents role labels without changing action authority in %s", locale => {
  const data = buildData()
  data.actionQueue.actionItems = [{
    id: "role-action", organizationId: "org-1", signalId: "signal-1", signalType: "purchase_order_receiving_delay",
    title: "Review receipt", nextStep: "Inspect source proof", actionPath: "/dashboard/purchase-orders",
    requiredPermission: "purchase.order.read", status: "open", severity: "high", severityScore: 75,
    assignedRole: "purchasing", assigneeId: null, createdAt: generatedAt, updatedAt: generatedAt, dueAt: generatedAt,
    resolvedAt: null, dismissedAt: null, evidenceGrade: "blocked", redactions: [], blockers: [],
  }]
  const before = JSON.stringify(data.actionQueue)
  render(<OwnerWarRoomDashboard data={data} locale={locale} title="Owner" subtitle="Overview" />)
  fireEvent.click(screen.getByRole("button", { name: locale === "fr" ? "Pilotage" : "Command", exact: true }))
  expect(screen.getByText(locale === "fr" ? "Achats" : "Purchasing")).toBeVisible()
  expect(screen.getByText("purchase.order.read")).toBeVisible()
  expect(screen.getByRole("link", { name: /Review receipt/ })).toHaveAttribute("href", `/${locale}/dashboard/purchase-orders`)
  expect(JSON.stringify(data.actionQueue)).toBe(before)
})

it("retains all four attention counts and uses localized, descriptive priority links", () => {
  const data = buildData()
  const { container } = render(<OwnerWarRoomDashboard data={data} locale="fr" title="Pilotage" subtitle="Vue propriétaire" />)
  const summary = container.querySelector('dl[aria-label="Points d’attention"]')!
  expect(Array.from(summary.querySelectorAll("dd")).map(node => node.textContent)).toEqual([
    data.summary.criticalCount, data.summary.highCount, data.summary.staleCount, data.summary.blockedCount,
  ].map(String))
  expect(screen.getByRole("link", { name: "Ouvrir : Resolve payment suspense" })).toHaveAttribute("href", "/fr/dashboard/finance/payments")
  expect(screen.queryByText("not started")).not.toBeInTheDocument()
  expect(screen.getByText(/Cela ne résout aucune action/)).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Marquer comme lu" }))
  expect(screen.getByRole("button", { name: "Lu" })).toBeDisabled()
  expect(screen.getByText("Marqué comme lu pour cette visite uniquement.")).toBeVisible()
})
