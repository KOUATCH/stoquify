import type { SVGProps } from "react"
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
import { fireEvent, render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"

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
    RefreshCw: createIcon("RefreshCw"),
    ShieldAlert: createIcon("ShieldAlert"),
    ShieldCheck: createIcon("ShieldCheck"),
    TimerReset: createIcon("TimerReset"),
    X: createIcon("X"),
  }
})

import {
  BIDrillThroughButton,
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

it.each(["en", "fr"])("renders one localized stock destination when the zone repeats the same route (%s)", locale => {
  const action = { ...actionLink, label: "Open stock items", href: "/dashboard/inventory/items?location=west#stock" }
  render(<BIBusinessTruthZone locale={locale} zone={{ ...buildZone(), actions: [action], drillThrough: { available: true, type: "route", label: action.label, href: action.href, requiredPermission: action.requiredPermission } }} />)
  expect(screen.getAllByRole("link", { name: "Open stock items" })).toHaveLength(1)
  expect(screen.getByRole("link", { name: "Open stock items" })).toHaveAttribute("href", `/${locale}${action.href}`)
})

it("shows one visible access explanation and no link when stock action and drill-through are denied", () => {
  const action = { ...actionLink, label: "Open stock items", disabled: true, disabledReason: "Inventory item access is required." }
  render(<BIBusinessTruthZone zone={{ ...buildZone(), actions: [action], drillThrough: { available: false, type: "route", label: action.label, requiredPermission: action.requiredPermission, unavailableReason: action.disabledReason } }} />)
  const button = screen.getByRole("button", { name: action.label })
  expect(button).toBeDisabled()
  expect(button).toHaveAccessibleDescription(action.disabledReason)
  expect(screen.getByText(action.disabledReason)).toBeVisible()
  expect(screen.queryByRole("link")).not.toBeInTheDocument()
})

it("retains distinct evidence destinations and localizes their query/anchor", () => {
  const action = { ...actionLink, href: "/dashboard/inventory/items", label: "Open stock items" }
  render(<BIBusinessTruthZone locale="fr" zone={{ ...buildZone(), actions: [action], drillThrough: { available: true, type: "route_and_proof", label: "Inspect evidence", href: "/dashboard/inventory/movements?item=one#history", requiredPermission: "inventory.stock.read" } }} />)
  expect(screen.getAllByRole("link")).toHaveLength(2)
  expect(screen.getByRole("link", { name: "Inspect evidence" })).toHaveAttribute("href", "/fr/dashboard/inventory/movements?item=one#history")
})

it("never substitutes a route for an unavailable drill-through", () => {
  render(<BIDrillThroughButton locale="fr" drillThrough={{ available: false, type: "route", label: "Stock", requiredPermission: "inventory.items.read", unavailableReason: "Access required" }} />)
  expect(screen.getByRole("button", { name: "Stock" })).toBeDisabled()
  expect(screen.queryByRole("link")).not.toBeInTheDocument()
})

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
  it("retains source details alongside distinct impact text without duplicating identical copy", () => {
    const change = buildChange()
    const { rerender } = render(<BIWhatChangedStrip changes={[change]} />)
    expect(screen.getByText(change.detail)).toBeVisible()
    expect(screen.getByText(change.businessImpact!)).toBeVisible()
    rerender(<BIWhatChangedStrip changes={[{ ...change, businessImpact: change.detail }]} />)
    expect(screen.getAllByText(change.detail)).toHaveLength(1)
    rerender(<BIWhatChangedStrip changes={[{ ...change, detail: "" }]} />)
    expect(screen.getByText(change.businessImpact!)).toBeVisible()
  })
  it.each(["en", "fr"])("distinguishes observed scores from historical changes in %s", locale => {
    const observation = { ...buildChange(), direction: "observed" as const, previousValue: null, currentValue: 75, unit: "risk" }
    const { container, rerender } = render(<BIWhatChangedStrip changes={[observation]} locale={locale} />)
    expect(screen.getByText(locale === "fr" ? "Observé" : "Observed")).toBeVisible()
    expect(screen.getByText(locale === "fr" ? "Score de risque: 75" : "Risk score: 75")).toBeVisible()
    expect(screen.getByText(locale === "fr" ? "Comparaison historique indisponible" : "Historical comparison unavailable")).toBeVisible()
    expect(container.textContent).not.toContain("->")
    rerender(<BIWhatChangedStrip changes={[{ ...buildChange(), previousValue: 10, currentValue: 15, unit: "items" }]} locale={locale} />)
    expect(screen.getByText(locale === "fr" ? "10 -> 15 éléments" : "10 -> 15 items")).toBeVisible()
    expect(screen.queryByText(locale === "fr" ? "Comparaison historique indisponible" : "Historical comparison unavailable")).not.toBeInTheDocument()
  })
  it.each(["items", "orders", "score", "XAF", "source-unit", "constructor"])("localizes only known change units: %s", unit => {
    const change = { ...buildChange(), unit, currentValue: 75 }
    const before = JSON.stringify(change)
    const label = ({ items: "éléments", orders: "commandes", score: "points" } as Record<string, string>)[unit]
    const expected = ["items", "orders", "score"].includes(unit) ? label : unit
    const { rerender } = render(<BIWhatChangedStrip changes={[change]} locale="fr" />)
    expect(screen.getByText(`10 -> 75 ${expected}`)).toBeVisible()
    rerender(<BIWhatChangedStrip changes={[{ ...change, direction: "observed", previousValue: null }]} locale="fr" />)
    expect(screen.getByText(`Valeur actuelle: 75 ${expected}`)).toBeVisible()
    expect(JSON.stringify(change)).toBe(before)
  })
  it("localizes French brief metadata, evidence and mode controls without changing the target", () => {
    const onModeChange = jest.fn()
    render(<BICommandBriefHeader brief={buildBrief()} locale="fr" timezone="UTC" onModeChange={onModeChange} />)
    expect(screen.getByText("Synthèse de pilotage")).toBeVisible()
    expect(screen.getByText("Période:")).toBeVisible()
    expect(screen.getByText("en cours")).toBeVisible()
    const evidenceBadge = screen.getByText("preuve:").parentElement!
    expect(evidenceBadge).toHaveTextContent("preuve: Rapproché")
    expect(evidenceBadge).toBeVisible()
    expect(evidenceBadge).not.toHaveAttribute("aria-label")
    expect(screen.getAllByText("à jour").length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole("button", { name: "Examiner" }))
    expect(onModeChange).toHaveBeenCalledWith("investigate")
    expect(screen.getByRole("link", { name: actionLink.label })).toHaveAttribute("href", actionLink.href)
  })
  it("keeps French denied KPI values hidden and unavailable evidence controls disabled", () => {
    const { BIKpiCard: CurrencyCard } = require("../BIKpiCard")
    render(<CurrencyCard locale="fr" card={{ ...kpi, state: "permission_denied", actionLink: null, drillThrough: { available: false, type: "proof", label: "Preuve indisponible", requiredPermission: "finance.read", unavailableReason: "Autorisation manquante" } }} />)
    expect(screen.getByText("Accès refusé")).toBeVisible()
    expect(screen.getByText("Vous n’avez pas accès à cet indicateur")).toBeVisible()
    expect(screen.getByRole("button", { name: "Preuve indisponible" })).toBeDisabled()
    expect(screen.queryByText(/125/)).not.toBeInTheDocument()
  })
  it("localizes French empty and stale state guidance", () => {
    render(<><BIWhatChangedStrip changes={[]} locale="fr" /><BIStateSurface state="stale" locale="fr" /><BIRiskOpportunityRadar risks={[]} locale="fr" /></>)
    expect(screen.getByText("Aucune évolution importante pour le moment")).toBeVisible()
    expect(screen.getByText("Données de pilotage périmées")).toBeVisible()
    expect(screen.getByText("Aucun signal affiché")).toBeVisible()
  })
  it("renders unassessed observations without inventing urgency or rank-based danger", () => {
    const risk = buildRisk()
    const { container } = render(<BIRiskOpportunityRadar locale="fr" risks={[{ ...risk, severity: "info", severityScore: null, urgency: null, moneyImpact: null }]} />)
    expect(screen.getByText("Urgence non évaluée")).toBeVisible()
    expect(screen.getByText(risk.detail)).toBeVisible()
    expect(screen.getByText("#1").className).not.toContain("danger")
    expect(container).not.toHaveTextContent("today")
  })
  it("explains a disabled primary action without rendering an actionable link", () => {
    const brief = buildBrief()
    render(<BICommandBriefHeader brief={{ ...brief, primaryAction: { ...actionLink, disabled: true, disabledReason: "Contact your administrator." } }} />)
    expect(screen.getByRole("button", { name: actionLink.label })).toBeDisabled()
    expect(screen.queryByRole("link", { name: actionLink.label })).not.toBeInTheDocument()
    expect(screen.getByText("Contact your administrator.")).toBeVisible()
  })
  it("preserves the minor units of a currency KPI", () => {
    const { BIKpiCard: CurrencyCard } = require("../BIKpiCard")
    render(<CurrencyCard card={{ ...kpi, value: 100.25, format: "currency" }} currencyCode="EUR" locale="en" />)
    expect(screen.getByText("€100.25")).toBeInTheDocument()
  })
  it("formats a supplied organization timezone in the brief period", () => {
    render(<BICommandBriefHeader brief={{ ...buildBrief(), periodStart: "2026-02-28T11:00:00Z", periodEnd: "2026-03-01T10:59:59Z" }} timezone="Pacific/Auckland" locale="en" />)
    expect(screen.getByText("Mar 1 - Mar 1")).toBeInTheDocument()
  })
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

  it("keeps server-rendered mode controls disabled until client handlers are ready", () => {
    const markup = renderToStaticMarkup(<BICommandModeTabs value="brief" />)
    const container = document.createElement("div")
    container.innerHTML = markup
    expect(container.querySelectorAll("button[disabled]")).toHaveLength(3)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it("localizes the shared action empty state and full trust legend when explicitly requested", () => {
    render(<><BIActionPriorityBoard items={[]} locale="fr" /><BITrustLegend locale="fr" /></>)
    expect(screen.getByText("Aucune action visible à traiter")).toBeVisible()
    expect(screen.getByRole("heading", { name: "Légende des niveaux de preuve" })).toBeVisible()
    expect(screen.getByText("Rattaché à une preuve de comptabilisation.")).toBeVisible()
    expect(screen.getByText("Accès refusé")).toBeVisible()
    expect(screen.queryByText("Permission denied")).not.toBeInTheDocument()
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

  it.each(["en", "fr"])("does not claim no changes or no risk for an empty observation scope in %s", (locale) => {
    render(<BIWhatChangedStrip changes={[]} contentKind="observations" locale={locale} />)
    expect(screen.getByText(locale === "en" ? "No visible observations" : "Aucune observation visible")).toBeInTheDocument()
    expect(screen.getByText("0 observations")).toBeInTheDocument()
    expect(screen.queryByText("No important changes yet")).not.toBeInTheDocument()
  })

  it.each(["en", "fr"])("preserves assessed severity while showing missing urgency in %s", (locale) => {
    render(<BIRiskOpportunityRadar risks={[{ ...buildRisk(), severity: "critical", urgency: null }]} locale={locale} />)
    expect(screen.getByText(locale === "en" ? "Urgency not assessed" : "Urgence non évaluée")).toBeInTheDocument()
    expect(screen.getByText("1 signal")).toBeInTheDocument()
    expect(screen.queryByText(locale === "en" ? "Now" : "Maintenant")).not.toBeInTheDocument()
  })

  it.each(["en", "fr"])("localizes watch urgency without changing the risk assessment in %s", locale => {
    render(<BIRiskOpportunityRadar risks={[{ ...buildRisk(), severity: "low", urgency: "watch" }]} locale={locale} />)
    expect(screen.getByText(locale === "fr" ? "à surveiller" : "watch")).toBeVisible()
    expect(screen.getByText(locale === "fr" ? "faible" : "low")).toBeVisible()
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

it("localizes missing proof and loading defaults in French", () => {
  const view = render(<BIProofDrawerHost locale="fr" subject={null} proofTrail={null} />)
  const missing = screen.getByRole("button",{name:"Voir les preuves"})
  expect(missing).toBeDisabled()
  expect(missing).toHaveAttribute("title","Aucune source de preuve n’a été fournie.")
  view.rerender(<BIProofDrawerHost locale="fr" subject={availableSubject} proofTrail={null} isLoading />)
  expect(screen.getByRole("button",{name:"Chargement des preuves"})).toBeDisabled()
  expect(screen.getByRole("button",{name:"Chargement des preuves"})).toHaveAttribute("aria-busy","true")
})
it("preserves custom proof labels and server denial reasons", () => {
  const view = render(<BIProofDrawerHost locale="fr" subject={availableSubject} proofTrail={null} isLoading loadingLabel="Custom pending evidence" />)
  expect(screen.getByRole("button",{name:"Custom pending evidence"})).toBeDisabled()
  view.rerender(<BIProofDrawerHost locale="fr" subject={{...availableSubject,available:false,label:"Custom blocked label",unavailableReason:"Protected denial detail"}} proofTrail={null} />)
  expect(screen.getByRole("button",{name:"Custom blocked label"})).toHaveAttribute("title","Protected denial detail")
})
