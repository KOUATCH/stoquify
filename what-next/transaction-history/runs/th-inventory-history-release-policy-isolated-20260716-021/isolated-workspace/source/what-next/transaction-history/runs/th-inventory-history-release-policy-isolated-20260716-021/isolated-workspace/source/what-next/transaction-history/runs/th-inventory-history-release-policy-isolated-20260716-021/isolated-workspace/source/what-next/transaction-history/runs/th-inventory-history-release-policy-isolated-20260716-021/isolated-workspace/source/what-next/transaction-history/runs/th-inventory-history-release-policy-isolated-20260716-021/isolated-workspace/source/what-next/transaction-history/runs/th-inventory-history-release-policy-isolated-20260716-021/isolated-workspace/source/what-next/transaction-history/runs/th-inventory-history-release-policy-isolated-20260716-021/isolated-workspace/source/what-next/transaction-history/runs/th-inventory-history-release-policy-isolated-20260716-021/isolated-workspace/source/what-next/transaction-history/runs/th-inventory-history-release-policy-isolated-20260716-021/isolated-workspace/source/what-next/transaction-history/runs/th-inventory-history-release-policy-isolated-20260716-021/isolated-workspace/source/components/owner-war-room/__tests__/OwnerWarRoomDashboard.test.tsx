import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

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

import { OwnerWarRoomDashboard } from "../OwnerWarRoomDashboard"
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
  it("renders the owner morning brief first viewport with local acknowledgement", () => {
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
    expect(screen.getByText("Cash truth")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Acknowledge brief/ }))

    expect(screen.getAllByText("Acknowledged").length).toBeGreaterThan(0)
  })
})
