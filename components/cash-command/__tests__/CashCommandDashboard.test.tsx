import type { SVGProps } from "react"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"

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
  ProofTrailDrawer: ({ open, proofTrail, isLoading, error, onOpenChange }: { open: boolean; proofTrail: { subjectId: string } | null; isLoading: boolean; error: string | null; onOpenChange: (value: boolean) => void }) => (open ? <div role="dialog"><button onClick={() => onOpenChange(false)}>Close proof</button>{isLoading ? "Loading selected proof" : error || proofTrail?.subjectId || "No selected proof"}</div> : null),
}))

import { getProofTrailAction } from "@/actions/evidence/proof-trail.actions"
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
        direction: "observed",
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
  it.each(["en", "fr"] as const)("exposes authorized trust conditions and recovery guidance in %s", locale => {
    const data = buildData()
    const title = locale === "fr" ? "Preuve de clôture absente" : "Close evidence missing"
    const nextAction = locale === "fr" ? "Examinez la clôture avant certification." : "Review the close before certification."
    data.trustSignals = [{ id: "close_readiness", label: "Close blockers", value: "Review required", detail: null, tone: "danger", requiredPermission: "accounting.close.read", evidenceGrade: "blocked", trustState: "blocked", freshness, redactions: [],
      blockers: [{ id: "close-certified-export-missing", gate: "close_readiness", severity: "high", title, detail: "Retained source condition", nextAction, sourceTables: ["close_pack_exports"] }] }]
    render(<CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />)
    const summary = screen.getByText(locale === "fr" ? "Examiner les conditions" : "Review conditions")
    expect(summary.tagName).toBe("SUMMARY")
    expect(summary.closest("details")).not.toHaveAttribute("open")
    fireEvent.click(summary)
    expect(summary.closest("details")).toHaveAttribute("open")
    expect(screen.getByText(title)).toBeVisible()
    expect(screen.getByText(nextAction)).toBeVisible()
    fireEvent.click(summary)
    expect(summary.closest("details")).not.toHaveAttribute("open")
  })
  it.each(["en", "fr"] as const)("distinguishes current observations from historical comparisons in %s", locale => {
    render(<CashCommandDashboard data={buildData()} locale={locale} title="Cash Command" subtitle="Read-only" />)
    expect(screen.getByText(locale === "fr" ? "Comparaison historique indisponible" : "Historical comparison unavailable")).toBeVisible()
    expect(screen.getByText(locale === "fr" ? "Observé" : "Observed")).toBeVisible()
    expect(screen.queryByText(/What changed since yesterday|Ce qui a change depuis hier/)).not.toBeInTheDocument()
    expect(screen.getByText(new RegExp(locale === "fr" ? "Valeur actuelle: 125000 XAF" : "Current value: 125000 XAF"))).toBeVisible()
  })

  it.each([
    { locale: "en" as const, currency: "EUR" },
    { locale: "fr" as const, currency: "EUR" },
    { locale: "fr" as const, currency: "USD" },
  ])("uses the tenant currency for $locale risk amounts in $currency", ({ locale, currency }) => {
    const data = { ...buildData(), currency }
    render(<CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />)
    const radar = screen.getByRole("heading", { name: locale === "fr" ? "Risques de trésorerie" : "Cash risk radar" }).closest("section")!
    const amount = new Intl.NumberFormat(locale, { style: "currency", currency }).format(data.risks[0].moneyImpact!)
    expect(within(radar).getByText(amount, { normalizer: value => value })).toBeVisible()
    expect(within(radar).queryByText(/FCFA|XAF/)).not.toBeInTheDocument()
    expect(within(radar).getByText(locale === "fr" ? "aujourd’hui" : "today")).toBeVisible()
  })

  it("passes French through action states, empty guidance, freshness and the evidence legend", () => {
    const data = buildData()
    const { rerender } = render(<CashCommandDashboard data={data} locale="fr" title="Cash Command" subtitle="Lecture seule" />)
    const actions = screen.getByRole("heading", { name: "Actions à traiter aujourd’hui" }).closest("section")!
    expect(within(actions).getByText("critique")).toBeVisible()
    expect(within(actions).getAllByText("Bloqué").length).toBeGreaterThan(0)
    expect(screen.getByRole("heading", { name: "Légende des niveaux de preuve" })).toBeVisible()
    expect(screen.getByText("Écart actuel")).toBeVisible()
    expect(screen.getByText("Dépendances manquantes")).toBeVisible()
    rerender(<CashCommandDashboard data={{ ...data, actionsToday: [] }} locale="fr" title="Cash Command" subtitle="Lecture seule" />)
    expect(screen.getByText("Aucune action visible à traiter")).toBeVisible()
  })

  it.each(["en", "fr"] as const)("does not infer no risk from an empty observation list in %s", locale => {
    render(<CashCommandDashboard data={{ ...buildData(), changes: [] }} locale={locale} title="Cash Command" subtitle="Read-only" />)
    expect(screen.getByText(locale === "fr" ? "Aucune observation visible" : "No visible observations")).toBeVisible()
    expect(screen.getByText(new RegExp(locale === "fr" ? "cela ne confirme pas l’absence de risque" : "this does not confirm the absence of risk"))).toBeVisible()
  })

  it.each(["en", "fr"] as const)("shows the source UTC day and generation time in %s", locale => {
    const data = buildData()
    data.generatedAt = "2026-06-24T23:30:00.000Z"
    data.commandBrief.generatedAt = data.generatedAt
    render(<CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />)
    const day = new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(data.periodStart))
    expect(screen.getAllByText(`${day} - ${day}`).length).toBe(2)
    expect(screen.getAllByText(locale === "fr" ? /^Période \(UTC\):?$/ : /^Period \(UTC\):?$/).length).toBe(2)
    expect(screen.getByText(locale === "fr" ? "Généré (UTC)" : "Generated (UTC)")).toBeVisible()
    const time = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", { timeZone: "UTC", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(data.generatedAt))
    expect(screen.getAllByText(time).length).toBeGreaterThan(0)
  })

  it.each(["en", "fr"] as const)("keeps the destination denial explanation visible without hover in %s", locale => {
    const data = buildData()
    const reason = locale === "fr" ? "Vos droits ne permettent pas d’ouvrir cet espace." : "Your access does not permit this workspace."
    data.cards[0].actionLink = { ...actionLink, disabled: true, disabledReason: reason }
    render(<CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />)
    expect(screen.getByText(reason)).toBeVisible()
  })
  it.each(["en", "fr"] as const)("explains unavailable data in %s without rendering denied drawer or module values", locale => {
    const data = { ...buildData(), drawerState: null, moduleControl: null,
      restrictedCapabilities: [{ id: "drawer_risk", title: "Drawer risk", reason: "permission_denied" as const }] }
    render(<CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />)
    expect(screen.getByRole("status")).toHaveTextContent(locale === "fr" ? "Une valeur indisponible ne signifie pas un solde nul" : "An unavailable value does not mean a zero balance")
    expect(screen.queryByText("Live variance")).not.toBeInTheDocument()
    expect(screen.queryByText("Entitled")).not.toBeInTheDocument()
    expect(screen.queryByText("RBAC filtered")).not.toBeInTheDocument()
    expect(screen.queryByText("Redaction-safe")).not.toBeInTheDocument()
  })

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
    expect(screen.getByRole("heading", { name: "Cash trust banner" })).toBeInTheDocument()
    expect(screen.getByText("Cash collected")).toBeInTheDocument()
    expect(screen.getAllByText("Unreconciled cash").length).toBeGreaterThan(0)
    expect(screen.getByText("Current cash observations")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "What needs action today" })).toBeInTheDocument()
    expect(screen.getByText("Resolve payment suspense")).toBeInTheDocument()
    expect(screen.getByText("Payment transaction proof")).toBeInTheDocument()
    expect(screen.getByText("Reconciliation proof")).toBeInTheDocument()
  })
})

