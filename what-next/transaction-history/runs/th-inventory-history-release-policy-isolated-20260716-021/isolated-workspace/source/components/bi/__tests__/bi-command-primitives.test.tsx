import type { SVGProps } from "react"
import { fireEvent, render, screen } from "@testing-library/react"

jest.mock("lucide-react", () => {
  const createIcon = (name: string) => {
    const Icon = (props: SVGProps<SVGSVGElement>) => <svg data-testid={`icon-${name}`} {...props} />
    return Icon
  }

  return {
    __esModule: true,
    AlertTriangle: createIcon("AlertTriangle"),
    ArrowDownRight: createIcon("ArrowDownRight"),
    ArrowRight: createIcon("ArrowRight"),
    ArrowUpRight: createIcon("ArrowUpRight"),
    Banknote: createIcon("Banknote"),
    Ban: createIcon("Ban"),
    BarChart3: createIcon("BarChart3"),
    CalendarClock: createIcon("CalendarClock"),
    CalendarDays: createIcon("CalendarDays"),
    CheckCircle2: createIcon("CheckCircle2"),
    CircleDot: createIcon("CircleDot"),
    CirclePlus: createIcon("CirclePlus"),
    Clock3: createIcon("Clock3"),
    Database: createIcon("Database"),
    Eye: createIcon("Eye"),
    EyeOff: createIcon("EyeOff"),
    FileSearch: createIcon("FileSearch"),
    GitBranch: createIcon("GitBranch"),
    ListChecks: createIcon("ListChecks"),
    Loader2: createIcon("Loader2"),
    LockKeyhole: createIcon("LockKeyhole"),
    PackageOpen: createIcon("PackageOpen"),
    ShieldAlert: createIcon("ShieldAlert"),
    ShieldCheck: createIcon("ShieldCheck"),
    TimerReset: createIcon("TimerReset"),
    X: createIcon("X"),
  }
})

import {
  BIActionPriorityBoard,
  BIBusinessTruthZone,
  BICommandBriefHeader,
  BICommandModeTabs,
  BIProofDrawerHost,
  BIRiskOpportunityRadar,
  BIStateSurface,
  BITrustLegend,
  BIWhatChangedStrip,
} from "@/components/bi"
import type {
  BIActionLink,
  BIChangeEvent,
  BICommandBrief,
  BICommandZone,
  BIFreshness,
  BIKpiCard,
  BIProvenance,
  BIProofDrawerSubject,
  BIRiskRank,
} from "@/services/bi/bi-contracts"
import type { ProofTrailResult } from "@/services/evidence/evidence-contracts"

const freshness: BIFreshness = {
  state: "fresh",
  generatedAt: "2026-06-22T08:00:00.000Z",
  sourceMaxUpdatedAt: "2026-06-22T07:55:00.000Z",
  maxAgeMinutes: 60,
  stale: false,
  staleReason: null,
}

const provenance: BIProvenance = {
  organizationId: "org-1",
  locationId: null,
  sourceKind: "tenant.operating",
  sourceId: "snapshot-1",
  sourceHash: "hash-1",
  sourceModules: ["finance", "inventory"],
  generatedAt: freshness.generatedAt,
  periodStart: "2026-06-01",
  periodEnd: "2026-06-22",
}

const actionLink: BIActionLink = {
  id: "action-1",
  label: "Review now",
  href: "/en/dashboard/analytics",
  requiredPermission: "analytics.read",
  moduleSlug: "analytics",
  disabled: false,
  disabledReason: null,
}

const disabledActionLink: BIActionLink = {
  ...actionLink,
  id: "action-disabled",
  label: "Request access",
  disabled: true,
  disabledReason: "Missing analytics permission.",
}

const kpi: BIKpiCard = {
  id: "kpi-1",
  organizationId: "org-1",
  moduleSlug: "finance",
  requiredPermission: "finance.read",
  title: "Trusted cash",
  detail: "Reconciled cash available for owner decisions.",
  value: 125000,
  unit: "XAF",
  format: "currency",
  state: "ready",
  evidenceGrade: "reconciled",
  trustState: "reconciled",
  freshness,
  provenance,
  blockers: [],
  redactions: [],
  drillThrough: {
    available: true,
    type: "route",
    label: "Open cash evidence",
    href: "/en/dashboard/finance",
    requiredPermission: "finance.read",
  },
  actionLink,
}

function buildBrief(): BICommandBrief {
  return {
    id: "brief-1",
    organizationId: "org-1",
    title: "Owner daily command",
    summary: "The operating picture is ready for review.",
    conclusion: "Cash is trusted, stock needs attention, and close blockers are clear.",
    mode: "brief",
    generatedAt: freshness.generatedAt,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-22",
    state: "ready",
    evidenceGrade: "reconciled",
    trustState: "reconciled",
    freshness,
    provenance,
    sourceModules: ["finance", "inventory"],
    blockers: [],
    redactions: [],
    primaryAction: actionLink,
    drillThrough: null,
    reviewState: {
      organizationId: "org-1",
      reviewerId: "user-1",
      reviewerRole: "owner",
      state: "in_review",
      reviewedAt: null,
      previousReviewedAt: null,
      nextReviewDueAt: "2026-06-23T08:00:00.000Z",
      freshness,
      blockers: [],
    },
  }
}

function buildChange(): BIChangeEvent {
  return {
    id: "change-1",
    organizationId: "org-1",
    moduleSlug: "finance",
    requiredPermission: "finance.read",
    title: "Suspense exposure improved",
    detail: "Open suspense has moved down.",
    businessImpact: "Less cash ambiguity for the owner.",
    direction: "improved",
    severity: "medium",
    state: "ready",
    evidenceGrade: "reconciled",
    trustState: "reconciled",
    freshness,
    sourceModules: ["finance"],
    changedAt: freshness.generatedAt,
    previousValue: 10,
    currentValue: 4,
    unit: "items",
    format: "number",
    provenance,
    blockers: [],
    redactions: [],
    drillThrough: null,
    actionLink,
  }
}

function buildZone(): BICommandZone {
  return {
    id: "zone-1",
    organizationId: "org-1",
    moduleSlug: "finance",
    title: "Cash truth",
    businessQuestion: "Can the owner trust today's cash position?",
    summary: "Cash is reconciled but one supplier payment needs review.",
    state: "partial",
    evidenceGrade: "reconciled",
    trustState: "reconciled",
    freshness,
    sourceModules: ["finance"],
    primaryMetric: kpi,
    sections: [],
    cards: [kpi],
    insights: [],
    risks: [],
    flowSteps: [],
    actions: [actionLink, disabledActionLink],
    blockers: [
      {
        id: "blocker-1",
        severity: "high",
        gate: "cash.review",
        title: "Supplier payment needs proof",
        detail: "Payment evidence is not complete.",
        sourceTables: ["supplier_payments"],
        nextAction: "Attach payment proof.",
      },
    ],
    redactions: [
      {
        id: "redaction-1",
        field: "supplierBankAccount",
        reason: "Sensitive payment destination.",
        policy: "payment_sensitive",
      },
    ],
    drillThrough: kpi.drillThrough,
  }
}

function buildRisk(): BIRiskRank {
  return {
    id: "risk-1",
    organizationId: "org-1",
    moduleSlug: "inventory",
    rank: 1,
    title: "Stock-to-cash leakage",
    detail: "Inventory movement and cash collection diverged.",
    businessImpact: "Possible margin loss before month close.",
    severity: "high",
    severityScore: 91,
    moneyImpact: 250000,
    urgency: "today",
    state: "ready",
    evidenceGrade: "operational",
    trustState: "operational",
    freshness,
    sourceModules: ["inventory", "finance"],
    blockers: [],
    redactions: [],
    drillThrough: {
      available: false,
      type: "proof",
      label: "Proof unavailable",
      requiredPermission: "inventory.read",
      unavailableReason: "No supported proof subject is available yet.",
    },
    actionLink,
  }
}