describe("Cash Command proof request scope", () => {
  const action = jest.mocked(getProofTrailAction)
  const view = (data = buildData(), locale: "en" | "fr" = "en") => <CashCommandDashboard data={data} locale={locale} title="Cash Command" subtitle="Read-only" />
  const response = (subjectId: string, subjectType = "payment.transaction", organizationId = "org-1") => ({ success: true, data: { organizationId, subjectId, subjectType } }) as Awaited<ReturnType<typeof getProofTrailAction>>
  beforeEach(() => action.mockReset())

  it("opens one drawer and discards a late response after changing subject", async () => {
    let first!: (value: Awaited<ReturnType<typeof getProofTrailAction>>) => void
    action.mockImplementationOnce(() => new Promise(resolve => { first = resolve }))
    action.mockResolvedValueOnce(response("rr-1", "reconciliation.run"))
    render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByRole("dialog")).toHaveTextContent("Loading selected proof")
    fireEvent.click(screen.getByRole("button", { name: "Reconciliation proof" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("rr-1"))
    await act(async () => first(response("pt-1")))
    expect(screen.getAllByRole("dialog")).toHaveLength(1)
    expect(screen.getByRole("dialog")).not.toHaveTextContent("pt-1")
  })

  it.each(["en", "fr"] as const)("catches transport failure, restores focus and retries in %s", async locale => {
    action.mockRejectedValueOnce(new Error("private transport detail"))
    action.mockResolvedValueOnce(response("pt-1"))
    render(view(buildData(), locale))
    const trigger = screen.getByRole("button", { name: "Payment transaction proof" })
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent(locale === "fr" ? "réessayer" : "retry"))
    expect(screen.getByRole("dialog")).not.toHaveTextContent("private transport detail")
    fireEvent.click(screen.getByRole("button", { name: "Close proof" }))
    await waitFor(() => expect(trigger).toHaveFocus())
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("pt-1"))
  })

  it("preserves proof during a server refresh with unchanged authority and subject scope", async () => {
    action.mockResolvedValueOnce(response("pt-1"))
    const { rerender } = render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("pt-1"))
    rerender(view({ ...buildData(), generatedAt: "2026-06-24T08:00:05.000Z" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("pt-1")
  })

  it("withdraws pending proof when current server scope changes", async () => {
    let finish!: (value: Awaited<ReturnType<typeof getProofTrailAction>>) => void
    action.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { rerender } = render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    rerender(view({ ...buildData(), proofSubjects: [] }))
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await act(async () => finish(response("pt-1")))
    expect(screen.queryByText("pt-1")).not.toBeInTheDocument()
  })

  it("rejects a response for another tenant or selected record", async () => {
    action.mockResolvedValueOnce(response("private-proof", "payment.transaction", "org-2"))
    render(view())
    fireEvent.click(screen.getByRole("button", { name: "Payment transaction proof" }))
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("retry"))
    expect(screen.queryByText("private-proof")).not.toBeInTheDocument()
  })
})