const availableSubject: BIProofDrawerSubject = {
  available: true,
  organizationId: "org-1",
  moduleSlug: "accounting",
  subjectType: "journal.entry",
  subjectId: "journal-1",
  label: "View journal proof",
  requiredPermission: "accounting.journal.read",
  sourceModules: ["accounting"],
}

const proofTrail: ProofTrailResult = {
  organizationId: "org-1",
  subjectType: "journal.entry",
  subjectId: "journal-1",
  moduleSlug: "accounting",
  evidenceGrade: "posted",
  reason: "Journal entry is posted with source trace.",
  freshness: "fresh",
  generatedAt: freshness.generatedAt,
  sourceModules: ["accounting"],
  nodes: [],
  edges: [],
  blockers: [],
  redactions: [],
  nextActions: [],
  audit: {
    accessLogged: true,
    sensitiveAccess: false,
  },
}

describe("BI command primitives", () => {
  it("renders the command brief and switches modes through the shared tabs", () => {
    const onModeChange = jest.fn()

    render(<BICommandBriefHeader brief={buildBrief()} mode="brief" onModeChange={onModeChange} />)

    expect(screen.getByRole("heading", { name: "Owner daily command" })).toBeInTheDocument()
    expect(screen.getByText(/Cash is trusted/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Command/ }))
    expect(onModeChange).toHaveBeenCalledWith("command")
  })

  it("renders standalone mode tabs with all command modes", () => {
    render(<BICommandModeTabs value="investigate" />)

    expect(screen.getByRole("button", { name: /Brief/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Command/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Investigate/ })).toHaveAttribute("aria-pressed", "true")
  })

  it("renders changes, empty states, action blockers, business truth, and risk ranking", () => {
    render(
      <>
        <BIWhatChangedStrip changes={[buildChange()]} />
        <BIWhatChangedStrip changes={[]} title="Empty changes" />
        <BIActionPriorityBoard
          items={[
            {
              id: "priority-1",
              title: "Resolve cash blocker",
              nextStep: "Attach provider evidence before close.",
              severity: "high",
              state: "blocked",
              actionLink: disabledActionLink,
              evidenceGrade: "blocked",
              trustState: "blocked",
              freshness,
            },
          ]}
        />
        <BIBusinessTruthZone zone={buildZone()} />
        <BIRiskOpportunityRadar risks={[buildRisk()]} />
      </>,
    )

    expect(screen.getByText("Suspense exposure improved")).toBeInTheDocument()
    expect(screen.getByText("No important changes yet")).toBeInTheDocument()
    expect(screen.getByText("Resolve cash blocker")).toBeInTheDocument()
    expect(screen.getByText("Supplier payment needs proof")).toBeInTheDocument()
    expect(screen.getByText("Stock-to-cash leakage")).toBeInTheDocument()
  })

  it("handles proof drawer available and unavailable states without computing access", () => {
    const onOpenSubject = jest.fn()

    render(
      <>
        <BIProofDrawerHost subject={availableSubject} proofTrail={proofTrail} onOpenSubject={onOpenSubject} />
        <BIProofDrawerHost
          subject={{
            available: false,
            organizationId: "org-1",
            moduleSlug: "accounting",
            label: "Proof blocked",
            requiredPermission: "accounting.journal.read",
            unavailableReason: "Missing permission.",
            sourceModules: ["accounting"],
          }}
          proofTrail={null}
        />
      </>,
    )

    expect(screen.getByRole("button", { name: "Proof blocked" })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "View journal proof" }))
    expect(onOpenSubject).toHaveBeenCalledWith(availableSubject)
  })

  it("renders trust legend and explicit safe state surfaces", () => {
    render(
      <>
        <BITrustLegend compact />
        <BIStateSurface state="redacted" />
        <BIStateSurface state="permission_denied" />
        <BIStateSurface state="module_unavailable" />
      </>,
    )

    expect(screen.getByText("Trust legend")).toBeInTheDocument()
    expect(screen.getByText("Sensitive command data is redacted")).toBeInTheDocument()
    expect(screen.getByText("Permission required")).toBeInTheDocument()
    expect(screen.getAllByText("Module unavailable")).toHaveLength(2)
  })
})
